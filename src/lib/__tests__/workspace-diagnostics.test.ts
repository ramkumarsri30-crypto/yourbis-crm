import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  logWorkspaceFailure,
  withReference,
} from "@/lib/workspace/diagnostics";

describe("workspace diagnostics", () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it("logs one sanitized line and returns a short reference", () => {
    const reference = logWorkspaceFailure("create-workspace", {
      stage: "rpc",
      code: "42501",
      durationMs: 42,
    });

    expect(reference).toMatch(/^[0-9a-f]{8}$/);
    expect(consoleError).toHaveBeenCalledTimes(1);

    const [message, payload] = consoleError.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(message).toBe("workspace create-workspace failed");
    expect(payload.operation).toBe("create-workspace");
    expect(payload.stage).toBe("rpc");
    expect(payload.code).toBe("42501");
    expect(payload.durationMs).toBe(42);
    expect(payload.ref).toBe(reference);
  });

  it("never includes raw error messages or secrets in the payload", () => {
    // The type forbids passing a message, but the contract is verified
    // here too: whatever lands in logs is only the fixed field set.
    logWorkspaceFailure("invite-member", { stage: "email", code: null });

    const payload = consoleError.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(Object.keys(payload).sort()).toEqual(
      ["code", "durationMs", "operation", "ref", "stage"].sort()
    );
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toMatch(/Bearer|sk-|re_[A-Za-z0-9]/i);
  });

  it("produces distinct references for distinct failures", () => {
    const first = logWorkspaceFailure("create-workspace", { stage: "rpc" });
    const second = logWorkspaceFailure("create-workspace", { stage: "rpc" });
    expect(first).not.toBe(second);
  });

  it("formats a user-facing message with the diagnostic reference", () => {
    expect(withReference("Unable to create the workspace.", "a1b2c3d4")).toBe(
      "Unable to create the workspace. (ref: a1b2c3d4)"
    );
  });
});
