import type { WorkspaceFieldErrors } from "./validation";

/**
 * Shape exchanged between workspace server actions and `useActionState`
 * forms. Same conventions as the auth form state (lib/auth/form-state):
 * dependency-free so client components can import the type without
 * touching server-only code.
 */
export interface WorkspaceFormState {
  /** Per-field validation messages (empty object = no field errors). */
  errors: WorkspaceFieldErrors;
  /** Non-field error message, already safe for display. */
  formError?: string;
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
