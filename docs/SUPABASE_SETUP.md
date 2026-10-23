# Supabase & Vercel Configuration (Phase 2)

This guide wires the application to a Supabase project for email/password
authentication, secure cookie sessions, and the `profiles` table — and
configures Vercel for deployment. It is the single source of truth for
the environment variables and dashboard settings Phase 2 depends on.

Scope: authentication and the user profile table only. Organizations,
tenant management, and CRM data arrive in later phases (see
`docs/PHASE_ROADMAP.md`).

---

## 1. Prerequisites

- A [Supabase](https://supabase.com) account (free tier is enough).
- Node.js 20+ and npm (already required by the application).
- Docker Desktop, if you want to run the pgTAP security tests locally
  (Section 7). Everything else works without Docker.

## 2. Create the Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and
   click **New project**.
2. Choose an organization, a name (e.g. `yourbis-crm-dev`), a strong
   database password, and a region close to your users.
3. Wait for the project to provision, then open it.

Keep one project per environment (a dev project now; separate projects
for staging/production when those exist). Never point a preview
deployment at the production database.

## 3. Get the credentials

In the Supabase dashboard open **Project Settings → API Keys**:

| Setting | What to copy |
| --- | --- |
| **Project URL** | `https://<project-ref>.supabase.co` |
| **Publishable key** (labeled `anon` on older projects) | The long `eyJ...` key |

The application uses the *publishable* key (new Supabase name) / *anon*
key (legacy name — same value, same behavior). It identifies the
application, not a user; all data protection comes from database grants
and Row Level Security. Two variables carry it:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>
```

> **No service-role key in Phase 2.** The application never needs it.
> The `SUPABASE_SERVICE_ROLE_KEY` placeholder in `.env.example` is for
> later phases (trusted server-side jobs only) and must never be
> prefixed with `NEXT_PUBLIC_` or referenced from client code.

## 4. Configure local development

Create `.env.local` in the repository root (git-ignored by default):

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>
```

Restart `npm run dev` after any change — Next.js does not hot-reload
environment files.

**Working without credentials is supported by design.** With the
variables absent, the app builds and runs: every page redirects to
`/sign-in`, which shows a configuration notice instead of a broken form.
CI relies on this (no credentials in the pipeline).

## 5. Configure authentication in the Supabase dashboard

Open **Authentication → Sign In / Up** (a.k.a. Auth Providers):

1. **Email provider**: enabled by default. Keep it on; leave *Confirm
   email* ON (the production security posture this app is built for).
   With auto-confirm enabled the app still works — sign-up immediately
   redirects into the app — but email verification is then not enforced.
2. **Minimum password length**: 8 (the default; matches the validation
   in `src/lib/auth/validation.ts`).
3. **Rate limits**: leave at the defaults (email sends and auth
   requests are limited; the app surfaces "too many attempts" messages).

## 6. Point the email templates at this application

Supabase's default templates use `{{ .ConfirmationURL }}`, which routes
through Supabase-hosted pages. The app instead verifies one-time tokens
server-side at `/auth/confirm`. Open
**Authentication → Email Templates** and replace the action links:

**Confirm signup template** — replace the link target with:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/
```

**Reset password template** — replace the link target with:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
```

Keep the rest of each template as-is; only the `href` needs to change.
`/auth/confirm` accepts only the whitelisted `type` values
(`signup`, `recovery`, `invite`, `magiclink`, `email_change`, `email`),
never echoes the token, and redirects failures to a clean error banner
(see `src/app/auth/confirm/route.ts`).

Also open **Authentication → URL Configuration**:

- **Site URL**: your production URL (for local work use
  `http://localhost:3000`, then switch when you deploy).
- **Redirect URLs**: add at least
  - `http://localhost:3000/auth/confirm`
  - `http://localhost:3000/auth/callback`
  - your deployed equivalents (e.g. `https://your-domain.com/auth/confirm`,
    `https://your-domain.com/auth/callback`).

`resolveRequestOrigin` derives the link origin from each request's
headers, so the same deployment works on localhost, preview URLs, and
production — Supabase just has to allow the redirect targets above.

## 7. Apply the database migrations

The repository ships two versioned migrations, applied in order:

1. `supabase/migrations/20261023000000_profiles.sql` — the
   `public.profiles` table, its Row Level Security policies, and
   least-privilege, column-level grants (Phase 2).
2. `supabase/migrations/20261023000001_workspaces.sql` — Phase 3
   multi-tenancy: `organizations`, `organization_memberships`, and
   `organization_invitations` tables, the `workspace_role` /
   `invitation_status` enums, indexes, guard triggers, RLS policies,
   column-level grants, the `private.workspace_role_of()` policy
   helper, and the two atomic RPCs `create_organization` and
   `accept_organization_invitation`. The `supabase/` directory also
   contains `config.toml` (local-development configuration, generated
   by `supabase init`).

**Option A — Supabase CLI (recommended):**

```bash
npx supabase login                       # once; opens the browser
npx supabase link --project-ref <ref>    # ref from Settings → General
npx supabase db push                     # applies pending migrations
```

**Option B — SQL editor (no CLI):** open **SQL Editor** in the
dashboard, paste the full contents of each migration file **in order**
(profiles first, then workspaces), and run each once.

> **Reconciliation note (Phase 2 migration):** the profiles migration
> was applied to the Supabase project via the SQL editor during Phase
> 2 review. If `npx supabase db push` reports it as pending (it is not
> yet registered in `supabase_migrations.schema_migrations`), use
> `npx supabase db push --include-all` once so the history records
> both applied migrations, and verify with
> `npx supabase migration list` that `20261023000000_profiles` and
> `20261023000001_workspaces` are both recorded as applied. Never
> re-run the profiles DDL by hand and never reset the database —
> reconcile through the CLI only.

## 8. Run the database security tests

Two pgTAP suites live in `supabase/tests/`:

- `profiles_security_test.sql` (29 tests): RLS enabled and forced; no
  anon grants; column-level grants only; per-user row isolation;
  cross-user writes rejected; the `display_name` CHECK enforced.
- `workspaces_security_test.sql` (81 tests): schema and RLS
  enablement; least-privilege grants (anon gets nothing,
  `token_hash` unreadable, no direct membership INSERT, no invitation
  DELETE); `create_organization` positive/negative paths; two-user
  two-organization tenant isolation; the full role matrix (owner vs
  admin vs member vs viewer); last-owner protection; spoofed
  organization ids rejected; the complete invitation lifecycle
  (duplicate pending, wrong/expired/revoked token, email mismatch,
  single use, resend rotation, idempotent acceptance, direct status
  tampering); co-member profile visibility.

```bash
npx supabase test db            # local; requires Docker, then: npx supabase start
# or, against any Postgres with pgTAP (e.g. a Supabase branch database):
npx supabase test db --db-url "postgresql://postgres:[password]@db.<ref>.supabase.co:5432/postgres"
```

> **Status note (honest reporting):** these tests were authored for
> their migrations but **could not be executed in the Phase 2/Phase 3
> build sandboxes** (no Docker daemon, no local Postgres, no remote
> credentials). Run the commands above before applying a migration to
> any shared database — no test pass is claimed on this environment's
> behalf.

## 8b. Configure Resend (workspace invitation emails — Phase 3)

Invitation emails are delivered through [Resend](https://resend.com)
from server code only:

1. Create a Resend account, add and **verify your sender domain**
   (Dashboard → Domains), and create an API key.
2. Set two server-side variables (in `.env.local` locally, and later in
   Vercel): `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (a plain address
   on the verified domain, e.g. `no-reply@your-domain.com` — the
   application validates the address shape and rejects anything else as
   not configured). Neither may ever carry the `NEXT_PUBLIC_` prefix.
3. Restart the dev server. Team settings now shows real delivery;
   without these variables, inviting fails with an explicit
   configuration message — by design, the app never pretends an email
   was sent.

Authentication emails (confirmation, recovery) continue to flow
through the **Supabase SMTP settings you configured in Section 5** —
Resend is used for workspace invitations only, and the Supabase
invitation-by-email API is deliberately not used.

## 9. Vercel configuration (when you deploy)

No Vercel settings were changed by Phase 2 — these are the steps for
when you choose to deploy:

1. Import the repository into Vercel (framework preset: Next.js; all
   defaults are correct — no build settings need changing).
2. **Settings → Environment Variables** — add, for *Production* and
   *Preview*:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://<project-ref>.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = the publishable key
3. Do **not** add `SUPABASE_SERVICE_ROLE_KEY` yet (nothing uses it in
   Phase 2; add it only with the later phase that needs it, as a
   server-only secret).
4. Redeploy after adding variables (they are inlined at build time).
5. In Supabase **Authentication → URL Configuration**, add the deployed
   `/auth/confirm` and `/auth/callback` URLs (Section 6).

Preview deployments work out of the box because redirect links are
derived per request; each preview URL must simply be allowed in the
Supabase redirect list (wildcard patterns such as
`https://*-<team>.vercel.app/auth/**` are supported there).

## 10. Verification walkthrough

After Sections 4–8b, exercise the flows end to end:

1. Visit `/` → redirected to `/sign-in`.
2. **Sign up** with a real address → "Check your email" panel (no
   session yet).
3. Open the confirmation email → click through → you land on
   **workspace onboarding** (Phase 3): name a workspace, create it,
   and you are taken to the dashboard as its **Owner**.
4. Reload → still signed in (session cookies refreshed by the proxy);
   the sidebar switcher shows your workspace and role.
5. **Sign out** from the user menu (immediate "Signing out…" feedback)
   → back to `/sign-in`; visiting `/` again redirects to sign-in.
6. **Forgot password** → email → recovery link → `/reset-password` →
   set a new password → dashboard; sign in with the new password.
7. In Supabase **Table Editor** you should see exactly one `profiles`
   row for your user, one `organizations` row, and one
   `organization_memberships` row with role `owner` (as seen by the
   dashboard's privileged view; the app itself can only ever read rows
   its RLS policies allow).
8. **Rename the workspace** from Settings → Workspace (owner/admin
   only) → the switcher and breadcrumb update without a page reload.
9. **Invite a teammate** from Settings → Team with a second real
   address → the invitation appears as *Pending*; the email arrives
   via Resend with an Accept link.
10. Open the link in a private window (signed out) → you are sent to
    sign-in and returned to `/accept-invitation?token=…` with the
    token preserved. Sign up/in with **exactly the invited address**,
    accept → you land on the dashboard inside that workspace with the
    granted role.
11. Re-open the same acceptance link → rejected (single use). Try it
    signed in as a *different* email → rejected (email mismatch).
12. As owner: change the teammate's role, remove them, leave the
    workspace yourself — and verify the last owner can neither be
    removed nor demoted (the UI hides it; the database rejects it).
