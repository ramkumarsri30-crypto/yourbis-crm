# CRM Workspace

A multi-tenant CRM SaaS foundation, built phase by phase. **Phase 1**
delivers the project scaffold, design system, responsive application
shell, and an Overview dashboard populated with clearly identified
demonstration data. **Phase 2** adds Supabase email/password
authentication, secure cookie sessions, route protection, and the
RLS-protected `profiles` table.

- Product scope → [`docs/PRODUCT_OVERVIEW.md`](docs/PRODUCT_OVERVIEW.md)
- Architecture → [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Design tokens and patterns → [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md)
- Roadmap → [`docs/PHASE_ROADMAP.md`](docs/PHASE_ROADMAP.md)
- Supabase & Vercel setup → [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md)
- Engineering standards → [`docs/ENGINEERING_STANDARDS.md`](docs/ENGINEERING_STANDARDS.md)
- Security and agent rules → [`AGENTS.md`](AGENTS.md)

## Stack

Next.js 16 (App Router) · TypeScript (strict) · Tailwind CSS 4 ·
shadcn/ui on Radix primitives · Lucide icons · Vitest + React Testing
Library · Supabase Auth (`@supabase/ssr` cookie sessions, RLS-backed
Postgres). Resend (email) arrives in a later phase — see the roadmap.

## Getting started

```bash
npm install        # install dependencies from the lockfile
npm run dev        # start the development server
```

Open <http://localhost:3000>. Since Phase 2 the CRM area requires a
signed-in session: without Supabase credentials every route redirects
to `/sign-in`, which explains how to configure authentication. To use
the real flows, copy `.env.example` to `.env.local`, fill in the two
Supabase values, and follow
[`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md) (project creation,
email templates, migration, security tests). Never commit real
environment files.

## Quality checks

```bash
npm run lint       # ESLint (next/core-web-vitals + next/typescript)
npm run typecheck  # tsc --noEmit
npm test           # Vitest unit and component tests
npm run build      # production build
```

The same commands run in CI on every pull request and push to `main`
(`.github/workflows/ci.yml`).

## Project status

Phase 1 is complete. Phase 2 (authentication, sessions, profiles table
with RLS) is implemented and awaiting review. Organizations, the CRM
database schema, records CRUD, reporting, automation, and integrations
are intentionally **not implemented** — see
[`docs/PHASE_ROADMAP.md`](docs/PHASE_ROADMAP.md) for the sequence.
