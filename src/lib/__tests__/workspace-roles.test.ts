import { describe, expect, it } from "vitest";

import {
  INVITABLE_ROLES,
  WORKSPACE_ROLES,
  assignableRolesFor,
  canAssignRole,
  canInviteRole,
  canManageInvitations,
  canManageWorkspace,
  canRemoveMember,
  isInvitableRole,
  isWorkspaceRole,
  workspaceRoleDescription,
  workspaceRoleLabel,
  type WorkspaceRole,
} from "@/lib/workspace/roles";

/**
 * The permission matrix mirrors the database policies (see the
 * migration's authorization matrix). These tests pin the mirror so the
 * UI never shows a control the database would reject — and never hides
 * one the database would allow.
 */
describe("workspace roles", () => {
  describe("role sets", () => {
    it("exposes the four workspace roles in rank order", () => {
      expect([...WORKSPACE_ROLES]).toEqual([
        "owner",
        "admin",
        "member",
        "viewer",
      ]);
    });

    it("never allows inviting an owner", () => {
      expect(INVITABLE_ROLES).not.toContain("owner");
      expect([...INVITABLE_ROLES]).toEqual(["admin", "member", "viewer"]);
    });

    it("narrows unknown values", () => {
      expect(isWorkspaceRole("owner")).toBe(true);
      expect(isWorkspaceRole("superadmin")).toBe(false);
      expect(isWorkspaceRole("")).toBe(false);
      expect(isWorkspaceRole(null)).toBe(false);
      expect(isInvitableRole("member")).toBe(true);
      expect(isInvitableRole("owner")).toBe(false);
      expect(isInvitableRole("Admin")).toBe(false);
    });
  });

  describe("labels", () => {
    it("labels every role", () => {
      expect(workspaceRoleLabel("owner")).toBe("Owner");
      expect(workspaceRoleLabel("admin")).toBe("Admin");
      expect(workspaceRoleLabel("member")).toBe("Member");
      expect(workspaceRoleLabel("viewer")).toBe("Viewer");
    });

    it("describes every role without throwing", () => {
      for (const role of WORKSPACE_ROLES) {
        expect(workspaceRoleDescription(role).length).toBeGreaterThan(10);
      }
    });
  });

  describe("canInviteRole", () => {
    it("lets owners invite every invitable role", () => {
      for (const role of INVITABLE_ROLES) {
        expect(canInviteRole("owner", role)).toBe(true);
      }
    });

    it("lets admins invite members and viewers but not admins", () => {
      expect(canInviteRole("admin", "member")).toBe(true);
      expect(canInviteRole("admin", "viewer")).toBe(true);
      expect(canInviteRole("admin", "admin")).toBe(false);
    });

    it("rejects invitations from non-managers entirely", () => {
      expect(canInviteRole("member", "member")).toBe(false);
      expect(canInviteRole("viewer", "viewer")).toBe(false);
    });
  });

  describe("canAssignRole", () => {
    it("lets owners assign admin/member/viewer but never owner", () => {
      expect(canAssignRole("owner", "admin")).toBe(true);
      expect(canAssignRole("owner", "member")).toBe(true);
      expect(canAssignRole("owner", "viewer")).toBe(true);
      expect(canAssignRole("owner", "owner")).toBe(false);
    });

    it("lets admins assign member/viewer only", () => {
      expect(canAssignRole("admin", "member")).toBe(true);
      expect(canAssignRole("admin", "viewer")).toBe(true);
      expect(canAssignRole("admin", "admin")).toBe(false);
      expect(canAssignRole("admin", "owner")).toBe(false);
    });

    it("rejects role changes from non-managers", () => {
      expect(canAssignRole("member", "viewer")).toBe(false);
      expect(canAssignRole("viewer", "member")).toBe(false);
    });

    it("never allows assigning owner from any role", () => {
      const roles: WorkspaceRole[] = ["owner", "admin", "member", "viewer"];
      for (const actor of roles) {
        expect(canAssignRole(actor, "owner")).toBe(false);
      }
    });
  });

  describe("assignableRolesFor", () => {
    it("returns admin-capable options for owners only", () => {
      expect(assignableRolesFor("owner")).toEqual([
        "admin",
        "member",
        "viewer",
      ]);
      expect(assignableRolesFor("admin")).toEqual(["member", "viewer"]);
      expect(assignableRolesFor("member")).toEqual([]);
      expect(assignableRolesFor("viewer")).toEqual([]);
    });
  });

  describe("management flags", () => {
    it("grants workspace management to owners and admins only", () => {
      expect(canManageWorkspace("owner")).toBe(true);
      expect(canManageWorkspace("admin")).toBe(true);
      expect(canManageWorkspace("member")).toBe(false);
      expect(canManageWorkspace("viewer")).toBe(false);
    });

    it("grants invitation management to owners and admins only", () => {
      expect(canManageInvitations("owner")).toBe(true);
      expect(canManageInvitations("admin")).toBe(true);
      expect(canManageInvitations("member")).toBe(false);
      expect(canManageInvitations("viewer")).toBe(false);
    });

    it("grants member removal to owners and admins only", () => {
      expect(canRemoveMember("owner")).toBe(true);
      expect(canRemoveMember("admin")).toBe(true);
      expect(canRemoveMember("member")).toBe(false);
      expect(canRemoveMember("viewer")).toBe(false);
    });
  });
});
