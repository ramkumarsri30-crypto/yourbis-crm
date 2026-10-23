-- ============================================================================
-- Migration: 20261023000000_profiles.sql
-- Phase 2 — user profiles table, Row Level Security, least-privilege grants
-- ============================================================================
--
-- Scope (see docs/SUPABASE_SETUP.md):
--   * One profile row per auth user in `public.profiles`.
--   * Rows are created ONLY by the authenticated user themselves, through
--     an RLS-constrained insert after a verified session exists (see
--     src/lib/auth/profile.ts). No trigger on auth.users, no service-role
--     writes from the application, no SECURITY DEFINER functions.
--   * Grants are column-level and minimal: Phase 2 only reads and inserts
--     profiles. UPDATE / DELETE privileges are intentionally NOT granted —
--     a later migration adds them together with the features that need
--     them (AGENTS.md: least privilege, deny by default).
--
-- Performance notes:
--   * Policies use the scalar-subquery form `(select auth.uid())` so the
--     planner caches the JWT claim once per statement (Supabase RLS
--     performance guidance).
--   * The primary key index on `id` covers the only access pattern
--     (`id = auth.uid()`); no secondary indexes are warranted yet.
-- ============================================================================

create table if not exists public.profiles (
  id uuid not null primary key references auth.users (id) on delete cascade,
  display_name text null
    check (display_name is null or char_length(display_name) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Per-user profile (Phase 2). One row per auth user, created lazily by the user''s own RLS-constrained insert after a verified session; never by triggers on auth.users.';
comment on column public.profiles.display_name is
  'Untrusted-at-rest display name captured from sign-up metadata; sanitized before write and checked by constraint (1..120 chars).';

-- Keep `updated_at` current on future updates. moddatetime is a plain
-- (non-SECURITY-DEFINER) trigger function shipped with Supabase; it runs
-- with the invoking user's own privileges.
create extension if not exists moddatetime with schema extensions;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function extensions.moddatetime(updated_at);

-- ============================================================================
-- Row Level Security
-- ============================================================================
-- Enable AND force: the table owner (postgres) is subject to the same
-- policies, so nothing reads or writes these rows outside the rules below.
-- The service_role (BYPASSRLS) is unaffected, as intended for migrations
-- and trusted administrative jobs only.

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

-- SELECT/INSERT/UPDATE policies, each limited to the caller's own row.
-- `(select auth.uid())` (scalar subquery) instead of a bare `auth.uid()`
-- so the claim is read once per statement.

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

create policy profiles_insert_own
  on public.profiles
  for insert
  to authenticated
  with check (id = (select auth.uid()));

create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- No DELETE policy: profile deletion happens only through the cascading
-- foreign key when the auth user is deleted (an administrative operation).
-- RLS denies all other deletes, and no delete grant exists anyway.

-- ============================================================================
-- Grants — least privilege
-- ============================================================================
-- New tables in `public` receive broad default privileges (ALL for anon,
-- authenticated, service_role). Revoke the application roles' defaults,
-- then re-grant exactly the columns the application touches. service_role
-- keeps its default privileges and bypasses RLS (trusted, server-side
-- migrations/admin jobs only — never shipped to the client).

revoke all on table public.profiles from anon, authenticated;

-- Reads: the application selects `display_name`; the remaining own-row
-- metadata columns are non-sensitive and readable by the row owner only
-- (RLS restricts every query to the caller's own row regardless).
grant select (id, display_name, created_at, updated_at)
  on public.profiles to authenticated;

-- Writes: the sign-up/profile-initialization insert sets exactly these
-- two columns; timestamps use their defaults.
grant insert (id, display_name)
  on public.profiles to authenticated;

-- Intentionally absent:
--   * UPDATE grant  — no profile-editing feature exists in Phase 2.
--   * DELETE grant  — profiles are removed only via auth.users cascade.
--   * Any grant to anon — anonymous visitors get nothing.
