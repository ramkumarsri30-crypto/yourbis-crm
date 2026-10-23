/**
 * Maps database/PostgREST errors from workspace operations to safe,
 * user-presentable messages. Raw error objects can carry SQL details,
 * schema names, or row data — nothing beyond the mapped string is ever
 * shown or logged. Matching happens on stable PostgreSQL SQLSTATE
 * codes first; the accept flow additionally recognizes the fixed
 * message strings produced by our own RPCs (which are safe by
 * construction, but the mapping keeps the UI stable if they change).
 */

export type WorkspaceAction =
  | "create-workspace"
  | "rename-workspace"
  | "invite-member"
  | "resend-invitation"
  | "revoke-invitation"
  | "update-member-role"
  | "remove-member"
  | "accept-invitation";

export interface WorkspaceDbErrorLike {
  code?: string | null;
  message?: string | null;
}

/** Safe message templates per action (generic fallback). */
const GENERIC: Record<WorkspaceAction, string> = {
  "create-workspace": "Unable to create the workspace right now. Please try again.",
  "rename-workspace": "Unable to update the workspace right now. Please try again.",
  "invite-member": "Unable to send the invitation right now. Please try again.",
  "resend-invitation": "Unable to resend the invitation right now. Please try again.",
  "revoke-invitation": "Unable to revoke the invitation right now. Please try again.",
  "update-member-role": "Unable to update the role right now. Please try again.",
  "remove-member": "Unable to remove the member right now. Please try again.",
  "accept-invitation": "Unable to accept the invitation right now. Please try again.",
};

const PERMISSION: Record<WorkspaceAction, string> = {
  "create-workspace": "You cannot create a workspace right now.",
  "rename-workspace": "Only workspace owners and admins can rename the workspace.",
  "invite-member": "You do not have permission to invite members to this workspace.",
  "resend-invitation": "You do not have permission to manage invitations in this workspace.",
  "revoke-invitation": "You do not have permission to manage invitations in this workspace.",
  "update-member-role":
    "You cannot assign that role. Only owners manage admin roles, and nobody can change their own role.",
  "remove-member":
    "You cannot remove that member. Only owners and admins remove members, and the last owner is protected.",
  "accept-invitation": "You cannot accept this invitation.",
};

/** Fixed, safe messages emitted by the acceptance RPC (matched verbatim). */
const ACCEPT_MESSAGES = {
  notFound: "invitation not found, expired, or already used",
  emailMismatch: "this invitation was sent to a different email address",
  authentication: "authentication required",
} as const;

export function mapWorkspaceDbError(
  action: WorkspaceAction,
  error: WorkspaceDbErrorLike | null | undefined
): string {
  const code = error?.code ?? undefined;
  const message = error?.message ?? undefined;

  if (action === "accept-invitation" && message) {
    if (message === ACCEPT_MESSAGES.notFound) {
      return "This invitation is invalid, has expired, or was already used.";
    }
    if (message === ACCEPT_MESSAGES.emailMismatch) {
      return "This invitation was sent to a different email address. Sign in with the invited email to accept it.";
    }
  }

  switch (code) {
    case "42501":
      return PERMISSION[action];
    case "23505":
      return action === "invite-member"
        ? "A pending invitation for this email already exists. Revoke or resend it instead."
        : "That record already exists.";
    case "23514":
      return PERMISSION[action];
    case "22P02":
      return "That request was malformed. Refresh the page and try again.";
    default:
      return GENERIC[action];
  }
}

/** Whether an error looks like "Supabase is not configured" locally. */
export function isConfigurationError(error: unknown): boolean {
  return (
    error instanceof Error && error.name === "SupabaseNotConfiguredError"
  );
}
