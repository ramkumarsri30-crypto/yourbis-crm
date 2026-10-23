import type { InvitableRole, WorkspaceRole } from "./roles";

/**
 * Dependency-free view types shared by server components, client
 * components, and tests. No database shapes leak through these —
 * queries.ts maps rows into these views.
 */

export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";

/** One row of the member directory (team settings). */
export interface MemberView {
  membershipId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
  displayName: string | null;
}

/** One row of the invitation list (team settings, managers only). */
export interface InvitationView {
  id: string;
  invitedEmail: string;
  role: InvitableRole;
  status: InvitationStatus;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}
