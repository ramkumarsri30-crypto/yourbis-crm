import { describe, expect, it } from "vitest";

import {
  WORKSPACE_NAME_MAX_LENGTH,
  hasNoWorkspaceErrors,
  normalizeEmail,
  parseInviteRole,
  parseMemberRole,
  validateInviteEmail,
  validateInviteInput,
  validateInviteRole,
  validateMemberRole,
  validateWorkspaceName,
} from "@/lib/workspace/validation";

/**
 * Server-boundary validation: the same limits as the database CHECK
 * constraints (1–120 chars for names, 3–320 for emails, fixed role
 * sets). These tests pin the boundary so obviously-invalid input never
 * costs a database round trip.
 */
describe("workspace validation", () => {
  describe("validateWorkspaceName", () => {
    it("accepts a normal name", () => {
      expect(validateWorkspaceName("Acme Inc.")).toBeUndefined();
      expect(validateWorkspaceName("  Spaced Out  ")).toBeUndefined();
    });

    it("rejects empty and whitespace-only names", () => {
      expect(validateWorkspaceName("")).toBeDefined();
      expect(validateWorkspaceName("   ")).toBeDefined();
    });

    it("rejects names beyond the database limit", () => {
      const tooLong = "a".repeat(WORKSPACE_NAME_MAX_LENGTH + 1);
      expect(validateWorkspaceName(tooLong)).toBeDefined();
      // Exactly at the limit is fine (mirrors the CHECK constraint).
      expect(
        validateWorkspaceName("a".repeat(WORKSPACE_NAME_MAX_LENGTH))
      ).toBeUndefined();
    });

    it("rejects control characters", () => {
      expect(validateWorkspaceName("bad\u0000name")).toBeDefined();
      expect(validateWorkspaceName("bad\u007fname")).toBeDefined();
    });
  });

  describe("validateInviteEmail", () => {
    it("accepts plausible addresses", () => {
      expect(validateInviteEmail("teammate@company.com")).toBeUndefined();
      expect(validateInviteEmail("first.last+tag@sub.domain.org")).toBeUndefined();
    });

    it("rejects missing, malformed, and oversized addresses", () => {
      expect(validateInviteEmail("")).toBeDefined();
      expect(validateInviteEmail("   ")).toBeDefined();
      expect(validateInviteEmail("no-at-sign")).toBeDefined();
      expect(validateInviteEmail("a@b")).toBeDefined();
      expect(validateInviteEmail("a b@c.d")).toBeDefined();
      expect(validateInviteEmail(`${"a".repeat(316)}@x.io`)).toBeDefined();
    });
  });

  describe("validateInviteRole", () => {
    it("accepts the invitable roles and rejects owner", () => {
      expect(validateInviteRole("admin")).toBeUndefined();
      expect(validateInviteRole("member")).toBeUndefined();
      expect(validateInviteRole("viewer")).toBeUndefined();
      expect(validateInviteRole("owner")).toBeDefined();
      expect(validateInviteRole("")).toBeDefined();
      expect(validateInviteRole("CEO")).toBeDefined();
    });
  });

  describe("validateMemberRole", () => {
    it("accepts every role except owner", () => {
      expect(validateMemberRole("admin")).toBeUndefined();
      expect(validateMemberRole("member")).toBeUndefined();
      expect(validateMemberRole("viewer")).toBeUndefined();
      expect(validateMemberRole("owner")).toBeDefined();
      expect(validateMemberRole("supervisor")).toBeDefined();
    });
  });

  describe("validateInviteInput", () => {
    it("aggregates field errors", () => {
      const errors = validateInviteInput({ email: "nope", role: "owner" });
      expect(errors.inviteEmail).toBeDefined();
      expect(errors.inviteRole).toBeDefined();
      expect(hasNoWorkspaceErrors(errors)).toBe(false);
    });

    it("reports clean input as error-free", () => {
      const errors = validateInviteInput({
        email: "ok@company.com",
        role: "member",
      });
      expect(hasNoWorkspaceErrors(errors)).toBe(true);
    });
  });

  describe("normalizeEmail", () => {
    it("trims and lowercases, matching the citext column behavior", () => {
      expect(normalizeEmail("  Mixed.Case@Example.COM ")).toBe(
        "mixed.case@example.com"
      );
    });
  });

  describe("parse helpers", () => {
    it("parse valid roles and reject everything else", () => {
      expect(parseMemberRole("viewer")).toBe("viewer");
      expect(parseMemberRole("owner")).toBe("owner");
      expect(parseMemberRole("chief")).toBeNull();
      expect(parseInviteRole("admin")).toBe("admin");
      expect(parseInviteRole("owner")).toBeNull();
      expect(parseInviteRole("")).toBeNull();
    });
  });
});
