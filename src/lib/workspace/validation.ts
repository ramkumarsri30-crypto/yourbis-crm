import {
  isInvitableRole,
  isWorkspaceRole,
  type InvitableRole,
  type WorkspaceRole,
} from "./roles";

/**
 * Server-side validation for workspace forms and actions. Mirrors the
 * database constraints (see the migration): the browser's checks are UX,
 * the action re-validates here, and the database CHECK constraints are
 * the final authority.
 */

export const WORKSPACE_NAME_MIN_LENGTH = 1;
export const WORKSPACE_NAME_MAX_LENGTH = 120;

export type WorkspaceFieldErrors = Partial<
  Record<"workspaceName" | "inviteEmail" | "inviteRole" | "memberRole", string>
>;

/** Workspace display name — same limits as the organizations.name CHECK. */
export function validateWorkspaceName(value: string): string | undefined {
  const name = value.trim();
  if (!name) {
    return "Enter a workspace name.";
  }
  if (name.length < WORKSPACE_NAME_MIN_LENGTH) {
    return "Enter a workspace name.";
  }
  if (name.length > WORKSPACE_NAME_MAX_LENGTH) {
    return `Workspace name must be ${WORKSPACE_NAME_MAX_LENGTH} characters or fewer.`;
  }
  // Reject control characters (cannot be a legitimate name).
  if (/[\u0000-\u001f\u007f]/.test(name)) {
    return "Workspace name contains invalid characters.";
  }
  return undefined;
}

/** Invited email — shape check; normalization happens separately. */
export function validateInviteEmail(value: string): string | undefined {
  const email = value.trim();
  if (!email) {
    return "Enter the teammate's email address.";
  }
  if (email.length > 320) {
    return "This email address is too long.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Enter a valid email address, like name@company.com.";
  }
  return undefined;
}

/** Invitation role — must be one of the invitable roles (never "owner"). */
export function validateInviteRole(value: string): string | undefined {
  if (!isInvitableRole(value)) {
    return "Choose a role for the invitation.";
  }
  return undefined;
}

/** Membership role change — any workspace role except owner. */
export function validateMemberRole(value: string): string | undefined {
  if (!isWorkspaceRole(value) || value === "owner") {
    return "Choose a valid role.";
  }
  return undefined;
}

export interface InviteInput {
  email: string;
  role: string;
}

export function validateInviteInput(input: InviteInput): WorkspaceFieldErrors {
  return {
    inviteEmail: validateInviteEmail(input.email),
    inviteRole: validateInviteRole(input.role),
  };
}

/** True when a WorkspaceFieldErrors object carries no actual message. */
export function hasNoWorkspaceErrors(errors: WorkspaceFieldErrors): boolean {
  return Object.values(errors).every((message) => message === undefined);
}

/**
 * Normalizes an email for invitations: trimmed and lowercased. The
 * database column is citext (case-insensitive); normalizing here keeps
 * the duplicate-pending check and the email-match verification aligned
 * regardless of the input's case.
 */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** Parses a member-role form value into a role, or null when invalid. */
export function parseMemberRole(value: string): WorkspaceRole | null {
  return isWorkspaceRole(value) ? value : null;
}

/** Parses an invitation-role form value, or null when invalid. */
export function parseInviteRole(value: string): InvitableRole | null {
  return isInvitableRole(value) ? value : null;
}
