import type { SupabaseClient } from "@supabase/supabase-js";

import { listMyWorkspaces, type WorkspaceSummary } from "./context";
import { logWorkspaceFailure } from "./diagnostics";
import { validateWorkspaceName } from "./validation";

/**
 * Default personal workspace provisioning (Phase 3 follow-up).
 *
 * Product rule: every account ends up owning exactly one "home"
 * workspace — created automatically on first entry into the app —
 * alongside any workspaces they were invited to. Roles in each
 * workspace are independent: being a viewer in an invited workspace
 * never limits the account's own workspace, where they are the owner.
 *
 * Implementation notes:
 *   - Uses the same audited `create_organization` RPC as the manual
 *     flow (organization + owner membership atomically); no privileged
 *     client, no direct table writes, nothing new granted.
 *   - Idempotent CHECK-then-create: the check is a scan of the
 *     per-request-cached membership list (zero extra database reads
 *     once the account owns a workspace).
 *   - `listMyWorkspaces` is wrapped in React `cache()` and therefore
 *     will NOT re-query within the same request after creation — the
 *     verified entry is synthesized from the RPC's return value, and
 *     the next request reads the real membership list.
 *   - Failures degrade gracefully: the caller keeps the previous list
 *     (the user lands in onboarding if they had nothing) and the
 *     sanitized diagnostic trail gets a log line with a reference id.
 */

/** True when the account owns no workspace and should get its default. */
export function needsDefaultWorkspace(
  workspaces: readonly WorkspaceSummary[]
): boolean {
  return !workspaces.some((workspace) => workspace.role === "owner");
}

/**
 * Human default name from the account's display name ("Alex" →
 * "Alex's Workspace"), falling back to "My Workspace" when no usable
 * name exists or the candidate would fail validation.
 */
export function defaultWorkspaceName(displayName: string | null): string {
  const firstWord = displayName?.trim().split(/\s+/)[0];
  if (firstWord) {
    const candidate = `${firstWord}'s Workspace`;
    if (!validateWorkspaceName(candidate)) {
      return candidate;
    }
  }
  return "My Workspace";
}

/**
 * Ensures the caller owns at least one workspace, creating the default
 * when not. Returns the (possibly extended) verified workspace list —
 * active-workspace resolution stays with the caller.
 */
export async function ensureDefaultWorkspace(
  supabase: SupabaseClient,
  owner: { displayName?: string | null }
): Promise<WorkspaceSummary[]> {
  const workspaces = await listMyWorkspaces(supabase);
  if (!needsDefaultWorkspace(workspaces)) {
    return workspaces;
  }

  const name = defaultWorkspaceName(owner.displayName ?? null);
  const startedAt = Date.now();
  const { data: organizationId, error } = await supabase.rpc(
    "create_organization",
    { p_name: name }
  );

  if (error || typeof organizationId !== "string") {
    logWorkspaceFailure("ensure-default-workspace", {
      stage: "rpc",
      code: error?.code ?? null,
      durationMs: Date.now() - startedAt,
    });
    // Degrade: the caller keeps the previous list. A user with zero
    // workspaces lands in onboarding, whose create form surfaces real
    // errors; a user with invited workspaces simply continues.
    return workspaces;
  }

  // The per-request cache cannot refresh inside this request; the
  // synthesized entry carries exactly what the RPC created (the id it
  // returned, the name we passed, owner — the only role the RPC grants).
  return [
    ...workspaces,
    { id: organizationId, name, role: "owner" as const },
  ];
}
