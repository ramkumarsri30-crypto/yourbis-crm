# Architecture

## Current state (Phase 3)

Phase 1 delivered a frontend-only application: a Next.js App Router
project with a design system, an application shell, and a dashboard
rendered from isolated demonstration data. Phase 2 added Supabase
email/password authentication with secure cookie sessions, route
protection, and the RLS-protected `profiles` table. Phase 3 added
multi-tenant workspaces: organizations, memberships with roles
(owner/admin/member/viewer), and an invitation lifecycle with hashed
single-use tokens and Resend delivery — all RLS-enforced and covered by
pgTAP security tests. CRM records (leads, contacts, accounts, deals),
automations, and external integrations remain unimplemented — anything
listed below as *planned* is explicitly not implemented yet.

## Technology stack

| Concern | Choice | Status |
| --- | --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) | In use |
| Language | TypeScript, `strict: true` | In use |
| Styling | Tailwind CSS 4 via `@tailwindcss/turbopack` | In use |
| UI primitives | shadcn/ui (Radix-based, nova preset) in `src/components/ui/` | In use |
| Icons | Lucide React | In use |
| Fonts | Geist + Geist Mono via `next/font/google` (self-hosted at build time; no runtime font service) | In use |
| Testing | Vitest + jsdom + React Testing Library | In use |
| Auth | Supabase Auth via `@supabase/ssr` (cookie sessions) | In use (Phase 2) |
| Database | Supabase PostgreSQL (`public.profiles` with RLS) | In use (Phase 2; CRM tables later) |
| Authorization | Verified claims + PostgreSQL RLS | In use for auth/profiles; tenant-scoped rules Phase 3+ |
| Transactional email | Resend | **Planned — Phase 9** (Supabase built-in email templates are used meanwhile) |
| Hosting | Vercel | **Planned — Phase 10** (configuration documented) |

Package management is npm with a single committed `package-lock.json`.
No canary, experimental, or nightly packages are used.

## Directory layout and responsibilities

```
src/
  app/
    layout.tsx            Root layout: fonts, global metadata, globals.css
    globals.css           Design tokens (CSS variables) and base styles
    not-found.tsx         Root 404 boundary
    global-error.tsx      Root error boundary (self-contained)
    (crm)/                Route group for all CRM module pages
      layout.tsx          Wraps children in the AppShell
      page.tsx            Overview dashboard, served at "/" (group index)
      loading.tsx         Route-level loading skeleton
      error.tsx           Route-level error boundary
  components/
    ui/                   shadcn/ui primitives (owned, editable)
    layout/               AppShell, Sidebar, SidebarNav, SidebarFooter,
                          MobileNavigation, Topbar, UserMenu
    dashboard/            PipelineOverview, RecentActivity,
                          RecentLeadsTable, UpcomingTasks
    shared/               PageHeader, SectionHeader, MetricCard,
                          StatusBadge, EmptyState, LoadingState, ErrorState
  lib/
    utils.ts              cn() + deterministic (UTC) formatters
    demo-data.ts          All Phase 1 mock data (single, isolated module)
    navigation.ts         Navigation configuration shared by sidebar
                          and mobile drawer
  types/
    index.ts              Domain types for demo records (schema-generated
                          types will replace these in Phase 4+)
docs/                     Product, architecture, design, roadmap, standards
.github/workflows/        CI quality checks
```

### Route conventions

- The `(crm)` route group hosts every CRM module page. Route groups do
  not affect the URL, so the Overview dashboard is served at `/` — the
  application home. Future modules live alongside it (`/leads`,
  `/contacts`, `/accounts`, `/deals`, …) and inherit the shell from the
  group layout.
- Next.js 16 typed routes are enabled: `<Link href>` values are checked
  against the generated route types, so a link to a non-existent route
  is a compile-time error, not a runtime 404. This is the primary guard
  behind the “no broken navigation” requirement.
- Every route segment that can fail or defer gets explicit `error.tsx`
  and `loading.tsx` boundaries as routes are added in later phases.

### Server-first component model

Components default to React Server Components. A file becomes a client
component only when it needs interactivity (`"use client"`), which in
Phase 1 means exactly three files: `MobileNavigation` (sheet state),
`UserMenu` (dropdown), and the generated Radix-based primitives. The
dashboard itself renders entirely on the server from static demo data,
so it ships no client JavaScript of its own.

### Data flow (Phase 1)

`src/lib/demo-data.ts` is the single data source. It is presentation-free
(plain typed objects, no formatting) so that in Phase 5 it can be
replaced by server-side data access without touching component code —
components already receive fully-formed props and pre-formatted strings.
Formatting helpers in `lib/utils.ts` are deterministic (UTC) so that
server-rendered output never depends on the machine or viewer timezone.

## Supabase roles (Phase 2–3 — delivered)

- **Clients.** `src/lib/supabase/` separates browser
  (`createBrowserClient`), server (Server Components/actions bound to
  the request cookie store), and proxy clients. All read configuration
  through `src/lib/supabase/config.ts`; the app degrades to a
  configuration notice when credentials are absent.
- **Sessions.** `src/proxy.ts` (the Next.js 16 middleware convention)
  refreshes session cookies on every non-static request via
  `auth.getClaims()` and propagates refreshed cookies to both the
  request context and the response, keeping sessions alive across
  reloads. Redirects preserve the query string, so invitation links
  (`/accept-invitation?token=…`) survive the sign-in round trip.
- **Authorization.** `src/lib/auth/guards.ts` provides
  `requireUser()` (verified claims; redirects unauthenticated visitors)
  for the `(crm)` layout. `getAuthenticatedUser()` is wrapped in
  React `cache()`, so the layout, pages, and server actions within one
  request share a single verification round trip. `getSession()` is
  never used for authorization decisions.
- **Profile.** One `public.profiles` row per user, created lazily by
  the user's own RLS-constrained insert after a verified session
  (`src/lib/auth/profile.ts`); no `auth.users` triggers, no
  service-role writes. Phase 3 adds co-member visibility (display
  names only, never emails).
- **Multi-tenancy (Phase 3).** `organizations`,
  `organization_memberships`, and `organization_invitations` (see
  `supabase/migrations/20261023000001_workspaces.sql`) with RLS on
  every table, column-level grants, guard triggers (last-owner
  protection, invitation transitions, membership identity
  immutability), and two audited atomic RPCs:
  `create_organization(name)` (organization + owner membership in one
  transaction) and `accept_organization_invitation(token)` (locked,
  single-use, confirmed-email-matched acceptance). The policy helper
  `private.workspace_role_of()` lives in the non-exposed `private`
  schema. No direct INSERT grants exist on memberships; the `owner`
  role is reachable only through workspace creation.
- **Workspace context (server).** `src/lib/workspace/context.ts`
  resolves the caller's verified membership list (one cached query per
  request) and the active workspace: the `active_workspace` cookie
  when it names a membership, otherwise the first one. The cookie is
  a UI preference, never an authorization — every read re-validates
  it, and data access stays RLS-bound regardless of which workspace
  is "active".
- **Invitations.** Raw tokens are 32 random bytes (base64url),
  delivered only inside the emailed link, stored solely as SHA-256
  hashes, expiring after 7 days, consumed exactly once under a row
  lock. Delivery runs through Resend (`src/lib/email/`), server-only,
  with honest not-configured/not-delivered states — the UI never
  implies an email was sent when it was not.
- **Database.** `supabase/migrations/` holds versioned migrations
  (RLS enabled, least-privilege column grants); pgTAP security
tests live in `supabase/tests/`. See `docs/SUPABASE_SETUP.md`.

## Planned: Next.js and Supabase roles

- **Phase 4+ — CRM schema and operations.** Tables for leads, contacts,
  accounts, deals, and activities, with foreign keys and constraints.
  Server Actions or route handlers perform mutations; each one
  authenticates the caller and relies on RLS (never on client-supplied
  organization IDs) for authorization. TypeScript types are generated
  from the actual schema rather than hand-written. Ownership transfer
  between users is deliberately out of Phase 3 scope and needs its own
  design when scheduled.

## Request-latency model (Phase 3 findings)

Static call-path analysis (see the Phase 3 worklog) found the shell's
hot path paying sequential auth-server round trips: proxy
`getClaims`, layout `getClaims`, `getUser`, and a `profiles` select —
four network serializations before the shell renders, plus an insert
and re-read on a user's first visit. Remediations shipped in Phase 3:

- `getAuthenticatedUser()` is request-cached (React `cache()`), so
  the layout, pages, and server actions share ONE verification round
  trip per request.
- The profile row and the workspace membership list are fetched in
  parallel (`Promise.all`); the membership list is itself cached per
  request (`listMyWorkspaces`), so the switcher, the breadcrumb, and
  the settings pages read one query result.
- All submit and sign-out controls render an immediate pending state,
  so visible feedback no longer waits for the network.

Known, accepted costs: each request's server client re-verifies the
JWT against the auth server's JWKS (per-request client creation is
the required SSR pattern), so cold requests pay one signature-check
round trip. Live production timings were not measurable from the
build sandbox (no Supabase credentials); the findings above derive
from call-path analysis of the installed `@supabase/auth-js`
internals and the request flow.

## Configuration boundaries

- All theme tokens live in `src/app/globals.css` as CSS variables —
  colors, radii, and layout dimensions (`--app-sidebar-width`,
  `--app-topbar-height`, `--app-content-max-width`). Components never
  hardcode repeated values.
- Environment variables are documented in `.env.example` with blank
  values only. Public values use the `NEXT_PUBLIC_` prefix; secrets
  (`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`) are server-only and
  must never carry the prefix. Phase 2 uses only the two public
  Supabase variables; the application must keep building and running
  without them (CI has no credentials).
- Supabase project configuration, email templates, redirect allowlist,
  migrations, and Vercel deployment steps are documented in
  `docs/SUPABASE_SETUP.md`.
- Local, preview, staging, and production environments are kept
  conceptually separate; see docs/ENGINEERING_STANDARDS.md for the
  environment variable policy that applies when they are created.

## Quality automation

- `npm run lint` (ESLint flat config with `next/core-web-vitals` and
  `next/typescript`), `npm run typecheck` (`tsc --noEmit`), `npm test`
  (Vitest), and `npm run build` (production build) are wired as package
  scripts.
- `.github/workflows/ci.yml` runs the same commands on every pull
  request and push to `main`, installing dependencies reproducibly with
  `npm ci` from the lockfile. The workflow uses no secrets.
