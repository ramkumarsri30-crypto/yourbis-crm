import { describe, expect, it } from "vitest";

import { resolveActiveWorkspace, type WorkspaceSummary } from "@/lib/workspace/context";

/**
 * The active-workspace cookie is a UI preference, never an
 * authorization. These tests pin the resolution rules: only a cookie
 * naming a VERIFIED membership wins; anything else falls back to the
 * first membership; an empty list has no active workspace.
 */
function ws(id: string, name = id): WorkspaceSummary {
  return { id, name, role: "member" };
}

describe("resolveActiveWorkspace", () => {
  it("returns null when the user belongs to no workspace", () => {
    expect(resolveActiveWorkspace([], undefined)).toBeNull();
    expect(resolveActiveWorkspace([], "some-id")).toBeNull();
  });

  it("prefers the cookie when it names a verified membership", () => {
    const workspaces = [ws("a"), ws("b"), ws("c")];
    expect(resolveActiveWorkspace(workspaces, "b")).toEqual(ws("b"));
  });

  it("falls back to the first membership for a foreign cookie value", () => {
    const workspaces = [ws("a"), ws("b")];
    expect(resolveActiveWorkspace(workspaces, "not-a-member")).toEqual(ws("a"));
  });

  it("falls back for empty, stale, and malformed cookie values", () => {
    const workspaces = [ws("a"), ws("b")];
    expect(resolveActiveWorkspace(workspaces, "")).toEqual(ws("a"));
    expect(resolveActiveWorkspace(workspaces, null)).toEqual(ws("a"));
    expect(resolveActiveWorkspace(workspaces, undefined)).toEqual(ws("a"));
  });

  it("never lets a cookie alone conjure a workspace that is not in the list", () => {
    const workspaces = [ws("a")];
    const result = resolveActiveWorkspace(workspaces, "z");
    expect(result).toEqual(ws("a"));
    expect(result?.id).not.toBe("z");
  });
});
