# Engineering Standards

These standards apply to every change in every phase. `AGENTS.md`
carries the security rules; this document covers how we work day to
day.

## Secure coding

- All twelve security rules in `AGENTS.md` are binding: no secrets in
  code, logs, or the client; server-only secrets never use
  `NEXT_PUBLIC_`; client-supplied identity is never trusted for
  authorization; every server operation authenticates and authorizes.
- Browser-visible configuration is public by definition. Design
  accordingly.
- Error messages shown to users are generic; diagnostics (and any
  error digest) go to logs, not to the screen.
- Dependencies: prefer the existing stack; any new dependency needs a
  justification in the pull request description. No canary or
  experimental packages.

## TypeScript

- `strict: true`; no implicit `any`. Escape hatches (`any`, non-null
  assertions) require an inline comment explaining why.
- Types live close to what they describe: domain record types in
  `src/types/`, prop types alongside their components. When the
  database exists (Phase 4+), record types are **generated from the
  schema** rather than hand-maintained.
- Prefer `readonly` arrays and `as const` for static configuration and
  demo data.
- `npm run typecheck` (`tsc --noEmit`) must pass with zero errors.

## Styling and components

- Use the design tokens in `src/app/globals.css` — semantic Tailwind
  utilities (`bg-card`, `text-muted-foreground`, `border-border`).
  Do not hardcode hex values or repeated arbitrary pixel values in
  components.
- Build on the shadcn/ui primitives in `src/components/ui/`; they are
  owned code and may be customized there, but component-level one-offs
  should not fork shared patterns.
- Server components by default; add `"use client"` only where
  interactivity requires it.
- Separate data from presentation: components receive typed props;
  they do not reach for data sources themselves.

## Testing

- **Unit tests** (Vitest, node environment) cover pure logic:
  formatters, data integrity checks, and future business rules.
- **Component tests** (Vitest + jsdom + React Testing Library) cover
  reusable shared components and their accessible output — what a user
  or screen reader perceives, not internal state.
- Tests run with `npm test`; the full gate is lint + typecheck + test
  + build. CI runs the identical commands.
- Do not weaken security controls, accessibility attributes, or type
  safety to make a test pass. If a check conflicts with a test, the
  test is wrong.
- Target meaningful coverage of shared utilities and components rather
  than a percentage number.

## Error handling

- Every route that renders data gets `loading.tsx` and `error.tsx`
  boundaries as it is introduced.
- Error boundaries show a human message plus an optional recovery
  action; they log the error and surface the digest for correlation.
  They never render raw error messages or stack traces.
- `not-found.tsx` handles unknown routes with a route back to the
  application home.
- `global-error.tsx` stays self-contained (no CSS or component imports)
  so it cannot fail for the same reason as the layout.

## Accessibility

- Semantic landmarks and heading hierarchy (`h1` per page, no skipped
  levels); icon-only controls must have accessible names.
- Visible keyboard focus on all interactive elements; full keyboard
  operability; skip link on every page.
- Status and meaning are conveyed by text, never by color alone.
- Interactive targets ≥32px; respect `prefers-reduced-motion`.
- Forms (from Phase 5 on) associate labels with inputs, describe
  errors in text, and validate on the server regardless of client
  validation.

## Logging

- Log server-side diagnostics with structured messages.
- Never log credentials, tokens, session contents, or customer
  personal data.
- Client-side error boundaries log to the console for now; a real
  telemetry sink arrives with operational monitoring in Phase 10.

## Configuration and environments

- `.env.example` is the catalog of variables: public values carry the
  `NEXT_PUBLIC_` prefix; secrets never do.
- Create local files from the template: `cp .env.example .env.local`.
  `.env.local` is git-ignored; real values never enter source control
  because a leaked secret in Git history is effectively permanent.
- Environments are kept separate: local (developer machine),
  preview (Vercel pull-request deployments), staging (optional,
  pre-production), production. When Vercel is set up (Phase 10),
  variables are configured per environment in the Vercel project
  settings — never committed.
- Phase 1 runs with zero variables configured; nothing degrades if
  they are absent.

## Database migrations (policy from Phase 2/3 onward)

- Migrations are stored in source control, ordered, and reviewed like
  code. Phase 2 shipped `20261023000000_profiles.sql`; Phase 3 shipped
  `20261023000001_workspaces.sql`.
- Every schema change is a **new** migration file. Never rewrite a
  migration that may have been applied to a shared database; ship a
  follow-up migration instead.
- Foreign keys and appropriate constraints (not-null, unique, checks,
  enums) are mandatory for relational integrity.
- Every tenant-sensitive table requires RLS, and RLS policies must be
  tested with different organizations and user roles — a policy
  without a cross-tenant test does not merge.
- **Tenant tables ship complete:** the initial migration for any new
  organization-scoped table contains schema + constraints + indexes +
  RLS policies + least-privilege grants, and the same pull request
  contains its pgTAP suite in `supabase/tests/`. See the permanent
  rules in `AGENTS.md` (“Multi-tenancy & CRM modules”).
- `SECURITY DEFINER` functions require empty fixed `search_path`,
  fully qualified names, `auth.uid()`-derived identity, minimal
  parameters, no dynamic SQL, revoked default `EXECUTE`, and positive
  grants to `authenticated` only — plus database tests proving both
  the positive and negative paths. The current approved set is listed
  in `AGENTS.md`.
- Schema changes and data migrations are considered separately when a
  change touches both.
- Destructive changes (dropping columns or tables, type narrowing)
  require explicit review and a safe migration strategy (expand →
  migrate → contract), never a silent rewrite.
- Database types for TypeScript are generated from the actual schema
  (e.g. `supabase gen types`), not guessed by hand.

## Server actions and mutation UX (policy from Phase 3 onward)

- Every server action identifies the caller from verified claims
  (`requireUser` / cached `getAuthenticatedUser`), validates input at
  the boundary, and performs the mutation under the caller's own
  RLS-filtered session. Client-supplied user ids, roles, and
  organization ids never authorize anything.
- Actions return mapped, safe messages (e.g.
  `src/lib/workspace/errors.ts`); raw database errors never reach the
  UI or logs.
- Submit controls show immediate pending feedback (`useFormStatus` /
  `useActionState`): disabled + spinner + honest “…” label on press,
  success only after the action confirms. No full-page reloads for
  mutations; `revalidatePath` refreshes the affected regions.
- Destructive row actions use a two-step confirmation (arm → confirm)
  or an equivalent guard, and preserve form state on failure so the
  user can retry.
- Invitation/secret material (raw tokens) is never logged, returned in
  action state, or rendered; only hashed forms are stored.

## Code review

- Every change goes through a pull request with a description covering
  what, why, and how it was verified.
- Reviewers check: security rules respected; tests and quality gates
  green; tokens and components used correctly; accessibility preserved;
  honest UI (no fake-working controls); documentation updated when
  architecture or conventions change.
- No self-merges to `main`. CI must pass before merge.
