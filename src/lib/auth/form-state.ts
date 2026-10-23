import type { FieldErrors } from "./validation";

/**
 * Shape exchanged between auth server actions and `useActionState` forms.
 * Kept in a dependency-free module so client components can import the
 * type without touching server-only code.
 */
export interface AuthFormState {
  /** Per-field validation messages (empty object = no field errors). */
  errors: FieldErrors;
  /** Non-field error message, already safe for display. */
  formError?: string;
  /**
   * Success state that replaces the form (e.g. "check your email").
   * Carries no sensitive data.
   */
  success?: {
    title: string;
    description: string;
  };
}

export const initialAuthFormState: AuthFormState = {
  errors: {},
};

/** Reads a trimmed string field from FormData. */
export function formString(
  formData: FormData,
  key: string
): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/** Reads an untrimmed string (passwords must not be trimmed). */
export function formPassword(formData: FormData, key = "password"): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
