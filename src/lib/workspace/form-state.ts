import type { WorkspaceFieldErrors } from "./validation";

/**
 * Shape exchanged between workspace server actions and `useActionState`
 * forms. Same conventions as the auth form state (lib/auth/form-state):
 * dependency-free so client components can import the type without
 * touching server-only code.
 */
export interface WorkspaceFormValues {
  /** Submitted workspace name, echoed back to re-seed the input. */
  workspaceName?: string;
  /** Submitted invitation email, echoed back to re-seed the input. */
  inviteEmail?: string;
  /** Submitted invitation role, echoed back to re-seed the select. */
  inviteRole?: string;
}

export interface WorkspaceFormState {
  /** Per-field validation messages (empty object = no field errors). */
  errors: WorkspaceFieldErrors;
  /**
   * Non-field error message, already safe for display.
   */
  formError?: string;
  /**
   * Submitted values echoed back on recoverable failures. React resets
   * uncontrolled inputs to their `defaultValue` after a server action
   * completes — without echoing, a validation or RPC failure would wipe
   * everything the user typed. Absent on success (fresh form).
   */
  values?: WorkspaceFormValues;
  /**
   * Success state replacing or augmenting the form. Carries no
   * sensitive data — never a raw invitation token.
   */
  success?: {
    title: string;
    description?: string;
  };
}

export const initialWorkspaceFormState: WorkspaceFormState = {
  errors: {},
};

/** Reads a trimmed string field from FormData. */
export function workspaceFormString(
  formData: FormData,
  key: string
): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
