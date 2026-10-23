# CRM Workspace

A multi-tenant CRM SaaS foundation, built phase by phase. **Phase 1**
delivers the project scaffold, design system, responsive application
shell, and an Overview dashboard populated with clearly identified
demonstration data.

- Product scope → [`docs/PRODUCT_OVERVIEW.md`](docs/PRODUCT_OVERVIEW.md)
- Architecture → [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Design tokens and patterns → [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md)
- Roadmap → [`docs/PHASE_ROADMAP.md`](docs/PHASE_ROADMAP.md)
- Engineering standards → [`docs/ENGINEERING_STANDARDS.md`](docs/ENGINEERING_STANDARDS.md)
- Security and agent rules → [`AGENTS.md`](AGENTS.md)

## Stack

Next.js 16 (App Router) · TypeScript (strict) · Tailwind CSS 4 ·
shadcn/ui on Radix primitives · Lucide icons · Vitest + React Testing
Library. Supabase (database, auth) and Resend (email) arrive in later
phases — see the roadmap.

## Getting started

```bash
npm install        # install dependencies from the lockfile
npm run dev        # start the development server
```

Open <http://localhost:3000> — the Overview dashboard is served at the
application root.

No environment variables are required in Phase 1. When later phases
need them, copy `.env.example` to `.env.local` and fill in values;
never commit real environment files.

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

Phase 1 is complete and awaiting review. Authentication, organizations,
the CRM database schema, records CRUD, reporting, automation, and
integrations are intentionally **not implemented** — see
[`docs/PHASE_ROADMAP.md`](docs/PHASE_ROADMAP.md) for the sequence.
