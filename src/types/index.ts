/**
 * Domain types for CRM Workspace demonstration data.
 *
 * These types currently describe the mock dataset in
 * `src/lib/demo-data.ts`. In Phase 4+ they will be replaced by types
 * generated from the actual PostgreSQL schema (see
 * docs/ENGINEERING_STANDARDS.md). Keeping them centralized now means the
 * future swap is a single-file change for consumers.
 */

/* ------------------------------------------------------------------ */
/* Shared                                                              */
/* ------------------------------------------------------------------ */

/** Direction of a metric trend, used only for arrow icon selection. */
export type TrendDirection = "up" | "down";

/**
 * How a trend should be interpreted. A rising number is not always good
 * (e.g. more overdue tasks), so the semantics are explicit rather than
 * inferred from the direction.
 */
export type TrendSemantics = "positive" | "negative" | "neutral";

export interface KpiTrend {
  direction: TrendDirection;
  semantics: TrendSemantics;
  /** Formatted delta, e.g. "+7.4%". */
  value: string;
  /** What the delta is measured against, e.g. "vs previous period". */
  label: string;
}

/* ------------------------------------------------------------------ */
/* Key performance indicators                                          */
/* ------------------------------------------------------------------ */

export type KpiId =
  | "total-leads"
  | "open-deals"
  | "weighted-pipeline"
  | "tasks-due";

export interface KpiMetric {
  id: KpiId;
  label: string;
  /** Raw numeric value; formatting happens at the presentation edge. */
  value: number;
  description: string;
  trend?: KpiTrend;
}

/* ------------------------------------------------------------------ */
/* Pipeline                                                            */
/* ------------------------------------------------------------------ */

export type PipelineStageId =
  | "new"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "closed-won";

export interface PipelineStage {
  id: PipelineStageId;
  label: string;
  /** Number of deals currently in this stage. */
  dealCount: number;
  /** Total value of deals in this stage, in USD. */
  value: number;
  /** Illustrative win likelihood used to derive weighted pipeline value. */
  winLikelihood: number;
}

/* ------------------------------------------------------------------ */
/* Leads                                                               */
/* ------------------------------------------------------------------ */

export type LeadStatus = "new" | "working" | "qualified" | "unresponsive";

export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  source: string;
  status: LeadStatus;
  /** ISO 8601 timestamp (UTC). */
  createdAt: string;
  owner: string;
}

/* ------------------------------------------------------------------ */
/* Activity feed                                                       */
/* ------------------------------------------------------------------ */

export type ActivityType =
  | "lead-created"
  | "deal-updated"
  | "follow-up-scheduled"
  | "contact-added"
  | "call-logged"
  | "note-added";

export interface Activity {
  id: string;
  type: ActivityType;
  /** Primary summary, e.g. "New lead created". */
  title: string;
  /** Secondary context, e.g. "Amara Osei · Northwind Logistics". */
  detail: string;
  /** ISO 8601 timestamp (UTC). */
  timestamp: string;
}

/* ------------------------------------------------------------------ */
/* Tasks                                                               */
/* ------------------------------------------------------------------ */

export type TaskStatus = "overdue" | "today" | "upcoming";

export interface Task {
  id: string;
  title: string;
  /** What the task relates to, e.g. "Deal · Vertex expansion". */
  relatedTo: string;
  /** ISO 8601 timestamp (UTC). */
  dueAt: string;
  status: TaskStatus;
}

/* ------------------------------------------------------------------ */
/* Demo user / workspace placeholders                                  */
/* ------------------------------------------------------------------ */

export interface DemoUser {
  name: string;
  email: string;
  initials: string;
}

export interface DemoWorkspace {
  name: string;
  plan: string;
}
