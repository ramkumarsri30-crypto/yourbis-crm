<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# CRM Workspace — Agent & Engineering Rules

These rules apply to every coding phase of this project, human or AI.
They are requirements, not suggestions. Reviewers must treat violations
as blocking defects.

## Security rules (mandatory in every phase)

1. **Never expose secrets.** Do not expose API keys, passwords, tokens,
   service-role credentials, or private environment variables to the
   client, in logs, in error messages, or in committed files.
2. **Never commit real `.env` files.** Only `.env.example` with blank
   placeholders is tracked. `.gitignore` enforces this; do not weaken it.
3. **Keep privileged credentials server-side only.** The Supabase
   service-role key and the Resend API key are server-only secrets.
   They must never be prefixed with `NEXT_PUBLIC_` and never referenced
   from client components.
4. **Treat browser-visible configuration as public.** Anything reachable
   through `NEXT_PUBLIC_*` variables, network payloads, or rendered HTML
   must be considered visible to the world.
5. **Never trust client-supplied identity for authorization.** A
   client-supplied organization ID, role, owner ID, or permission flag
   is never proof of authorization — it is untrusted input.
6. **Authenticate and authorize every server operation.** Future server
   actions, route handlers, and data mutations must identify the caller
   from the verified session and authorize the specific operation
   server-side.
7. **Require tested RLS on tenant-sensitive tables.** Every table that
   contains organization-scoped data must have PostgreSQL Row Level
   Security policies, and those policies must be tested against
   different organizations and roles before merge.
8. **Migrations are versioned and additive.** Never silently rewrite a
   migration that may already have been applied to a shared database.
   Every schema change ships as a new ordered migration file.
9. **Validate untrusted input at server boundaries.** Validate shape,
   types, and ranges where data enters the server (route handlers,
   server actions, webhooks), not only in the UI.
10. **Do not log sensitive information.** Never log credentials,
    tokens, session contents, or customer personal data.
11. **Do not disable security controls to make tests pass.** If a test
    conflicts with a security control, the test is wrong.
12. **No production changes or deploys without explicit authorization.**
    Do not deploy, migrate shared databases, or modify production
    configuration unless explicitly instructed.

## Project conventions

- **Package manager:** npm only, one `package-lock.json`. Do not
  introduce files from other package managers.
- **Language:** TypeScript in strict mode. No `any` unless a boundary
  genuinely requires it; prefer `unknown` plus narrowing.
- **Styling:** Tailwind CSS with the design tokens defined in
  `src/app/globals.css`. Do not hardcode colors or repeated pixel
  values in components — use the tokens.
- **Components:** build on the shadcn/ui primitives in
  `src/components/ui/`. Do not add component libraries that duplicate
  them.
- **Data honesty:** until real data access exists (Phase 5+), all
  records shown in the UI must come from `src/lib/demo-data.ts` and be
  visibly labeled as demonstration data. Unimplemented features must
  render as visibly disabled, never as fake-working controls.
- **Accessibility:** semantic HTML, keyboard-operable controls, visible
  focus, labels for icon-only controls, status never communicated by
  color alone. See `docs/DESIGN_SYSTEM.md`.
- **Verification:** `npm run lint`, `npm run typecheck`, `npm test`, and
  `npm run build` must pass before any change is considered done.
  See `docs/ENGINEERING_STANDARDS.md` for the full checklist.

## Authentication & sessions (Phase 2+)

- **Authorization uses verified claims.** Server-side authorization
  decisions use `supabase.auth.getClaims()` (cryptographically verified:
  signature + expiry) — see `src/lib/auth/guards.ts`. Never authorize
  from `getSession()`: a session object read from a cookie is not proof
  of identity. Full user details (when needed for rendering) come from
  `getUser()` via `getAuthUserRecordFor`.
- **Route protection is layered.** `src/proxy.ts` (the Next.js 16
  middleware convention) refreshes session cookies and applies
  *optimistic* redirects; the authoritative check is `requireUser()` in
  the `(crm)` server layout. Data operations verify independently and
  never trust the proxy having run.
- **Never trust client-supplied identity.** User IDs, roles, and
  organization claims from the browser are untrusted input; the verified
  claims (server-verified) are the only identity source. Profile rows
  are created by the user's own RLS-constrained insert after a verified
  session (`src/lib/auth/profile.ts`) — never by `auth.users` triggers,
  never with a service key, never from un-sanitized metadata.
- **Environment variables.** `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the publishable/anon key — do
  not introduce a deprecated `NEXT_PUBLIC_SUPABASE_ANON_KEY`). The app
  must keep building and running when they are absent: degrade to the
  configuration notice, never crash. No service-role key exists in the
  application for Phase 2, and it must never be `NEXT_PUBLIC_`.
- **Redirect hygiene.** Post-auth redirects go through
  `safeRedirectPath` (allowlist; no open redirects). Auth errors surface
  only safe, mapped messages (`src/lib/auth/errors.ts`) — no provider
  internals, no account-existence disclosure, identical messages for
  unknown-email vs wrong-password, and the forgot-password flow is
  anti-enumeration.
- **Database security.** Migrations live in `supabase/migrations/`
  (versioned, additive). Every application table gets RLS *enabled*
  (plain `ENABLE`, not `FORCE` — table-owner helpers and the audited
  RPCs must be able to scan policy-protected tables), least-privilege
  column-level grants (revoke the broad defaults from
  `anon`/`authenticated` first), policies with the
  `(select auth.uid())` scalar-subquery form, and pgTAP tests in
  `supabase/tests/`. See `supabase/migrations/20261023000000_profiles.sql`
  and `supabase/migrations/20261023000001_workspaces.sql` for the
  reference patterns and `docs/SUPABASE_SETUP.md` for how to apply and
  test migrations.
- **Privileged functions are the exception, and a reviewed one.**
  `SECURITY DEFINER` appears only where plain policies cannot express
  the rule, and always with: fixed empty `search_path`, fully qualified
  object names, `auth.uid()`-derived identity (never caller-supplied
  user ids or roles), minimal parameters, no dynamic SQL, default
  `EXECUTE` revoked, and execution granted to `authenticated` only.
  Phase 3 ships exactly three: `private.workspace_role_of(uuid)`
  (policy helper in the non-exposed `private` schema — it is not
  callable over the Data API) and the two audited atomic RPCs
  `public.create_organization(text)` /
  `public.accept_organization_invitation(text)`. Any addition to this
  set requires the same justification and tests.

## Multi-tenancy & CRM modules (Phase 3+ — permanent rules)

These rules prevent the class of defects where a CRM grows duplicated
record modules, divergent permission models, or UI features without
persistence. They bind every future phase.

1. **One canonical data model per record type.** Leads, contacts,
   accounts, deals, activities, … each get exactly ONE table and ONE
   server-side module (`src/lib/<module>/`). Never add a second table,
   query set, or permission matrix for the same record type — extend
   the existing one.
2. **Every tenant-scoped table ships complete in its initial
   migration.** Schema + constraints + indexes + RLS policies +
   least-privilege grants + pgTAP security tests land together. A table
   without policies and tests in the same migration is a blocking
   defect, not a follow-up ticket.
3. **Explicit foreign keys always.** Tenant-scoped rows reference
   `public.organizations (id)`; user references point at `auth.users`.
   No soft/id-only associations without a FK constraint.
4. **Authorization flows through the workspace role.** Record access is
   derived from the caller's `organization_memberships.role` via the
   `private.workspace_role_of()` helper (or its successor) inside RLS
   policies. Never re-implement role logic in a second place; the
   mirror in `src/lib/workspace/roles.ts` exists only for rendering and
   pre-checks and must stay aligned with the policies.
5. **UI without persistence is forbidden.** No screen may render
   record data that is not read from (or written to) the database under
   RLS. Demo data stays clearly labeled and confined to Phase-1
   dashboard placeholders until real modules replace it. A feature with
   no server-side permission check is a bug regardless of how the UI
   guards it.
6. **List and board (Kanban) views share one data model.** Same table,
   same policies, same queries — only the presentation differs. A
   Kanban that reads different rows or applies different permissions
   than its list view is a defect.
7. **Shared interaction patterns.** Search, filtering, pagination, and
   row actions follow the bounded-query + server-action + honest-error
   patterns established in Phase 3 (`src/lib/workspace/queries.ts`,
   `src/lib/workspace/actions.ts`). New modules reuse them instead of
   inventing per-screen conventions.
8. **Central module registry.** Navigation (`src/lib/navigation.ts`)
   and route metadata stay the single registry of modules/screens.
   Adding a module means updating that registry (and its pgTAP suite
   when it owns a table) — not forking layout or shell code.
9. **Organization-scoped queries are always bounded.** Paginated with
   explicit `range()`/`limit()`, ordered deterministically, and indexed
   to match the RLS predicates (see the Phase 3 index notes in the
   workspaces migration). No unbounded `select *` from any client.
