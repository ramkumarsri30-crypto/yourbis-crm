/**
 * Sanitized server-side diagnostics for workspace operations.
 *
 * Production debugging rules (hotfix step 6):
 *   - Every expected failure is visible in the UI as a mapped, safe
 *     message (lib/workspace/errors) — never a blank page.
 *   - Server logs carry ENOUGH sanitized detail to diagnose: operation
 *     name, failure stage, a coarse status/SQLSTATE code, and a
 *     non-sensitive duration. NEVER logged: credentials, session
 *     tokens, invitation tokens (raw or hashed), recipient addresses,
 *     API keys, or raw database error messages (they can embed row
 *     data and SQL fragments).
 *   - Each logged failure gets a short random reference that is also
 *     appended to the user-facing message, so a user report can be
 *     correlated with the exact log line in Vercel's runtime logs
 *     without exposing anything sensitive.
 */

/** Where in an operation the failure happened (coarse by design). */
export type WorkspaceFailureStage =
  | "validation"
  | "rpc"
  | "db"
  | "email"
  | "membership-verification";

export interface WorkspaceFailureDetail {
  stage: WorkspaceFailureStage;
  /**
   * Coarse status only: a PostgreSQL SQLSTATE ("42501"), an HTTP status
   * number, or null when unknown. Raw error messages are deliberately
   * NOT accepted by this type.
   */
  code?: string | number | null;
  /** Wall-clock duration of the failed step, when measured. */
  durationMs?: number;
}

/**
 * Logs one sanitized failure line and returns a short reference for the
 * user-facing message (e.g. "a1b2c3d4"). The reference is random — it
 * carries no information about the request or its data.
 */
export function logWorkspaceFailure(
  operation: string,
  detail: WorkspaceFailureDetail
): string {
  const reference = randomReference();
  // One structured line; safe for Vercel runtime logs and any log
  // aggregator. No PII, no secrets, no raw driver messages.
  console.error(`workspace ${operation} failed`, {
    operation,
    stage: detail.stage,
    code: detail.code ?? null,
    durationMs: detail.durationMs ?? null,
    ref: reference,
  });
  return reference;
}

/** Appends a diagnostic reference to a safe user-facing message. */
export function withReference(message: string, reference: string): string {
  return `${message} (ref: ${reference})`;
}

/** Short, URL-safe, non-sequential reference id. */
function randomReference(): string {
  const uuid = crypto.randomUUID();
  return uuid.replace(/-/g, "").slice(0, 8);
}
