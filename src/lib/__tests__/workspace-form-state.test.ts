import { describe, expect, it } from "vitest";

import {
  initialWorkspaceFormState,
  workspaceFormString,
  type WorkspaceFormState,
} from "@/lib/workspace/form-state";
import { hasNoWorkspaceErrors } from "@/lib/workspace/validation";

describe("workspace form state", () => {
  it("starts with no errors, no values, and no success", () => {
    expect(initialWorkspaceFormState).toEqual({ errors: {} });
    expect(initialWorkspaceFormState.formError).toBeUndefined();
    expect(initialWorkspaceFormState.values).toBeUndefined();
    expect(initialWorkspaceFormState.success).toBeUndefined();
    expect(hasNoWorkspaceErrors(initialWorkspaceFormState.errors)).toBe(true);
  });

  it("can echo submitted values back for input preservation", () => {
    // Recoverable failures must carry the submitted values so the form
    // can re-seed its inputs after React's post-action reset.
    const state: WorkspaceFormState = {
      errors: {},
      values: { workspaceName: "Acme", inviteEmail: "a@b.co", inviteRole: "member" },
    };
    expect(state.values?.workspaceName).toBe("Acme");
    expect(state.values?.inviteEmail).toBe("a@b.co");
    expect(state.values?.inviteRole).toBe("member");
  });

  it("reads trimmed string fields from FormData", () => {
    const formData = new FormData();
    formData.set("workspaceName", "  Acme  ");
    formData.set("inviteEmail", "teammate@company.com");
    formData.set("inviteRole", " member ");

    expect(workspaceFormString(formData, "workspaceName")).toBe("Acme");
    expect(workspaceFormString(formData, "inviteEmail")).toBe(
      "teammate@company.com"
    );
    expect(workspaceFormString(formData, "inviteRole")).toBe("member");
  });

  it("returns an empty string for missing and non-string values", () => {
    const formData = new FormData();
    formData.set("aFile", new File([], "x.txt"));
    expect(workspaceFormString(formData, "missing")).toBe("");
    expect(workspaceFormString(formData, "aFile")).toBe("");
  });
});
