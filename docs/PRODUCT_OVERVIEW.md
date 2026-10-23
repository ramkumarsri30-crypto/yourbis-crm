# Product Overview

## What we are building

CRM Workspace is a multi-tenant, software-as-a-service customer
relationship management product for business-to-business sales teams. It
is deliberately inspired by the usability and functional scope of
established products — Zoho CRM, HubSpot Sales Hub, Salesforce, and
Pipedrive — while keeping its own restrained, professional identity. The
goal is not to clone any single product, but to deliver the capabilities
small and mid-sized sales organizations actually rely on daily: capturing
leads, organizing contacts and accounts, progressing deals through a
pipeline, tracking activities, and understanding performance through
reporting.

The product is being built in carefully controlled phases. Phase 1 — the
current phase — delivers the project foundation, the design system, the
responsive application shell, and a demonstration dashboard. It contains
no authentication, no database, and no real CRM operations. Everything
shown in the interface is clearly labeled demonstration data.

## Target users

- **Sales representatives** — the primary daily users. They need fast
  access to their pipeline, their tasks, and recent activity, with dense
  but readable data tables and quick record creation.
- **Sales managers** — need team-level visibility: pipeline health,
  activity volume, forecast accuracy, and coaching signals.
- **Sales operations / administrators** — configure the workspace,
  manage users and roles, import data, define automations, and maintain
  integrations.

The first release targets small teams within a single organization. The
architecture is designed from the start for multi-tenancy, so that a
later phase can serve many organizations from one deployment without a
rewrite.

## Initial goals

1. Deliver a credible, polished B2B interface that feels like a
   commercial product rather than a template — clean light theme,
   restrained accent color, consistent tokens, dense but comfortable
   layouts.
2. Establish the technical foundation (Next.js App Router, TypeScript
   strict mode, Tailwind CSS, shadcn/ui on Radix primitives) and the
   engineering standards that every later phase inherits.
3. Ship the core CRM loop end to end: lead capture → qualification →
   conversion to contact/account/deal → pipeline progression → activity
   tracking.
4. Keep the product honest: every control either works as advertised or
   is visibly disabled with its future phase identified.

## Key modules

| Module | Purpose | Phase |
| --- | --- | --- |
| Overview dashboard | KPIs, pipeline health, activity, upcoming work | Phase 1 (demo data), Phase 7 (live data) |
| Leads | Capture, qualify, and convert inbound and outbound prospects | Phase 5 |
| Contacts | Person records, ownership, and relationships | Phase 5 |
| Accounts | Company records grouping contacts and deals | Phase 4–5 |
| Deals | Pipeline management with stages, values, and outcomes | Phase 5 |
| Activities | Tasks, calls, meetings, notes, and timelines | Phase 6 |
| Reports | Performance reporting, forecasting, multi-currency | Phase 7 |
| Automations | Workflow rules, notifications, execution history | Phase 8 |
| Integrations | Email, calendar, WhatsApp Business, external APIs | Phase 9 |
| Administration | Subscription, usage controls, security, monitoring | Phase 10 |

## First release versus future enterprise capabilities

The first release (Phases 1–7) focuses on a single sales team inside a
single organization: one workspace, shared records, roles for owner and
manager, and reporting on top of real CRM data. Multi-tenant
organizations, invitations, and granular permissions arrive in Phase 3,
before any real records exist, so that isolation is a property of the
data model rather than an afterthought.

Enterprise capabilities are deliberately deferred beyond the first
release: workflow automation (Phase 8), deep mailbox and calendar
integration with WhatsApp Business (Phase 9), SaaS subscription billing
with usage controls (Phase 10), advanced security review, operational
monitoring, and production hardening. This sequencing keeps every phase
independently reviewable and testable, and ensures the core CRM loop is
excellent before expansive features are layered on top.
