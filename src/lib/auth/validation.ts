/**
 * Input validation shared by browser forms and server actions.
 *
 * The same functions run on both sides deliberately: the browser gets
 * fast feedback, and the server action re-validates because client
 * validation is UX, not a security boundary (AGENTS.md rule 9).
 *
 * Limits match the current Supabase Auth defaults and are documented in
 * docs/SUPABASE_SETUP.md: minimum password length 8 (the project default,
 * configurable in the Supabase dashboard) and a 72-character bcrypt
 * ceiling enforced by the auth server.
 */

export type FieldErrors = Partial<
  Record<"email" | "password" | "confirmPassword" | "fullName", string>
>;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;
export const DISPLAY_NAME_MAX_LENGTH = 120;

/** Pragmatic email check: shape, not full RFC (the auth server re-validates). */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(value: string): string | undefined {
  const email = value.trim();
  if (!email) {
    return "Enter your email address.";
  }
  if (email.length > 320) {
    return "This email address is too long.";
  }
  if (!EMAIL_PATTERN.test(email)) {
    return "Enter a valid email address, like name@company.com.";
  }
  return undefined;
}

export function validatePassword(value: string): string | undefined {
  if (!value) {
    return "Enter a password.";
  }
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (value.length > PASSWORD_MAX_LENGTH) {
    return `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer.`;
  }
  return undefined;
}

export function validateConfirmPassword(
  password: string,
  confirm: string
): string | undefined {
  if (!confirm) {
    return "Confirm your password.";
  }
  if (password !== confirm) {
    return "Passwords do not match.";
  }
  return undefined;
}

export function validateFullName(value: string): string | undefined {
  const name = value.trim();
  if (!name) {
    return "Enter your full name.";
  }
  if (name.length > DISPLAY_NAME_MAX_LENGTH) {
    return `Name must be ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.`;
  }
  // Reject control characters (they cannot be a legitimate display name).
  if (/[\u0000-\u001f\u007f]/.test(name)) {
    return "Name contains invalid characters.";
  }
  return undefined;
}

export interface SignInInput {
  email: string;
  password: string;
}

export function validateSignInInput(input: SignInInput): FieldErrors {
  return {
    email: validateEmail(input.email),
    password: validatePassword(input.password),
  };
}

export interface SignUpInput {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export function validateSignUpInput(input: SignUpInput): FieldErrors {
  return {
    fullName: validateFullName(input.fullName),
    email: validateEmail(input.email),
    password: validatePassword(input.password),
    confirmPassword: validateConfirmPassword(
      input.password,
      input.confirmPassword
    ),
  };
}

export interface ResetPasswordInput {
  password: string;
  confirmPassword: string;
}

export function validateResetPasswordInput(input: ResetPasswordInput): FieldErrors {
  return {
    password: validatePassword(input.password),
    confirmPassword: validateConfirmPassword(
      input.password,
      input.confirmPassword
    ),
  };
}

/** True when a FieldErrors object carries no actual message. */
export function hasNoErrors(errors: FieldErrors): boolean {
  return Object.values(errors).every((message) => message === undefined);
}
