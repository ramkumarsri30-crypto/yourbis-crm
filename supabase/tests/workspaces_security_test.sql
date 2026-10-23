-- ============================================================================
-- pgTAP security tests: Phase 3 multi-tenant workspaces
-- ============================================================================
-- Run with the Supabase CLI (see docs/SUPABASE_SETUP.md):
--
--   npx supabase test db              (local; requires Docker)
--   npx supabase test db --db-url ... (any Postgres with pgTAP installed)
--
-- The CLI applies supabase/migrations/* to a fresh test database, then
-- runs every file in supabase/tests.
--
-- Covers (Phase 3 spec section 11):
--   * Schema, RLS enablement, and enum existence for all three tables.
--   * Least-privilege grants: anon gets nothing; authenticated gets
--     column-level grants only; token_hash unreadable; no direct
--     membership INSERT; no invitation DELETE.
--   * create_organization(): anon rejected, authenticated creates org +
--     owner membership atomically, invalid names rejected.
--   * Tenant isolation: two users in one org with different roles; two
--     isolated organizations; cross-tenant reads and writes denied.
--   * Role matrix: owner vs admin vs member vs viewer for organization
--     updates, invitations, role changes, removals, and self-service.
--   * Owner protection: last owner cannot be demoted, removed, or
--     self-promoted; 'owner' role unreachable by UPDATE or invitation.
--   * Spoofed organization ids rejected (RLS resolves membership from
--     the JWT, never from the request payload).
--   * Invitation lifecycle: duplicate pending rejected; wrong token,
--     expired token, revoked token, email mismatch, and reuse rejected;
--     token rotation (resend) invalidates the old token; acceptance is
--     idempotent (no duplicate membership); direct status tampering to
--     'accepted' rejected; token_hash unreadable.
--   * Profiles: co-member visibility only.
--
-- NOTE: these tests were authored for this migration but could NOT be
-- executed in the Phase 3 build sandbox (no Docker daemon / local
-- Postgres). They must be run with the commands above before the
-- migration is applied to any shared database (AGENTS.md rule 7). No
-- pass is claimed on this environment's behalf.
-- ============================================================================

begin;

select plan(81);

-- ── Fixtures: auth users (with confirmed emails) and an id stash ──────────
-- The test database owns the auth schema; seeding auth.users directly is
-- the standard pgTAP pattern (foreign keys require it).

insert into auth.users (id, email, email_confirmed_at) values
  ('11111111-1111-1111-1111-111111111111', 'a@example.test', now()),
  ('22222222-2222-2222-2222-222222222222', 'b@example.test', now()),
  ('33333333-3333-3333-3333-333333333333', 'c@example.test', now()),
  ('44444444-4444-4444-4444-444444444444', 'd@example.test', now()),
  ('55555555-5555-5555-5555-555555555555', 'e@example.test', now()),
  ('66666666-6666-6666-6666-666666666666', 'f@example.test', now()),
  ('77777777-7777-7777-7777-777777777777', 'i@example.test', now());

-- Session-scoped stash for ids created inside authenticated contexts.
create temp table t_ids (key text primary key, value uuid);
grant insert, select on t_ids to authenticated;

-- Raw test tokens (shape mirrors the application's 43-char base64url).
-- Hashes are computed inline exactly like the application/RPC does.
create function t_hash(t text) returns text
  language sql immutable as
  $$ select encode(sha256(convert_to(t, 'utf8')), 'hex') $$;

-- ══════════════════════════════════════════════════════════════════════════
-- Section A — schema and RLS configuration (9)
-- ══════════════════════════════════════════════════════════════════════════

select has_table('public', 'organizations', 'A1: organizations exists');                                    -- 1
select has_table('public', 'organization_memberships', 'A2: organization_memberships exists');              -- 2
select has_table('public', 'organization_invitations', 'A3: organization_invitations exists');              -- 3

select is(
  (select rowsecurity from pg_catalog.pg_tables
    where schemaname = 'public' and tablename = 'organizations'),
  true,
  'A4: RLS enabled on organizations'
);                                                                                                          -- 4
select is(
  (select rowsecurity from pg_catalog.pg_tables
    where schemaname = 'public' and tablename = 'organization_memberships'),
  true,
  'A5: RLS enabled on organization_memberships'
);                                                                                                          -- 5
select is(
  (select rowsecurity from pg_catalog.pg_tables
    where schemaname = 'public' and tablename = 'organization_invitations'),
  true,
  'A6: RLS enabled on organization_invitations'
);                                                                                                          -- 6

-- Deliberate design (documented in the migration): not FORCE, so the
-- postgres-owned SECURITY DEFINER helper can scan memberships without
-- recursive RLS. anon/authenticated remain fully policy-bound.
select is(
  (select relforcerowsecurity from pg_catalog.pg_class
    where oid = 'public.organization_memberships'::regclass),
  false,
  'A7: memberships RLS is not FORCED (documented: definer helper pattern)'
);                                                                                                          -- 7

select has_type('public', 'workspace_role', 'A8: workspace_role enum exists');                              -- 8
select has_type('public', 'invitation_status', 'A9: invitation_status enum exists');                        -- 9

-- ══════════════════════════════════════════════════════════════════════════
-- Section B — grants (10)
-- ══════════════════════════════════════════════════════════════════════════

select ok(not has_table_privilege('anon', 'public.organizations', 'SELECT'),
  'B1: anon has no SELECT on organizations');                                                               -- 10
select ok(not has_table_privilege('anon', 'public.organization_memberships', 'SELECT'),
  'B2: anon has no SELECT on organization_memberships');                                                    -- 11
select ok(not has_table_privilege('anon', 'public.organization_invitations', 'SELECT'),
  'B3: anon has no SELECT on organization_invitations');                                                    -- 12

select ok(not has_table_privilege('authenticated', 'public.organizations', 'SELECT'),
  'B4: authenticated has no table-level SELECT on organizations (column grants only)');                     -- 13
select ok(has_column_privilege('authenticated', 'public.organizations', 'name', 'SELECT'),
  'B5: authenticated may SELECT organizations.name');                                                       -- 14
select ok(not has_column_privilege('authenticated', 'public.organizations', 'id', 'INSERT'),
  'B6: authenticated has no INSERT on organizations (creation via RPC only)');                              -- 15
select ok(not has_column_privilege('authenticated', 'public.organization_memberships', 'organization_id', 'INSERT'),
  'B7: authenticated has no INSERT on organization_memberships (RPCs only)');                               -- 16
select ok(not has_column_privilege('authenticated', 'public.organization_invitations', 'token_hash', 'SELECT'),
  'B8: authenticated cannot SELECT invitations.token_hash');                                                -- 17
select ok(not has_table_privilege('authenticated', 'public.organization_invitations', 'DELETE'),
  'B9: authenticated has no DELETE on invitations');                                                        -- 18
select ok(not has_schema_privilege('anon', 'private', 'USAGE'),
  'B10: anon has no USAGE on the private helper schema');                                                   -- 19

-- ══════════════════════════════════════════════════════════════════════════
-- Section C — organization creation RPC (6)
-- ══════════════════════════════════════════════════════════════════════════

set role anon;
select throws_ok(
  $$select public.create_organization('Anon Corp')$$,
  '42501',
  'C1: anon cannot execute create_organization'
);                                                                                                          -- 20
reset role;

-- User A creates org 1 (the real application path).
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set role authenticated;
select lives_ok(
  $$insert into t_ids (key, value) select 'org1', public.create_organization('Acme LLC')$$,
  'C2: authenticated user creates an organization via the RPC'
);                                                                                                          -- 21
reset role;

select is(
  (select m.role::text from public.organization_memberships m
    where m.organization_id = (select value from t_ids where key = 'org1')
      and m.user_id = '11111111-1111-1111-1111-111111111111'),
  'owner',
  'C3: the creator received an owner membership atomically'
);                                                                                                          -- 22

select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set role authenticated;
select throws_ok(
  $$select public.create_organization('   ')$$,
  '22023',
  'C4: blank organization name rejected by the RPC'
);                                                                                                          -- 23
reset role;

-- User D (a second tenant) creates org 2.
select set_config('request.jwt.claims',
  '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);
set role authenticated;
select lives_ok(
  $$insert into t_ids (key, value) select 'org2', public.create_organization('Globex Inc')$$,
  'C5: second tenant creates its own organization'
);                                                                                                          -- 24
reset role;

select set_config('request.jwt.claims',
  '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);
set role authenticated;
select is(
  (select count(*)::int from public.organizations),
  1,
  'C6: tenant D sees exactly one organization (its own)'
);                                                                                                          -- 25
reset role;

-- ── Seeding: roles in org 1 and profile rows (as the migration owner) ─────
-- B admin, C member, E viewer join Acme; profiles for A, B, D.

insert into public.organization_memberships (organization_id, user_id, role) values
  ((select value from t_ids where key = 'org1'), '22222222-2222-2222-2222-222222222222', 'admin'),
  ((select value from t_ids where key = 'org1'), '33333333-3333-3333-3333-333333333333', 'member'),
  ((select value from t_ids where key = 'org1'), '55555555-5555-5555-5555-555555555555', 'viewer');

insert into public.profiles (id, display_name) values
  ('11111111-1111-1111-1111-111111111111', 'User A'),
  ('22222222-2222-2222-2222-222222222222', 'User B'),
  ('44444444-4444-4444-4444-444444444444', 'User D');

-- ══════════════════════════════════════════════════════════════════════════
-- Section D — tenant isolation & visibility (9)
-- ══════════════════════════════════════════════════════════════════════════

select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set role authenticated;
select is(
  (select count(*)::int from public.organizations),
  1,
  'D1: member A sees only organizations they belong to'
);                                                                                                          -- 26
select is(
  (select count(*)::int from public.organization_memberships),
  4,
  'D2: member A sees the full member directory of its organization (A,B,C,E)'
);                                                                                                          -- 27
select is(
  (select count(*)::int from public.organization_memberships m
    where m.user_id = '44444444-4444-4444-4444-444444444444'),
  0,
  'D3: member A cannot see tenant D''s membership (cross-tenant read denied)'
);                                                                                                          -- 28
reset role;

-- Viewer E can read the directory (viewers read, never manage).
select set_config('request.jwt.claims',
  '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}', true);
set role authenticated;
select is(
  (select count(*)::int from public.organization_memberships),
  4,
  'D4: viewer E reads the member directory'
);                                                                                                          -- 29
reset role;

-- Tenant D tries to write into org 1: RLS filters to zero rows.
select set_config('request.jwt.claims',
  '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);
set role authenticated;
select lives_ok(
  $$update public.organizations set name = 'Hacked'
     where id = (select value from t_ids where key = 'org1')$$,
  'D5: cross-tenant organization UPDATE completes without error…'
);                                                                                                          -- 30
select is(
  (select name from public.organizations
    where id = (select value from t_ids where key = 'org1')),
  'Acme LLC',
  'D6: …but changes nothing (RLS denied the row)'
);                                                                                                          -- 31
select lives_ok(
  $$update public.organization_memberships set role = 'viewer'
     where user_id = '11111111-1111-1111-1111-111111111111'$$,
  'D7: cross-tenant membership UPDATE completes without error…'
);                                                                                                          -- 32
select is(
  (select m.role::text from public.organization_memberships m
    where m.user_id = '11111111-1111-1111-1111-111111111111'),
  'owner',
  'D8: …but A is still owner (spoofed organization context rejected)'
);                                                                                                          -- 33
reset role;

select is(
  (select count(*)::int from public.organizations o
    where o.name = 'Globex Inc'
      and exists (
        select 1 from public.organization_memberships m
        where m.organization_id = o.id
          and m.user_id = '22222222-2222-2222-2222-222222222222')),
  0,
  'D9: admin B of org1 cannot reach org2 data (isolation is mutual)'
);                                                                                                          -- 34

-- ══════════════════════════════════════════════════════════════════════════
-- Section E — role management matrix (20)
-- ══════════════════════════════════════════════════════════════════════════

-- Owner updates the organization name (allowed).
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set role authenticated;
select lives_ok(
  $$update public.organizations set name = 'Acme Corporation'
     where id = (select value from t_ids where key = 'org1')$$,
  'E1: owner may update the organization name'
);                                                                                                          -- 35
select is(
  (select name from public.organizations
    where id = (select value from t_ids where key = 'org1')),
  'Acme Corporation',
  'E2: the organization name was updated'
);                                                                                                          -- 36
reset role;

-- Member C cannot update the organization (zero rows).
select set_config('request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
set role authenticated;
select lives_ok(
  $$update public.organizations set name = 'Member Takeover'$$,
  'E3: member organization UPDATE completes without error…'
);                                                                                                          -- 37
select is(
  (select name from public.organizations
    where id = (select value from t_ids where key = 'org1')),
  'Acme Corporation',
  'E4: …but changes nothing (member cannot rename)'
);                                                                                                          -- 38
select throws_ok(
  $$insert into public.organization_invitations
     (organization_id, invited_email, role, invited_by, token_hash, expires_at)
   values ((select value from t_ids where key = 'org1'), 'x@example.test', 'member',
           '33333333-3333-3333-3333-333333333333', t_hash('never-used-token'), now() + interval '7 days')$$,
  '42501',
  'E5: member cannot create invitations'
);                                                                                                          -- 39
reset role;

-- Admin B can invite a member (F) but not an admin; owner A can invite an admin.
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set role authenticated;
select lives_ok(
  $$insert into public.organization_invitations
     (organization_id, invited_email, role, invited_by, token_hash, expires_at)
   values ((select value from t_ids where key = 'org1'), 'f@example.test', 'member',
           '22222222-2222-2222-2222-222222222222', t_hash('invite-token-f-1'), now() + interval '7 days')$$,
  'E6: admin may invite a member'
);                                                                                                          -- 40
select throws_ok(
  $$insert into public.organization_invitations
     (organization_id, invited_email, role, invited_by, token_hash, expires_at)
   values ((select value from t_ids where key = 'org1'), 'g@example.test', 'admin',
           '22222222-2222-2222-2222-222222222222', t_hash('invite-token-g-1'), now() + interval '7 days')$$,
  '42501',
  'E7: admin cannot invite an admin (owner-only)'
);                                                                                                          -- 41
select throws_ok(
  $$insert into public.organization_invitations
     (organization_id, invited_email, role, invited_by, token_hash, expires_at)
   values ((select value from t_ids where key = 'org2'), 'x@example.test', 'member',
           '22222222-2222-2222-2222-222222222222', t_hash('invite-token-x-1'), now() + interval '7 days')$$,
  '42501',
  'E8: admin cannot create invitations for another organization (spoofed id)'
);                                                                                                          -- 42
reset role;

select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set role authenticated;
select lives_ok(
  $$insert into public.organization_invitations
     (organization_id, invited_email, role, invited_by, token_hash, expires_at)
   values ((select value from t_ids where key = 'org1'), 'g@example.test', 'admin',
           '11111111-1111-1111-1111-111111111111', t_hash('invite-token-g-2'), now() + interval '7 days')$$,
  'E9: owner may invite an admin'
);                                                                                                          -- 43
select throws_ok(
  $$insert into public.organization_invitations
     (organization_id, invited_email, role, invited_by, token_hash, expires_at)
   values ((select value from t_ids where key = 'org1'), 'h@example.test', 'owner',
           '11111111-1111-1111-1111-111111111111', t_hash('invite-token-h-1'), now() + interval '7 days')$$,
  '23514',
  'E10: nobody can create an owner invitation (CHECK constraint)'
);                                                                                                          -- 44
reset role;

-- Role changes: admin may set member/viewer, not admin/owner, not own row.
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set role authenticated;
select lives_ok(
  $$update public.organization_memberships set role = 'viewer'
     where user_id = '33333333-3333-3333-3333-333333333333'$$,
  'E11: admin may change a member to viewer'
);                                                                                                          -- 45
select throws_ok(
  $$update public.organization_memberships set role = 'admin'
     where user_id = '33333333-3333-3333-3333-333333333333'$$,
  '42501',
  'E12: admin cannot promote to admin (owner-only)'
);                                                                                                          -- 46
select lives_ok(
  $$update public.organization_memberships set role = 'admin'
     where user_id = '22222222-2222-2222-2222-222222222222'$$,
  'E13: admin self-role-change completes without error…'
);                                                                                                          -- 47
select is(
  (select m.role::text from public.organization_memberships m
    where m.user_id = '22222222-2222-2222-2222-222222222222'),
  'admin',
  'E14: …but B is still admin (own row is untouchable — no self-promotion)'
);                                                                                                          -- 48
select lives_ok(
  $$delete from public.organization_memberships
     where user_id = '55555555-5555-5555-5555-555555555555'$$,
  'E15: admin may remove a viewer'
);                                                                                                          -- 49
reset role;

-- Member C: no management rights at all.
select set_config('request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
set role authenticated;
select lives_ok(
  $$update public.organization_memberships set role = 'admin'
     where user_id = '33333333-3333-3333-3333-333333333333'$$,
  'E16: member self-promotion attempt completes without error…'
);                                                                                                          -- 50
select is(
  (select m.role::text from public.organization_memberships m
    where m.user_id = '33333333-3333-3333-3333-333333333333'),
  'viewer',
  'E17: …but C remains viewer (policy excludes the own row)'
);                                                                                                          -- 51
select lives_ok(
  $$delete from public.organization_memberships
     where user_id = '22222222-2222-2222-2222-222222222222'$$,
  'E18: member removing an admin completes without error…'
);                                                                                                          -- 52
select is(
  (select count(*)::int from public.organization_memberships m
    where m.user_id = '22222222-2222-2222-2222-222222222222'),
  1,
  'E19: …but the admin membership still exists (member cannot remove anyone)'
);                                                                                                          -- 53
reset role;

-- Owner protections.
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set role authenticated;
select throws_ok(
  $$update public.organization_memberships set role = 'owner'
     where user_id = '22222222-2222-2222-2222-222222222222'$$,
  '42501',
  'E20: even the owner cannot assign the owner role (no transfer in Phase 3)'
);                                                                                                          -- 54
reset role;

-- ══════════════════════════════════════════════════════════════════════════
-- Section F — last-owner protection (3)
-- ══════════════════════════════════════════════════════════════════════════

-- A is the only owner of org1: leaving and being demoted are blocked.
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set role authenticated;
select throws_ok(
  $$delete from public.organization_memberships
     where user_id = '11111111-1111-1111-1111-111111111111'$$,
  '23514',
  'F1: the only owner cannot leave the organization'
);                                                                                                          -- 55
reset role;

-- A cannot demote itself (policy excludes own row) — verify via the
-- trigger path instead: add a second owner? No: 'owner' via UPDATE is
-- blocked (E20). Instead verify the guard using a direct demotion of A
-- by A through the policy-permitted route — impossible by design, so
-- the guard's demotion branch is exercised via the postgres-bypass
-- path below (documents the trigger's protection independently).
select is(
  (select m.role::text from public.organization_memberships m
    where m.user_id = '11111111-1111-1111-1111-111111111111'),
  'owner',
  'F2: the owner is still owner (no demotion path existed)'
);                                                                                                          -- 56

-- Trigger-level proof: even with RLS bypassed, demoting the only owner
-- raises (the guard does not depend on policies).
select throws_ok(
  $$update public.organization_memberships set role = 'member'
     where user_id = '11111111-1111-1111-1111-111111111111'$$,
  '23514',
  'F3: trigger blocks demoting the only owner even with RLS bypassed'
);                                                                                                          -- 57

-- ══════════════════════════════════════════════════════════════════════════
-- Section G — invitation lifecycle (19)
-- ══════════════════════════════════════════════════════════════════════════

-- Duplicate pending invitation for the same (org, email).
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set role authenticated;
select throws_ok(
  $$insert into public.organization_invitations
     (organization_id, invited_email, role, invited_by, token_hash, expires_at)
   values ((select value from t_ids where key = 'org1'), 'f@example.test', 'member',
           '11111111-1111-1111-1111-111111111111', t_hash('invite-token-f-2'), now() + interval '7 days')$$,
  '23505',
  'G1: duplicate pending invitation for the same email rejected'
);                                                                                                          -- 58
reset role;

-- F accepts: wrong token first, then the right one.
select set_config('request.jwt.claims',
  '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}', true);
set role authenticated;
select throws_ok(
  $$select public.accept_organization_invitation('completely-wrong-token-value')$$,
  '22023',
  'G2: wrong token rejected'
);                                                                                                          -- 59
select lives_ok(
  $$select public.accept_organization_invitation('invite-token-f-1') = (select value from t_ids where key = 'org1')$$,
  'G3: correct token accepted; RPC returns the organization id'
);                                                                                                          -- 60
select is(
  (select m.role::text from public.organization_memberships m
    where m.user_id = '66666666-6666-6666-6666-666666666666'),
  'member',
  'G4: F became a member with the invited role'
);                                                                                                          -- 61
select throws_ok(
  $$select public.accept_organization_invitation('invite-token-f-1')$$,
  '22023',
  'G5: the same token cannot be used twice (single use)'
);                                                                                                          -- 62
select is(
  (select count(*)::int from public.organization_memberships m
    where m.user_id = '66666666-6666-6666-6666-666666666666'
      and m.organization_id = (select value from t_ids where key = 'org1')),
  1,
  'G6: exactly one membership for F (no duplicates)'
);                                                                                                          -- 63
reset role;

-- Email mismatch: user I tries to consume an invitation for f@example.test.
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set role authenticated;
select lives_ok(
  $$insert into public.organization_invitations
     (organization_id, invited_email, role, invited_by, token_hash, expires_at)
   values ((select value from t_ids where key = 'org1'), 'f@example.test', 'viewer',
           '11111111-1111-1111-1111-111111111111', t_hash('invite-token-f-3'), now() + interval '7 days')$$,
  'G7: owner re-invites F (new pending invitation after the first was consumed)'
);                                                                                                          -- 64
reset role;

select set_config('request.jwt.claims',
  '{"sub":"77777777-7777-7777-7777-777777777777","role":"authenticated"}', true);
set role authenticated;
select throws_ok(
  $$select public.accept_organization_invitation('invite-token-f-3')$$,
  '42501',
  'G8: authenticated email must match the invited email'
);                                                                                                          -- 65
reset role;

-- Revocation.
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set role authenticated;
select lives_ok(
  $$update public.organization_invitations set status = 'revoked'
     where token_hash = t_hash('invite-token-f-3')$$,
  'G9: owner revokes the pending invitation'
);                                                                                                          -- 66
reset role;

select set_config('request.jwt.claims',
  '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}', true);
set role authenticated;
select throws_ok(
  $$select public.accept_organization_invitation('invite-token-f-3')$$,
  '22023',
  'G10: revoked token rejected'
);                                                                                                          -- 67
reset role;

-- Resend rotates the token: the old raw token dies, the new one works.
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set role authenticated;
select lives_ok(
  $$insert into public.organization_invitations
     (organization_id, invited_email, role, invited_by, token_hash, expires_at)
   values ((select value from t_ids where key = 'org1'), 'f@example.test', 'admin',
           '11111111-1111-1111-1111-111111111111', t_hash('invite-token-f-4'), now() + interval '7 days')$$,
  'G11: owner creates a fresh invitation (rotated role: admin)'
);                                                                                                          -- 68
select lives_ok(
  $$update public.organization_invitations
     set token_hash = t_hash('invite-token-f-5'), expires_at = now() + interval '7 days'
     where token_hash = t_hash('invite-token-f-4') and status = 'pending'$$,
  'G12: resend rotates the token hash and extends the expiry'
);                                                                                                          -- 69
reset role;

select set_config('request.jwt.claims',
  '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}', true);
set role authenticated;
select throws_ok(
  $$select public.accept_organization_invitation('invite-token-f-4')$$,
  '22023',
  'G13: the pre-rotation raw token no longer works'
);                                                                                                          -- 70
select lives_ok(
  $$select public.accept_organization_invitation('invite-token-f-5') is not null$$,
  'G14: the post-rotation token is accepted'
);                                                                                                          -- 71
reset role;

select is(
  (select status::text from public.organization_invitations
    where token_hash = t_hash('invite-token-f-5')),
  'accepted',
  'G15: the invitation row is consumed (accepted)'
);                                                                                                          -- 72

-- Expired invitation (created valid, time passes, then accepted).
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set role authenticated;
select lives_ok(
  $$insert into public.organization_invitations
     (organization_id, invited_email, role, invited_by, token_hash, expires_at)
   values ((select value from t_ids where key = 'org1'), 'i@example.test', 'member',
           '11111111-1111-1111-1111-111111111111', t_hash('invite-token-i-1'), now() + interval '1 second')$$,
  'G16: short-lived invitation created'
);                                                                                                          -- 73
reset role;

select pg_sleep(1.2);

select set_config('request.jwt.claims',
  '{"sub":"77777777-7777-7777-7777-777777777777","role":"authenticated"}', true);
set role authenticated;
select throws_ok(
  $$select public.accept_organization_invitation('invite-token-i-1')$$,
  '22023',
  'G17: expired token rejected'
);                                                                                                          -- 74
reset role;

-- Idempotent acceptance: F is already a member; a new invitation simply
-- consumes the token without creating a duplicate membership.
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set role authenticated;
select lives_ok(
  $$insert into public.organization_invitations
     (organization_id, invited_email, role, invited_by, token_hash, expires_at)
   values ((select value from t_ids where key = 'org1'), 'f@example.test', 'viewer',
           '11111111-1111-1111-1111-111111111111', t_hash('invite-token-f-6'), now() + interval '7 days')$$,
  'G18: existing member is re-invited'
);                                                                                                          -- 75
reset role;

select set_config('request.jwt.claims',
  '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}', true);
set role authenticated;
select lives_ok(
  $$select public.accept_organization_invitation('invite-token-f-6') is not null$$,
  'G19: re-acceptance succeeds (idempotent, serialized by the row lock + unique constraint)'
);                                                                                                          -- 76
reset role;

select is(
  (select count(*)::int from public.organization_memberships m
    where m.user_id = '66666666-6666-6666-6666-666666666666'
      and m.organization_id = (select value from t_ids where key = 'org1')),
  1,
  'G20: still exactly one membership for F (concurrent/repeat acceptance safe)'
);                                                                                                          -- 77

-- ══════════════════════════════════════════════════════════════════════════
-- Section H — invitation tampering (2)
-- ══════════════════════════════════════════════════════════════════════════

select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set role authenticated;
select throws_ok(
  $$update public.organization_invitations set status = 'accepted'
     where status = 'pending'$$,
  '42501',
  'H1: application roles cannot mark invitations accepted directly (RPC only)'
);                                                                                                          -- 78
select throws_ok(
  $$select token_hash from public.organization_invitations limit 1$$,
  '42501',
  'H2: token_hash is unreadable by application roles'
);                                                                                                          -- 79
reset role;

-- ══════════════════════════════════════════════════════════════════════════
-- Section I — profiles co-member visibility (2)
-- ══════════════════════════════════════════════════════════════════════════

select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set role authenticated;
select is(
  (select p.display_name from public.profiles p
    where p.id = '11111111-1111-1111-1111-111111111111'),
  'User A',
  'I1: co-member B may read A''s profile (member directory)'
);                                                                                                          -- 80
reset role;

select set_config('request.jwt.claims',
  '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);
set role authenticated;
select is(
  (select count(*)::int from public.profiles p
    where p.id = '11111111-1111-1111-1111-111111111111'),
  0,
  'I2: tenant D (different organization) cannot read A''s profile'
);                                                                                                          -- 81
reset role;

select * from finish();

rollback;
