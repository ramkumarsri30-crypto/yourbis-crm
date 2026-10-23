-- ============================================================================
-- pgTAP security tests: public.profiles (Phase 2)
-- ============================================================================
-- Run with the Supabase CLI (see docs/SUPABASE_SETUP.md):
--
--   npx supabase test db              (local; requires Docker)
--   npx supabase test db --db-url ... (any Postgres with pgTAP installed)
--
-- The CLI applies supabase/migrations/* to a fresh test database, then
-- runs every file in supabase/tests.
--
-- Covers:
--   * RLS enabled and FORCED on public.profiles
--   * least-privilege, column-level grants (and the absence of UPDATE /
--     DELETE / any anon grants)
--   * per-user row isolation (a user sees and creates only their own row)
--   * cross-user inserts, updates, and deletes rejected
--   * anonymous access rejected
--   * display_name length CHECK enforced
--
-- NOTE: these tests were authored for this migration but could NOT be
-- executed in the Phase 2 build sandbox (no Docker / local Postgres).
-- They must be run with the commands above before the migration is
-- applied to a shared database (AGENTS.md rule 7). No pass is claimed.
-- ============================================================================

begin;

select plan(29);

-- ── Fixtures: three auth users ─────────────────────────────────────────────
-- The local/shadow test database owns the auth schema; seeding auth.users
-- directly is the standard pgTAP pattern (the FK from profiles requires it).

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.test'),
  ('33333333-3333-3333-3333-333333333333', 'c@example.test');

-- ── Schema & RLS configuration ─────────────────────────────────────────────

select has_table(
  'public', 'profiles',
  'public.profiles exists'
);

select is(
  (select rowsecurity from pg_catalog.pg_tables
    where schemaname = 'public' and tablename = 'profiles'),
  true,
  'RLS is enabled on public.profiles'
);

select is(
  (select relforcerowsecurity from pg_catalog.pg_class
    where oid = 'public.profiles'::regclass),
  true,
  'RLS is FORCED on public.profiles (table owner is subject to policies)'
);

select has_policy(
  'public', 'profiles', 'profiles_select_own',
  'SELECT policy exists (own row only)'
);

select has_policy(
  'public', 'profiles', 'profiles_insert_own',
  'INSERT policy exists (own row only)'
);

select has_policy(
  'public', 'profiles', 'profiles_update_own',
  'UPDATE policy exists (own row only)'
);

select is(
  (select count(*)::int from pg_catalog.pg_policies
    where schemaname = 'public' and tablename = 'profiles' and cmd = 'DELETE'),
  0,
  'No DELETE policy exists (deletes only via auth.users cascade)'
);

-- ── Grants: anonymous gets nothing ─────────────────────────────────────────

select ok(
  not has_table_privilege('anon', 'public.profiles', 'SELECT'),
  'anon has no SELECT privilege'
);

select ok(
  not has_table_privilege('anon', 'public.profiles', 'INSERT'),
  'anon has no INSERT privilege'
);

select ok(
  not has_table_privilege('anon', 'public.profiles', 'UPDATE'),
  'anon has no UPDATE privilege'
);

select ok(
  not has_table_privilege('anon', 'public.profiles', 'DELETE'),
  'anon has no DELETE privilege'
);

-- ── Grants: authenticated is column-level only ─────────────────────────────

select ok(
  not has_table_privilege('authenticated', 'public.profiles', 'SELECT'),
  'authenticated has no table-level SELECT (column grants only)'
);

select ok(
  has_column_privilege('authenticated', 'public.profiles', 'display_name', 'SELECT'),
  'authenticated may SELECT display_name'
);

select ok(
  has_column_privilege('authenticated', 'public.profiles', 'id', 'INSERT')
    and has_column_privilege('authenticated', 'public.profiles', 'display_name', 'INSERT'),
  'authenticated may INSERT exactly (id, display_name)'
);

select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'display_name', 'UPDATE'),
  'authenticated has no UPDATE privilege (no profile editing in Phase 2)'
);

select ok(
  not has_table_privilege('authenticated', 'public.profiles', 'DELETE'),
  'authenticated has no DELETE privilege'
);

-- ── Behavior: per-user row isolation ───────────────────────────────────────

-- User A creates their own profile (the application's post-verification
-- insert path).
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}',
  true
);
set role authenticated;

select lives_ok(
  'insert into public.profiles (id, display_name)
     values (''11111111-1111-1111-1111-111111111111'', ''User A'')',
  'authenticated user may insert their own profile row'
);

select is(
  (select count(*)::int from public.profiles),
  1,
  'user A sees exactly their own row'
);

reset role;

-- User B creates their own profile too.
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}',
  true
);
set role authenticated;

select lives_ok(
  'insert into public.profiles (id, display_name)
     values (''22222222-2222-2222-2222-222222222222'', ''User B'')',
  'second user may insert their own profile row'
);

select is(
  (select count(*)::int from public.profiles),
  1,
  'user B sees only their own row (A''s row invisible)'
);

-- Cross-user insert: B tries to create a profile under A's id.
select throws_ok(
  'insert into public.profiles (id, display_name)
     values (''11111111-1111-1111-1111-111111111111'', ''Impersonated'')',
  '42501',
  'inserting a profile under another user''s id is rejected by RLS'
);

-- No UPDATE path exists in Phase 2: the grant is absent, so even the
-- user's own row cannot be updated.
select throws_ok(
  'update public.profiles set display_name = ''Hacked''',
  '42501',
  'updating even the own profile row is rejected (no UPDATE grant)'
);

-- No DELETE path exists either.
select throws_ok(
  'delete from public.profiles',
  '42501',
  'deleting even the own profile row is rejected (no DELETE grant)'
);

reset role;

-- Back to user A: B's row must still be invisible.
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}',
  true
);
set role authenticated;

select is(
  (select count(*)::int from public.profiles),
  1,
  'user A still sees only their own row (B''s row invisible)'
);

select is(
  (select display_name from public.profiles),
  'User A',
  'user A reads their own display_name'
);

reset role;

-- ── Behavior: anonymous access rejected ────────────────────────────────────

set role anon;

select throws_ok(
  'select count(*) from public.profiles',
  '42501',
  'anon SELECT is rejected (privilege revoked)'
);

select throws_ok(
  'insert into public.profiles (id, display_name)
     values (''44444444-4444-4444-4444-444444444444'', ''Anon'')',
  '42501',
  'anon INSERT is rejected (privilege revoked)'
);

reset role;

-- ── Behavior: CHECK constraint on display_name ─────────────────────────────

select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}',
  true
);
set role authenticated;

select throws_ok(
  'insert into public.profiles (id, display_name)
     values (''33333333-3333-3333-3333-333333333333'', rpad(''x'', 121, ''x''))',
  '23514',
  'display_name longer than 120 characters violates the CHECK constraint'
);

select lives_ok(
  'insert into public.profiles (id, display_name)
     values (''33333333-3333-3333-3333-333333333333'', null)',
  'display_name may be null'
);

reset role;

select * from finish();

rollback;
