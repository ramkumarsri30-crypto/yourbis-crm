import { describe, expect, it } from "vitest";

import type { WorkspaceSummary } from "@/lib/workspace/context";
import {
  defaultWorkspaceName,
  needsDefaultWorkspace,
} from "@/lib/workspace/ensure-default";

/**
 * Default-workspace provisioning rules (Phase 3 follow-up): every
 * account must end up owning one workspace. The check is ownership
 * (role = owner), not mere membership — invited members still get
 * their own.
 */
function ws(id: string, role: WorkspaceSummary["role"]): WorkspaceSummary {
  return { id, name: id, role };
}

describe("needsDefaultWorkspace", () => {
  it("is true for an empty membership list (fresh account)", () => {
    expect(needsDefaultWorkspace([])).toBe(true);
  });

  it("is true when the account only holds invited memberships", () => {
    expect(needsDefaultWorkspace([ws("a", "admin"), ws("b", "member"), ws("c", "viewer")])).toBe(true);
  });

  it("is false as soon as one owned workspace exists", () => {
    expect(needsDefaultWorkspace([ws("a", "member"), ws("b", "owner")])).toBe(false);
    expect(needsDefaultWorkspace([ws("a", "owner")])).toBe(false);
  });
});

describe("defaultWorkspaceName", () => {
  it("derives from the first word of the display name", () => {
    expect(defaultWorkspaceName("Alex Morgan")).toBe("Alex's Workspace");
  });

  it("uses a single-word display name as-is", () => {
    expect(defaultWorkspaceName("Sam")).toBe("Sam's Workspace");
  });

  it("trims surrounding whitespace before deriving", () => {
    expect(defaultWorkspaceName("  Priya  Sharma ")).toBe("Priya's Workspace");
  });

  it("falls back to the generic name for null/empty/blank names", () => {
    expect(defaultWorkspaceName(null)).toBe("My Workspace");
    expect(defaultWorkspaceName("")).toBe("My Workspace");
    expect(defaultWorkspaceName("   ")).toBe("My Workspace");
  });

  it("falls back when the derived name would fail validation", () => {
    // 120-char limit: a 130-char first word cannot produce a valid name.
    expect(defaultWorkspaceName("x".repeat(130))).toBe("My Workspace");
  });

  it("always produces a value the workspace-name validator accepts", () => {
    expect(defaultWorkspaceName("Alex")).toBe("Alex's Workspace");
    expect(defaultWorkspaceName(null)).toBe("My Workspace");
  });
});
