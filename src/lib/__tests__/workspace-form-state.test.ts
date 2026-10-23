import { describe, expect, it } from "vitest";

import {
  initialWorkspaceFormState,
  workspaceFormString,
} from "@/lib/workspace/form-state";
import { hasNoWorkspaceErrors } from "@/lib/workspace/validation";

describe("workspace form state", () => {
  it("starts with no errors and no success", () => {
    expect(initialWorkspaceFormState).toEqual({ errors: {} });
    expect(initialWorkspaceFormState.formError).toBeUndefined();
    expect(initialWorkspaceFormState.success).toBeUndefined();
    expect(hasNoWorkspaceErrors(initialWorkspaceFormState.errors)).toBe(true);
  });

  it("reads trimmed string fields from FormData", () => {
    const formData = new FormData();
    formData.set("workspaceName", "  Acme  ");
    formData.set("inviteEmail", "teammate@company.com");
    formData.set("inviteRole", " member ");
    formData.set("ignoredNumber", "42");

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
