/**
 * Workspace roles and the permission matrix (Phase 3).
 *
 * The database is the authority for authorization (RLS policies, grants,
 * guard triggers, and the two audited RPCs — see
 * supabase/migrations/20261023000001_workspaces.sql). This module
 * mirrors the same matrix for two purposes only:
 *
 *   1. Rendering: deciding which controls to show. Hiding a control is
 *      UX, never security — every action re-authorizes server-side and
 *      the database re-enforces independently.
 *   2. Fast server-side pre-checks in actions, so obviously-unauthorized
 *      requests fail before any network round trip. The RLS check after
 *      them is what actually protects the data.
 *
 * The role displayed by the frontend is never proof of authorization.
 */

export const WORKSPACE_ROLES = ["owner", "admin", "member", "viewer"] as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

/** Roles that can appear on an invitation. `owner` is impossible by design. */
export const INVITABLE_ROLES = ["admin", "member", "viewer"] as const;

export type InvitableRole = (typeof INVITABLE_ROLES)[number];

/** Roles a user may hold in a workspace, as stored in the database. */
export function isWorkspaceRole(value: unknown): value is WorkspaceRole {
  return (
    typeof value === "string" &&
    (WORKSPACE_ROLES as readonly string[]).includes(value)
  );
}

export function isInvitableRole(value: unknown): value is InvitableRole {
  return (
    typeof value === "string" &&
    (INVITABLE_ROLES as readonly string[]).includes(value)
  );
}

/** Human label for display. */
export function workspaceRoleLabel(role: WorkspaceRole): string {
  switch (role) {
    case "owner":
      return "Owner";
    case "admin":
      return "Admin";
    case "member":
      return "Member";
    case "viewer":
      return "Viewer";
  }
}

/** One-line description used in tooltips and the team settings screen. */
export function workspaceRoleDescription(role: WorkspaceRole): string {
  switch (role) {
    case "owner":
      return "Full control, including admin invitations and admin roles.";
    case "admin":
      return "Invites members, manages roles up to member, removes members.";
    case "member":
      return "Works in the workspace; no team management.";
    case "viewer":
      return "Read-only access to the workspace.";
  }
}

/**
 * May `actorRole` invite a new member at `inviteRole`?
 *
 * Mirrors the `organization_invitations_insert_managers` policy:
 * owner/admin may invite; only owners may invite admins; `owner` can
 * never be invited (CHECK constraint in the database).
 */
export function canInviteRole(
  actorRole: WorkspaceRole,
  inviteRole: InvitableRole
): boolean {
  if (actorRole !== "owner" && actorRole !== "admin") {
    return false;
  }
  if (inviteRole === "admin") {
    return actorRole === "owner";
  }
  return true;
}

/**
 * May `actorRole` change another member's role to `targetRole`?
 *
 * Mirrors the `organization_memberships_update_roles` policy: managers
 * only; admins may assign member/viewer; owners additionally admin.
 * The `owner` role is unreachable via role change (guard trigger).
 */
export function canAssignRole(
  actorRole: WorkspaceRole,
  targetRole: WorkspaceRole
): boolean {
  if (actorRole !== "owner" && actorRole !== "admin") {
    return false;
  }
  if (targetRole === "owner") {
    return false;
  }
  if (targetRole === "admin") {
    return actorRole === "owner";
  }
  return true;
}

/** Roles the actor is allowed to pick from, for select inputs. */
export function assignableRolesFor(actorRole: WorkspaceRole): WorkspaceRole[] {
  return WORKSPACE_ROLES.filter((role) => canAssignRole(actorRole, role));
}

/** May the actor update workspace properties (name)? */
export function canManageWorkspace(actorRole: WorkspaceRole): boolean {
  return actorRole === "owner" || actorRole === "admin";
}

/** May the actor see and manage invitations (team settings)? */
export function canManageInvitations(actorRole: WorkspaceRole): boolean {
  return actorRole === "owner" || actorRole === "admin";
}

/** May the actor remove members? (Self-leave is a separate path.) */
export function canRemoveMember(actorRole: WorkspaceRole): boolean {
  return actorRole === "owner" || actorRole === "admin";
}
