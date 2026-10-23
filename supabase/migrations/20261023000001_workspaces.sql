-- ============================================================================
-- Migration: 20261023000001_workspaces.sql
-- Phase 3 — multi-tenant workspaces: organizations, memberships, roles,
--           invitations, RLS, grants, and atomic RPCs
-- ============================================================================
--
-- Scope (see docs/ARCHITECTURE.md, docs/SUPABASE_SETUP.md):
--   * One row per workspace/business in `public.organizations`.
--   * One membership row per (user, organization) in
--     `public.organization_memberships`, with a fixed initial role set
--     (owner > admin > member > viewer).
--   * Invitation records in `public.organization_invitations` with hashed
--     single-use tokens, expiry, and status lifecycle.
--   * Atomic organization creation via `public.create_organization(text)`
--     and atomic invitation acceptance via
--     `public.accept_organization_invitation(text)`.
--   * Membership/role helper `private.workspace_role_of(uuid)` used by
--     policies (avoids recursive RLS; not exposed through the Data API).
--
-- Authorization matrix (enforced by policies + grants + triggers + RPCs):
--
--   organizations
--     SELECT : authenticated members (any role) of the organization.
--     INSERT : nobody directly — only inside create_organization() (owner).
--     UPDATE : owner/admin members, `name` column only.
--     DELETE : nobody in Phase 3 (dissolution is future work).
--
--   organization_memberships
--     SELECT : any member of the organization (the member directory) —
--              every membership row of every org the caller belongs to.
--     INSERT : nobody directly — only inside create_organization() (owner
--              bootstrap) and accept_organization_invitation() (invitee).
--     UPDATE : owner/admin may change the role of OTHER members; admins
--              may only assign member/viewer; nobody may set 'owner'
--              (ownership transfer is documented future work); members
--              may not change their own role (no self-promotion).
--     DELETE : owner/admin may remove members; any user may remove their
--              own membership (leave); the last owner can neither be
--              demoted nor removed (trigger guard).
--
--   organization_invitations
--     SELECT : owner/admin members (token_hash excluded via column grants).
--     INSERT : owner/admin members; admin may only invite member/viewer
--              (only owners may invite admins); role 'owner' impossible
--              (CHECK constraint).
--     UPDATE : owner/admin members — revoke (pending -> revoked) and
--              resend (token_hash/expires_at rotation while pending);
--              'accepted' is reachable ONLY inside
--              accept_organization_invitation() (trigger-enforced).
--     DELETE : nobody (revocation replaces deletion; audit trail kept).
--
-- Grants are column-level and minimal for `anon` (nothing) and
-- `authenticated` (exactly the columns the application touches). Policies
-- and grants agree on every operation (RLS is not a substitute for SQL
-- privileges and vice versa).
--
-- RLS note (deliberate difference from profiles): these tables use
-- ENABLE (not FORCE) ROW LEVEL SECURITY. The postgres table owner must
-- remain able to bypass RLS so the narrowly-scoped SECURITY DEFINER
-- helpers (owned by postgres) can scan memberships without recursing
-- into the very policies that call them — the pattern recommended by the
-- Supabase RLS documentation. Only trusted principals run as the owner:
-- migrations, the two audited RPCs, and the service_role (BYPASSRLS).
-- `anon` and `authenticated` are fully policy-bound.
--
-- Performance notes:
--   * Policies call the STABLE helper `private.workspace_role_of()` with
--     the scalar-subquery `(select auth.uid())` form; the helper resolves
--     the caller's role via the unique index on
--     (organization_id, user_id) — one indexed row lookup per check.
--   * Indexes cover the actual access patterns: my-memberships
--     (user_id), member directory + peer checks (organization_id),
--     invitation listing (organization_id, created_at desc), token
--     lookup (unique token_hash), one-pending-per-email (partial unique).
-- ============================================================================

-- ============================================================================
-- 1. Non-exposed helper schema
-- ============================================================================
-- `private` is NOT listed in the Data API schemas (config.toml
-- [api] schemas = public, graphql_public), so functions here cannot be
-- invoked over HTTP — only from SQL (policies, triggers, migrations).

create schema if not exists private;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- ============================================================================
-- 2. Enumerations
-- ============================================================================

create type public.workspace_role as enum ('owner', 'admin', 'member', 'viewer');

comment on type public.workspace_role is
  'Fixed initial workspace roles (Phase 3). Rank order owner > admin > member > viewer. ''owner'' is granted only by create_organization(); invitations can never grant it.';

create type public.invitation_status as enum ('pending', 'accepted', 'revoked');

comment on type public.invitation_status is
  'Invitation lifecycle. ''expired'' is derived from expires_at < now() at read/validation time (no cron job needed); expired rows stay ''pending'' in storage until accepted (fails), revoked, or cleaned up by a future job.';

-- citext for case-insensitive, normalized invited emails.
create extension if not exists citext with schema extensions;

-- ============================================================================
-- 3. Tables
-- ============================================================================

create table public.organizations (
  id uuid not null default gen_random_uuid() primary key,
  name text not null
    check (char_length(btrim(name)) between 1 and 120),
  created_by uuid not null
    references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.organizations is
  'One row per workspace/business (Phase 3). Created exclusively through public.create_organization(); no direct INSERT grant exists. Subscription/billing data is intentionally NOT here (designed separately).';
comment on column public.organizations.created_by is
  'Authenticated user who created the workspace (audit fact). RESTRICT: deleting that auth user is refused while the organization exists — dissolution flows (future phase) must handle it explicitly.';

create table public.organization_memberships (
  id uuid not null default gen_random_uuid() primary key,
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  user_id uuid not null
    references auth.users (id) on delete cascade,
  role public.workspace_role not null default 'member',
  created_at timestamptz not null default now(),
  constraint organization_memberships_org_user_key
    unique (organization_id, user_id)
);

comment on table public.organization_memberships is
  'One row per (user, organization). Direct INSERT is impossible for application roles: rows are created only inside create_organization() (owner bootstrap) and accept_organization_invitation() (invitee). A user may belong to many organizations; there is deliberately no global organization_id on profiles.';

create table public.organization_invitations (
  id uuid not null default gen_random_uuid() primary key,
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  invited_email extensions.citext not null
    check (char_length(btrim(invited_email::text)) between 3 and 320),
  role public.workspace_role not null
    check (role in ('admin', 'member', 'viewer')),
  invited_by uuid not null
    references auth.users (id) on delete restrict,
  token_hash text not null
    check (char_length(token_hash) = 64)
    unique,
  status public.invitation_status not null default 'pending',
  expires_at timestamptz not null,
  accepted_at timestamptz null,
  accepted_by uuid null
    references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.organization_invitations is
  'Workspace invitations. token_hash is the SHA-256 hex digest of the raw token that travels in the email link — the raw token is never stored. Single-use: acceptance flips status to ''accepted'' under a row lock. token_hash is excluded from all SELECT grants to application roles.';
comment on column public.organization_invitations.role is
  'Role the invitee will receive on acceptance. CHECK constraint makes ''owner'' impossible — invitations can never grant ownership.';
comment on column public.organization_invitations.invited_email is
  'Normalized (citext) recipient address. Acceptance requires the authenticated user''s confirmed auth email to match.';

-- ============================================================================
-- 4. Indexes (aligned with access patterns)
-- ============================================================================

-- Hot path: "list my workspaces" (sidebar switcher, workspace context).
create index organization_memberships_user_id_idx
  on public.organization_memberships (user_id);

-- Member directory, policy peer checks, owner-count guard.
create index organization_memberships_organization_id_idx
  on public.organization_memberships (organization_id);

-- Team settings listing (bounded, newest first).
create index organization_invitations_organization_list_idx
  on public.organization_invitations (organization_id, created_at desc);

-- Duplicate-pending policy: at most one pending invitation per
-- (organization, invited_email). Also serves the duplicate check.
create unique index organization_invitations_one_pending_per_email
  on public.organization_invitations (organization_id, invited_email)
  where status = 'pending';

-- Token acceptance lookup is covered by the unique constraint index on
-- token_hash; no extra index needed.

-- ============================================================================
-- 5. updated_at maintenance (plain trigger function, invoker privileges)
-- ============================================================================

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function extensions.moddatetime(updated_at);

create trigger organization_invitations_set_updated_at
  before update on public.organization_invitations
  for each row execute function extensions.moddatetime(updated_at);

-- ============================================================================
-- 6. Guard triggers (integrity rules too complex for policy expressions)
-- ============================================================================
-- SECURITY INVOKER: these run with the acting user's privileges and are
-- subject to RLS like any other query. The member-directory SELECT policy
-- guarantees the acting admin/owner can see exactly their organization's
-- rows, which is the scope the owner-count check needs.

create or replace function private.guard_organization_membership_changes()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_other_owners integer;
begin
  if tg_op = 'UPDATE' then
    -- A membership row's identity is immutable: it always refers to the
    -- same user in the same organization.
    if new.user_id <> old.user_id
      or new.organization_id <> old.organization_id then
      raise exception 'membership user and organization cannot be changed'
        using errcode = '23514';
    end if;

    -- Ownership transfer is deliberately unsupported in Phase 3; only
    -- create_organization() may ever write the 'owner' role.
    if new.role = 'owner' then
      raise exception 'ownership transfer is not supported'
        using errcode = '42501';
    end if;

    -- Demoting an owner must never leave the organization ownerless.
    if old.role = 'owner' and new.role <> 'owner' then
      select count(*) into v_other_owners
        from public.organization_memberships m
        where m.organization_id = old.organization_id
          and m.role = 'owner'
          and m.id <> old.id;
      if v_other_owners = 0 then
        raise exception 'cannot demote the only owner of the organization'
          using errcode = '23514';
      end if;
    end if;
  end if;

  if tg_op = 'DELETE' and old.role = 'owner' then
    select count(*) into v_other_owners
      from public.organization_memberships m
      where m.organization_id = old.organization_id
        and m.role = 'owner'
        and m.id <> old.id;
    if v_other_owners = 0 then
      raise exception 'cannot remove the only owner of the organization'
        using errcode = '23514';
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

create trigger organization_memberships_guard
  before update or delete on public.organization_memberships
  for each row execute function private.guard_organization_membership_changes();

comment on function private.guard_organization_membership_changes() is
  'Integrity guard: membership identity immutable; role ''owner'' unreachable via UPDATE; the last owner can neither be demoted nor removed.';

create or replace function private.guard_organization_invitation_changes()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'pending' then
      raise exception 'invitations must be created as pending'
        using errcode = '23514';
    end if;
    if new.accepted_at is not null or new.accepted_by is not null then
      raise exception 'invitations cannot be created pre-accepted'
        using errcode = '23514';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    -- Core invitation facts are immutable after creation.
    if new.organization_id <> old.organization_id
      or new.invited_email <> old.invited_email
      or new.role <> old.role
      or new.invited_by <> old.invited_by then
      raise exception 'invitation identity cannot be changed'
        using errcode = '23514';
    end if;

    if old.status = 'pending' and new.status = 'revoked' then
      null; -- revoke (owner/admin action)
    elsif old.status = 'pending' and new.status = 'pending' then
      null; -- resend: token_hash / expires_at rotation
    elsif old.status = 'pending' and new.status = 'accepted'
      and current_user in ('postgres', 'service_role', 'supabase_admin') then
      null; -- acceptance happens ONLY inside accept_organization_invitation()
            -- (SECURITY DEFINER owned by postgres) or with a trusted role.
            -- Application roles can never take this branch: the UPDATE
            -- policy's WITH CHECK excludes 'accepted' for them.
    else
      raise exception 'invalid invitation status transition'
        using errcode = '23514';
    end if;

    if new.status = 'pending'
      and (new.expires_at <= now() or new.expires_at > now() + interval '30 days') then
      raise exception 'invitation expiry must be within 30 days of now'
        using errcode = '23514';
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

create trigger organization_invitations_guard
  before insert or update on public.organization_invitations
  for each row execute function private.guard_organization_invitation_changes();

comment on function private.guard_organization_invitation_changes() is
  'Integrity guard: invitations start pending; identity columns immutable; only pending->revoked, pending->pending (resend), or pending->accepted from a trusted (definer/service) context; expiry bounded to 30 days.';

-- Guard triggers are internal machinery: no role may call them directly.
revoke all on function private.guard_organization_membership_changes() from public, anon, authenticated;
revoke all on function private.guard_organization_invitation_changes() from public, anon, authenticated;

-- ============================================================================
-- 7. Membership helper for policies
-- ============================================================================
-- SECURITY DEFINER is required to avoid recursive RLS: policies on
-- memberships call this helper, so the helper itself must read
-- memberships WITHOUT the caller's policies re-entering (postgres table
-- owner bypasses RLS because these tables are not FORCE'd). Restrict the
-- blast radius: fixed empty search_path, fully qualified names, derives
-- the caller from auth.uid() (never a parameter), STABLE, read-only.

create or replace function private.workspace_role_of(p_organization_id uuid)
returns public.workspace_role
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
  from public.organization_memberships m
  where m.organization_id = p_organization_id
    and m.user_id = (select auth.uid())
  limit 1
$$;

revoke all on function private.workspace_role_of(uuid) from public, anon;
grant execute on function private.workspace_role_of(uuid) to authenticated;

comment on function private.workspace_role_of(uuid) is
  'Caller''s role in the given organization, or null when not a member. Used by RLS policies; not callable over the Data API (private schema is not exposed).';

-- ============================================================================
-- 8. Row Level Security
-- ============================================================================

alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.organization_invitations enable row level security;

-- ── organizations ──────────────────────────────────────────────────────────

create policy organizations_select_members
  on public.organizations
  for select
  to authenticated
  using ((select private.workspace_role_of(id)) is not null);

comment on policy organizations_select_members on public.organizations is
  'Members (any role) may read their organizations. A client-supplied organization id grants nothing: the policy resolves membership from the verified JWT.';

create policy organizations_update_admins
  on public.organizations
  for update
  to authenticated
  using ((select private.workspace_role_of(id)) in ('owner', 'admin'))
  with check ((select private.workspace_role_of(id)) in ('owner', 'admin'));

-- No INSERT/DELETE policies: creation happens only inside
-- create_organization(); deletion is future work. Column grants below
-- make those operations impossible for application roles regardless.

-- ── organization_memberships ───────────────────────────────────────────────

create policy organization_memberships_select_directory
  on public.organization_memberships
  for select
  to authenticated
  using ((select private.workspace_role_of(organization_id)) is not null);

comment on policy organization_memberships_select_directory on public.organization_memberships is
  'Any member sees every membership row of every organization they belong to (the member directory), including their own rows everywhere they are a member.';

create policy organization_memberships_update_roles
  on public.organization_memberships
  for update
  to authenticated
  using (
    -- Never your own row (blocks self-promotion and self-demotion)…
    user_id <> (select auth.uid())
    -- …and only managers (owner/admin) of the SAME organization.
    and (select private.workspace_role_of(organization_id)) in ('owner', 'admin')
  )
  with check (
    -- The actor must remain a manager of the (immutable) organization…
    (select private.workspace_role_of(organization_id)) in ('owner', 'admin')
    -- …admins may only assign member/viewer; only owners may assign admin.
    -- (Bare column names refer to the NEW row inside WITH CHECK.)
    and (
      role in ('member', 'viewer')
      or (select private.workspace_role_of(organization_id)) = 'owner'
    )
  );

comment on policy organization_memberships_update_roles on public.organization_memberships is
  'Role management: owners may set admin/member/viewer; admins only member/viewer; ''owner'' is unreachable (also trigger-enforced); own row is untouchable; cross-organization changes impossible because USING resolves the caller''s role in the row''s organization.';

create policy organization_memberships_delete_managed
  on public.organization_memberships
  for delete
  to authenticated
  using (
    -- Leave a workspace yourself…
    user_id = (select auth.uid())
    -- …or be a manager (owner/admin) of the row's organization.
    or (select private.workspace_role_of(organization_id)) in ('owner', 'admin')
  );

comment on policy organization_memberships_delete_managed on public.organization_memberships is
  'Member removal and self-leave. The last-owner protection lives in private.guard_organization_membership_changes() (needs row counting, impossible in a policy predicate).';

-- No INSERT policy and no INSERT grant: memberships are created only by
-- the two audited SECURITY DEFINER RPCs.

-- ── organization_invitations ───────────────────────────────────────────────

create policy organization_invitations_select_managers
  on public.organization_invitations
  for select
  to authenticated
  using ((select private.workspace_role_of(organization_id)) in ('owner', 'admin'));

comment on policy organization_invitations_select_managers on public.organization_invitations is
  'Only owner/admin members see invitation records of their organizations (and never token_hash — no SELECT grant on that column). Invitees learn about their invitation exclusively through the emailed link.';

create policy organization_invitations_insert_managers
  on public.organization_invitations
  for insert
  to authenticated
  with check (
    -- The inviter is always the caller (audit integrity).
    invited_by = (select auth.uid())
    -- Manager of the target organization…
    and (select private.workspace_role_of(organization_id)) in ('owner', 'admin')
    -- …and only owners may create admin invitations. (Bare column
    -- names refer to the row being inserted.)
    and (
      role <> 'admin'
      or (select private.workspace_role_of(organization_id)) = 'owner'
    )
  );

comment on policy organization_invitations_insert_managers on public.organization_invitations is
  'Invitation creation: owner/admin only; admin-role invitations are owner-only; role ''owner'' is blocked by the table CHECK constraint (defense in depth).';

create policy organization_invitations_update_managers
  on public.organization_invitations
  for update
  to authenticated
  using ((select private.workspace_role_of(organization_id)) in ('owner', 'admin'))
  with check (
    (select private.workspace_role_of(organization_id)) in ('owner', 'admin')
    -- Application roles may only revoke or rotate while pending; the
    -- 'accepted' status is reachable exclusively inside
    -- accept_organization_invitation(). (Bare column names refer to
    -- the NEW row.)
    and status in ('pending', 'revoked')
  );

-- No DELETE policy and no DELETE grant: revoked invitations are kept for
-- audit; a future cleanup job (trusted role) may purge expired rows.

-- ============================================================================
-- 9. Co-member profile visibility (additive policy on public.profiles)
-- ============================================================================
-- Phase 2 profiles are readable only by their owner. The Phase 3 member
-- directory needs display names of co-members. This ADDS a policy to the
-- existing table via a new migration — the original migration file is
-- untouched (versioned, additive practice).
--
-- The predicate runs as the caller under RLS: own_m rows are visible via
-- the caller's own membership; peer_m rows via the member-directory
-- policy above. No SECURITY DEFINER needed, no recursion (memberships
-- policies use the definer helper, not this table).

create policy profiles_select_workspace_peers
  on public.profiles
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.organization_memberships peer_m
      where peer_m.user_id = profiles.id
        and peer_m.organization_id in (
          select own_m.organization_id
          from public.organization_memberships own_m
          where own_m.user_id = (select auth.uid())
        )
    )
  );

comment on policy profiles_select_workspace_peers on public.profiles is
  'Members may read the profile rows (display names) of users who share an organization with them. Emails stay private: profiles carry no email column, and auth.users is not readable by application roles.';

-- ============================================================================
-- 10. Atomic RPC: organization creation (owner bootstrap)
-- ============================================================================
-- SECURITY DEFINER is justified: creating an organization must atomically
-- insert the org row AND its first owner membership. No direct INSERT
-- grants exist on either table, so the privileged inserts can only happen
-- here. Restrictions honored: fixed empty search_path; fully qualified
-- object names; auth.uid() verified inside; only the data required (the
-- name) is accepted — never a caller-supplied user id or role; no dynamic
-- SQL; default execute privileges revoked; execution granted to
-- authenticated only. Exposed in `public` deliberately: it is called over
-- the Data API (PostgREST RPC) by the application, and it self-authorizes.

create or replace function public.create_organization(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_name text;
  v_org_id uuid;
begin
  if v_user is null then
    raise exception 'authentication required'
      using errcode = '42501';
  end if;

  -- Defense in depth: the application validates the name too, but the
  -- RPC re-checks because client validation is not a boundary.
  v_name := btrim(p_name);
  if v_name = '' or char_length(v_name) > 120 then
    raise exception 'invalid organization name'
      using errcode = '22023';
  end if;

  insert into public.organizations (name, created_by)
    values (v_name, v_user)
    returning id into v_org_id;

  insert into public.organization_memberships (organization_id, user_id, role)
    values (v_org_id, v_user, 'owner');

  return v_org_id;
end;
$$;

revoke all on function public.create_organization(text) from public, anon;
grant execute on function public.create_organization(text) to authenticated;

comment on function public.create_organization(text) is
  'Atomic workspace creation: inserts the organization and the creator''s owner membership in one transaction. Caller identity comes from auth.uid() only.';

-- ============================================================================
-- 11. Atomic RPC: invitation acceptance
-- ============================================================================
-- SECURITY DEFINER is justified: acceptance must (a) lock the invitation
-- row, (b) verify status/expiry/confirmed-email match, (c) insert the
-- membership, and (d) flip the invitation to accepted — atomically and
-- race-free. Application roles hold none of the required INSERT
-- (memberships) or transition (pending -> accepted) privileges, so this
-- is the only path. Same restrictions as create_organization honored.

create or replace function public.accept_organization_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_hash text;
  v_inv record;
begin
  if v_user is null then
    raise exception 'authentication required'
      using errcode = '42501';
  end if;

  -- Shape check before hashing (raw tokens are 32 bytes base64url = 43
  -- chars; a small window either side tolerates future token formats).
  if p_token is null or char_length(p_token) not between 32 and 128 then
    raise exception 'invitation not found, expired, or already used'
      using errcode = '22023';
  end if;

  v_hash := encode(sha256(convert_to(p_token, 'utf8')), 'hex');

  -- Serialize concurrent acceptances of the same token.
  select id, organization_id, role, invited_email, status, expires_at
    into v_inv
    from public.organization_invitations
    where token_hash = v_hash
    for update;

  if not found then
    raise exception 'invitation not found, expired, or already used'
      using errcode = '22023';
  end if;

  if v_inv.status <> 'pending' then
    raise exception 'invitation not found, expired, or already used'
      using errcode = '22023';
  end if;

  if v_inv.expires_at <= now() then
    raise exception 'invitation not found, expired, or already used'
      using errcode = '22023';
  end if;

  -- The authenticated user's CONFIRMED email must match the invited
  -- email (case-insensitive). Possessing the link alone is not enough.
  if not exists (
    select 1
    from auth.users u
    where u.id = v_user
      and u.email_confirmed_at is not null
      and u.email::citext = v_inv.invited_email
  ) then
    raise exception 'this invitation was sent to a different email address'
      using errcode = '42501';
  end if;

  -- Idempotent membership creation (unique constraint backstop; a
  -- re-invited existing member just consumes the token).
  insert into public.organization_memberships (organization_id, user_id, role)
    values (v_inv.organization_id, v_user, v_inv.role)
    on conflict (organization_id, user_id) do nothing;

  -- Consume the token. Runs as postgres (definer) — the invitations
  -- guard trigger allows pending -> accepted only in trusted contexts.
  update public.organization_invitations
    set status = 'accepted',
        accepted_at = now(),
        accepted_by = v_user
    where id = v_inv.id
      and status = 'pending';

  if not found then
    raise exception 'invitation not found, expired, or already used'
      using errcode = '22023';
  end if;

  return v_inv.organization_id;
end;
$$;

revoke all on function public.accept_organization_invitation(text) from public, anon;
grant execute on function public.accept_organization_invitation(text) to authenticated;

comment on function public.accept_organization_invitation(text) is
  'Atomic, single-use invitation acceptance: token hash lookup under a row lock, status/expiry/confirmed-email verification, idempotent membership insert, token consumption. Never returns or logs the raw token.';

-- ============================================================================
-- 12. Grants — least privilege (policies and grants agree)
-- ============================================================================

-- ── organizations ──────────────────────────────────────────────────────────
revoke all on table public.organizations from anon, authenticated;

grant select (id, name, created_by, created_at, updated_at)
  on public.organizations to authenticated;
-- Only the name is updatable by the application; created_by/created_at/
-- updated_at are immutable for it (updated_at is trigger-maintained).
grant update (name)
  on public.organizations to authenticated;
-- No INSERT (create_organization() only), no DELETE (future work), no
-- TRUNCATE, and nothing for anon.

-- ── organization_memberships ───────────────────────────────────────────────
revoke all on table public.organization_memberships from anon, authenticated;

grant select (id, organization_id, user_id, role, created_at)
  on public.organization_memberships to authenticated;
grant update (role)
  on public.organization_memberships to authenticated;
grant delete
  on public.organization_memberships to authenticated;
-- No INSERT for application roles: memberships originate only from the
-- two audited RPCs (owner bootstrap + verified invitation acceptance).

-- ── organization_invitations ───────────────────────────────────────────────
revoke all on table public.organization_invitations from anon, authenticated;

-- token_hash deliberately absent from SELECT: users can never read the
-- stored hash (the raw token only travels in the email link).
grant select (id, organization_id, invited_email, role, invited_by, status,
              expires_at, accepted_at, accepted_by, created_at, updated_at)
  on public.organization_invitations to authenticated;
grant insert (organization_id, invited_email, role, invited_by, token_hash, expires_at)
  on public.organization_invitations to authenticated;
grant update (token_hash, status, expires_at)
  on public.organization_invitations to authenticated;
-- No DELETE: revoked invitations remain as an audit trail.
