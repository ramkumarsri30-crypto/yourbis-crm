# Phase Roadmap

The project advances in reviewed, individually verifiable phases. A
phase is not started until the previous one is reviewed and explicitly
authorized. Each phase lists its scope; anything not listed is out of
scope for that phase.

## Phase 1 — Foundation (current, complete for review)

Project scaffold, design system, responsive CRM application shell
(sidebar, top bar, mobile drawer), reusable UI components, and an
Overview dashboard populated with clearly identified demonstration
data. Documentation, engineering standards, and automated quality
checks (lint, typecheck, tests, build, CI workflow). No authentication,
no database, no CRUD, no integrations.

## Phase 2 — Authentication and sessions

Supabase development project setup. Supabase Auth integration with the
App Router (`@supabase/ssr`), session handling in middleware, sign-in
and sign-up flows, account recovery (password reset), and email
confirmation groundwork (Resend integration is deferred to Phase 9;
Supabase built-in messaging is used meanwhile). Protected shell: the
CRM route group becomes session-gated, with a real user profile menu.
No CRM tables yet.

## Phase 3 — Organizations and multi-tenancy

Organizations, memberships, invitations, roles, and permissions.
PostgreSQL Row Level Security policies on every tenant-sensitive table,
with tests that verify isolation across organizations and roles.
Workspace switcher, invitation flow, and role-based UI affordances.
Authorization remains enforced by RLS and server-side checks — never by
client-supplied identifiers.

## Phase 4 — Core CRM schema

Database schema for Leads, Contacts, Accounts, and Deals with foreign
keys, constraints, and RLS. Versioned, additive migrations under source
control. TypeScript types generated from the actual schema. No UI for
these records yet beyond schema readiness.

## Phase 5 — CRM records and pipeline

Record creation, editing, viewing, search, filtering, and pagination
for Leads, Contacts, Accounts, and Deals. Pipeline transitions and
lead conversion. Navigation items become real routes with real data.
The demonstration dashboard remains available behind a flag or is
superseded by live-data equivalents.

## Phase 6 — Activities, tasks, and data operations

Activities, tasks, notes, and timelines. Data import (CSV) and export.
Reusable, sortable data tables with saved views groundwork.

## Phase 7 — Reporting and forecasting

Reporting and dashboards on live data, forecasting, and multi-currency
support. The Overview dashboard graduates from demo data to computed
metrics.

## Phase 8 — Workflow automation

Workflow rules and automation builder, notifications, scheduled
execution, and automation run history.

## Phase 9 — Integrations and messaging

Mailbox integration, transactional email via Resend, calendars,
WhatsApp Business integration, and external APIs.

## Phase 10 — SaaS operations and production readiness

Subscriptions and billing, usage controls, operational monitoring,
advanced security review, performance hardening, and production
launch on Vercel.

## Sequencing rationale

Authentication precedes multi-tenancy so that sessions exist before
authorization decisions. Multi-tenancy precedes the CRM schema so that
RLS is a property of the data model from day one. The schema precedes
CRUD so that operations land on a reviewed foundation. Reporting,
automation, and integrations follow the core loop, because they only
create value once real records exist. Billing and production hardening
come last, when the product being sold is stable.
