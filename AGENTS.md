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
  (versioned, additive). Every application table gets RLS *enabled and
  forced*, least-privilege column-level grants (revoke the broad
  defaults from `anon`/`authenticated` first), policies with the
  `(select auth.uid())` scalar-subquery form, and pgTAP tests in
  `supabase/tests/`. No `SECURITY DEFINER` functions in application
  schemas. See `supabase/migrations/20261023000000_profiles.sql` for the
  reference pattern and `docs/SUPABASE_SETUP.md` for how to apply and
  test migrations.
