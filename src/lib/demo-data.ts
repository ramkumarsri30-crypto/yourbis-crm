/**
 * ─────────────────────────────────────────────────────────────────────
 * DEMONSTRATION DATA ONLY
 * ─────────────────────────────────────────────────────────────────────
 * Everything in this module is hand-authored sample content for the
 * Phase 1 dashboard. Nothing here comes from a live CRM database, and no
 * trend has been calculated from real business activity.
 *
 * This module must remain presentation-free (no JSX, no formatting) so it
 * can be replaced wholesale by real data access in Phase 5 without
 * touching components. See docs/ARCHITECTURE.md.
 *
 * Timestamps are fixed ISO 8601 strings in UTC so rendering is
 * deterministic across environments.
 */

import type {
  Activity,
  DemoUser,
  DemoWorkspace,
  KpiMetric,
  Lead,
  PipelineStage,
  Task,
} from "@/types";

/* ------------------------------------------------------------------ */
/* User & workspace placeholders                                       */
/* ------------------------------------------------------------------ */

export const DEMO_USER: DemoUser = {
  name: "Demo User",
  email: "demo.user@example.com",
  initials: "DU",
};

export const DEMO_WORKSPACE: DemoWorkspace = {
  name: "Acme Demo Workspace",
  plan: "Demo plan · 1 seat",
};

/* ------------------------------------------------------------------ */
/* Key performance indicators                                          */
/* ------------------------------------------------------------------ */

export const DEMO_KPIS: readonly KpiMetric[] = [
  {
    id: "total-leads",
    label: "Total leads",
    value: 348,
    description: "24 added this month",
    trend: {
      direction: "up",
      semantics: "positive",
      value: "+7.4%",
      label: "vs previous period",
    },
  },
  {
    id: "open-deals",
    label: "Open deals",
    value: 42,
    description: "Across 4 active stages",
    trend: {
      direction: "up",
      semantics: "positive",
      value: "+5.0%",
      label: "vs previous period",
    },
  },
  {
    id: "weighted-pipeline",
    label: "Weighted pipeline",
    value: 589575,
    description: "By stage win likelihood",
    trend: {
      direction: "up",
      semantics: "positive",
      value: "+12.1%",
      label: "vs previous period",
    },
  },
  {
    id: "tasks-due",
    label: "Tasks due",
    value: 8,
    description: "3 overdue · 5 due today",
    trend: {
      direction: "up",
      semantics: "negative",
      value: "+2",
      label: "vs yesterday",
    },
  },
] as const;

/* ------------------------------------------------------------------ */
/* Pipeline stages                                                     */
/* ------------------------------------------------------------------ */

/**
 * Open pipeline stages plus "Closed won" for context. `winLikelihood`
 * values are illustrative and are what the weighted pipeline KPI is
 * derived from (open stages only).
 */
export const DEMO_PIPELINE_STAGES: readonly PipelineStage[] = [
  {
    id: "new",
    label: "New",
    dealCount: 16,
    value: 372000,
    winLikelihood: 0.1,
  },
  {
    id: "qualified",
    label: "Qualified",
    dealCount: 12,
    value: 468500,
    winLikelihood: 0.3,
  },
  {
    id: "proposal",
    label: "Proposal",
    dealCount: 8,
    value: 354000,
    winLikelihood: 0.55,
  },
  {
    id: "negotiation",
    label: "Negotiation",
    dealCount: 6,
    value: 289500,
    winLikelihood: 0.75,
  },
  {
    id: "closed-won",
    label: "Closed won",
    dealCount: 3,
    value: 196000,
    winLikelihood: 1,
  },
] as const;

/** Stage ids that count toward the open pipeline. */
export const OPEN_STAGE_IDS: readonly PipelineStage["id"][] = [
  "new",
  "qualified",
  "proposal",
  "negotiation",
] as const;

/* ------------------------------------------------------------------ */
/* Recent leads                                                        */
/* ------------------------------------------------------------------ */

export const DEMO_LEADS: readonly Lead[] = [
  {
    id: "lead-001",
    name: "Amara Osei",
    company: "Northwind Logistics",
    email: "amara.osei@northwindlogistics.com",
    source: "Webinar",
    status: "qualified",
    createdAt: "2026-10-23T09:42:00Z",
    owner: "S. Chen",
  },
  {
    id: "lead-002",
    name: "Daniel Whitfield",
    company: "Bluepeak Realty",
    email: "d.whitfield@bluepeakrealty.com",
    source: "Referral",
    status: "working",
    createdAt: "2026-10-22T15:10:00Z",
    owner: "M. Alvarez",
  },
  {
    id: "lead-003",
    name: "Priya Raghavan",
    company: "Skylark Dental Group",
    email: "priya@skylarkdental.com",
    source: "Website",
    status: "new",
    createdAt: "2026-10-21T13:05:00Z",
    owner: "S. Chen",
  },
  {
    id: "lead-004",
    name: "Tomás Herrera",
    company: "Herrera & Partners",
    email: "tomas@herrerapartners.com",
    source: "LinkedIn",
    status: "working",
    createdAt: "2026-10-21T10:24:00Z",
    owner: "J. Novak",
  },
  {
    id: "lead-005",
    name: "Grace Kim",
    company: "Vertex Learning",
    email: "grace.kim@vertexlearning.io",
    source: "Trade show",
    status: "qualified",
    createdAt: "2026-10-20T16:48:00Z",
    owner: "M. Alvarez",
  },
  {
    id: "lead-006",
    name: "Robert Ellison",
    company: "Ellison Fabrication",
    email: "rob@ellisonfab.com",
    source: "Cold call",
    status: "unresponsive",
    createdAt: "2026-10-19T11:32:00Z",
    owner: "J. Novak",
  },
] as const;

/* ------------------------------------------------------------------ */
/* Recent activity                                                     */
/* ------------------------------------------------------------------ */

export const DEMO_ACTIVITIES: readonly Activity[] = [
  {
    id: "activity-001",
    type: "lead-created",
    title: "New lead created",
    detail: "Amara Osei · Northwind Logistics",
    timestamp: "2026-10-23T09:42:00Z",
  },
  {
    id: "activity-002",
    type: "deal-updated",
    title: "Deal moved to Negotiation",
    detail: "Vertex platform expansion · $118,500",
    timestamp: "2026-10-23T08:15:00Z",
  },
  {
    id: "activity-003",
    type: "follow-up-scheduled",
    title: "Follow-up scheduled",
    detail: "Bluepeak Realty · pricing review",
    timestamp: "2026-10-22T16:20:00Z",
  },
  {
    id: "activity-004",
    type: "contact-added",
    title: "Contact added",
    detail: "Grace Kim · Vertex Learning",
    timestamp: "2026-10-22T14:05:00Z",
  },
  {
    id: "activity-005",
    type: "call-logged",
    title: "Call logged",
    detail: "Discovery call · Skylark Dental Group",
    timestamp: "2026-10-22T11:30:00Z",
  },
  {
    id: "activity-006",
    type: "note-added",
    title: "Note added",
    detail: "Herrera & Partners requires multi-year terms",
    timestamp: "2026-10-21T17:45:00Z",
  },
] as const;

/* ------------------------------------------------------------------ */
/* Upcoming tasks                                                      */
/* ------------------------------------------------------------------ */

export const DEMO_TASKS: readonly Task[] = [
  {
    id: "task-001",
    title: "Send proposal to Vertex Learning",
    relatedTo: "Deal · Vertex expansion",
    dueAt: "2026-10-23T14:00:00Z",
    status: "today",
  },
  {
    id: "task-002",
    title: "Prepare pricing sheet for Bluepeak Realty",
    relatedTo: "Lead · Bluepeak Realty",
    dueAt: "2026-10-22T17:00:00Z",
    status: "overdue",
  },
  {
    id: "task-003",
    title: "Confirm demo environment for Skylark Dental",
    relatedTo: "Contact · Priya Raghavan",
    dueAt: "2026-10-23T16:30:00Z",
    status: "today",
  },
  {
    id: "task-004",
    title: "Follow up on multi-year terms",
    relatedTo: "Deal · Herrera retainer",
    dueAt: "2026-10-24T10:00:00Z",
    status: "upcoming",
  },
  {
    id: "task-005",
    title: "Draft quarterly pipeline review notes",
    relatedTo: "Internal · Sales team",
    dueAt: "2026-10-25T09:00:00Z",
    status: "upcoming",
  },
] as const;
