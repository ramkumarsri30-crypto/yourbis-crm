import { describe, expect, it } from "vitest";

import { mapWorkspaceDbError } from "@/lib/workspace/errors";

/**
 * Raw PostgREST/PG errors can carry SQL details and schema names — the
 * mapper must reduce everything to safe, pre-written messages keyed by
 * stable SQLSTATE codes, with the acceptance RPC's fixed messages
 * recognized verbatim.
 */
describe("mapWorkspaceDbError", () => {
  it("maps permission denials per action", () => {
    const message = mapWorkspaceDbError("invite-member", { code: "42501" });
    expect(message).toContain("permission");
  });

  it("maps guard-trigger violations (check constraint) as permission issues", () => {
    const message = mapWorkspaceDbError("update-member-role", {
      code: "23514",
    });
    expect(message).toContain("role");
  });

  it("maps duplicate pending invitations distinctly for invites", () => {
    const invite = mapWorkspaceDbError("invite-member", { code: "23505" });
    expect(invite).toContain("pending invitation");
    const other = mapWorkspaceDbError("accept-invitation", { code: "23505" });
    expect(other).not.toContain("pending invitation");
  });

  it("recognizes the acceptance RPC's fixed messages verbatim", () => {
    const notFound = mapWorkspaceDbError("accept-invitation", {
      message: "invitation not found, expired, or already used",
    });
    expect(notFound).toContain("invalid, has expired, or was already used");

    const mismatch = mapWorkspaceDbError("accept-invitation", {
      message: "this invitation was sent to a different email address",
    });
    expect(mismatch).toContain("different email address");
  });

  it("falls back to a generic, safe message for unknown codes and raw details", () => {
    const message = mapWorkspaceDbError("create-workspace", {
      code: "XX999",
      message: "schema public: relation organizations: SNAPSHOT TOO OLD",
    });
    expect(message).not.toContain("public");
    expect(message).not.toContain("SNAPSHOT");
    expect(message.length).toBeGreaterThan(10);
  });

  it("handles a null error object without throwing", () => {
    expect(
      typeof mapWorkspaceDbError("remove-member", null)
    ).toBe("string");
  });
});
