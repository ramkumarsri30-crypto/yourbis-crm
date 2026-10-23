/**
 * Maps Supabase Auth errors to safe, user-presentable messages.
 *
 * Raw provider errors can leak implementation details (internal codes,
 * whether an account exists, provider configuration). Nothing from
 * `error.message` is ever shown or logged. We match on stable `code`
 * values and the HTTP status, with a deliberately generic default.
 *
 * Server-side diagnostics (logAuthFailure): expected failures are
 * visible in the UI as mapped messages, while the server log carries
 * enough SANITIZED detail to diagnose — action name, coarse status,
 * stable code, and a random reference id that is appended to the
 * user-facing message so a report can be correlated with the exact
 * Vercel log line. NEVER logged: emails, passwords, names, raw
 * provider messages (they can embed configuration detail).
 */

export type AuthAction =
  | "sign-in"
  | "sign-up"
  | "forgot-password"
  | "reset-password";

export interface SafeAuthError {
  /** Field the error relates to, when known (used for inline display). */
  field?: "email" | "password" | "form";
  /** Safe, user-facing message. Never contains internals. */
  message: string;
}

/** Stable message templates per action. */
const MESSAGES: Record<AuthAction, { generic: string }> = {
  "sign-in": {
    generic: "Unable to sign in. Check your email and password, then try again.",
  },
  "sign-up": {
    generic: "Unable to create your account. Please try again.",
  },
  "forgot-password": {
    generic: "Unable to send a recovery email right now. Please try again.",
  },
  "reset-password": {
    generic: "Unable to update your password. Please try again.",
  },
};

/**
 * Maps a Supabase auth error (as returned by the client library) to a
 * safe message. `raw` is typed loosely on purpose: only `code`, `status`,
 * and `message` are inspected, and `message` is used solely as a last
 * resort for known-value matching — never surfaced.
 */
export function mapAuthError(
  action: AuthAction,
  raw: { code?: string | null; status?: number | null; message?: string | null } | null | undefined
): SafeAuthError {
  const code = raw?.code ?? undefined;
  const status = raw?.status ?? undefined;

  // Rate limiting — same message regardless of which limit tripped.
  if (
    code === "over_request_rate_limit" ||
    code === "over_email_send_rate_limit" ||
    code === "over_sms_send_rate_limit" ||
    status === 429
  ) {
    return {
      field: "form",
      message: "Too many attempts. Please wait a minute and try again.",
    };
  }

  switch (action) {
    case "sign-in": {
      if (code === "invalid_credentials" || status === 400) {
        // Deliberately identical for unknown email vs. wrong password.
        return {
          field: "form",
          message: "Incorrect email or password.",
        };
      }
      if (code === "email_not_confirmed") {
        return {
          field: "form",
          message:
            "Please confirm your email address first — check your inbox for the verification link.",
        };
      }
      if (code === "user_banned") {
        return { field: "form", message: "This account has been suspended." };
      }
      return { field: "form", message: MESSAGES[action].generic };
    }

    case "sign-up": {
      if (
        code === "user_already_exists" ||
        code === "email_exists" ||
        status === 422
      ) {
        return {
          field: "email",
          message:
            "An account with this email already exists. Try signing in instead.",
        };
      }
      if (code === "weak_password") {
        return {
          field: "password",
          message: "Please choose a stronger password.",
        };
      }
      if (code === "user_banned") {
        return { field: "form", message: "This account has been suspended." };
      }
      // Known-value match, last resort: the auth server rejects the
      // email-confirmation redirect when this deployment's address is
      // not on the project's allowlist (Supabase Auth → URL
      // Configuration). The fixed message never reflects the raw text
      // back; it tells both the invitee and the owner what to do.
      if (isRedirectUrlRejection(raw)) {
        return {
          field: "form",
          message:
            "Registration could not start because this site's email-link address is not approved yet. The workspace owner must add this deployment's URL to the Auth URL allowlist (Supabase → Authentication → URL Configuration) and then try again.",
        };
      }
      return { field: "form", message: MESSAGES[action].generic };
    }

    case "forgot-password": {
      // Generic by design; see requestPasswordReset action.
      return { field: "form", message: MESSAGES[action].generic };
    }

    case "reset-password": {
      if (code === "same_password" || code === "weak_password") {
        return {
          field: "password",
          message: "Please choose a different, stronger password.",
        };
      }
      return { field: "form", message: MESSAGES[action].generic };
    }
  }
}

/** Whether an error represents "Supabase is not configured" locally. */
export function isConfigurationError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.name === "SupabaseNotConfiguredError"
  );
}

/** Configuration guidance shown on auth screens when env vars are absent. */
export const CONFIGURATION_REQUIRED_MESSAGE =
  "Authentication is not configured yet. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (see docs/SUPABASE_SETUP.md), then restart the server.";

/**
 * Known-value detection for redirect-URL rejections (fixed strings,
 * never reflected back to the user). The auth server wording has been
 * stable across Supabase versions; matching a handful of literals is
 * safe and cannot be turned into an oracle. Exported for the actions'
 * sanitized diagnostic logging (boolean only).
 */
export function isAuthRedirectUrlRejection(raw: {
  code?: string | null;
  status?: number | null;
  message?: string | null;
} | null | undefined): boolean {
  const message = raw?.message?.toLowerCase() ?? "";
  return (
    message.includes("redirect url is not allowed") ||
    message.includes("redirect url provided is not allowed") ||
    message.includes("the redirect uri is not allowed") ||
    raw?.code === "redirect_uri_not_allowed"
  );
}

const isRedirectUrlRejection = isAuthRedirectUrlRejection;

/**
 * Logs one sanitized auth failure line and returns a short reference
 * for the user-facing message (mirrors lib/workspace/diagnostics).
 * Coarse inputs only — status number and stable code string; raw
 * messages stay out of logs except as this boolean classification.
 */
export function logAuthFailure(
  action: AuthAction,
  raw: {
    code?: string | null;
    status?: number | null;
    redirectRejection?: boolean;
    durationMs?: number | null;
  }
): string {
  const reference = randomAuthReference();
  console.error(`auth ${action} failed`, {
    action,
    code: raw.code ?? null,
    status: raw.status ?? null,
    redirectUrlRejected: raw.redirectRejection === true,
    durationMs: raw.durationMs ?? null,
    ref: reference,
  });
  return reference;
}

/** Appends a diagnostic reference to a safe user-facing message. */
export function withAuthReference(message: string, reference: string): string {
  return `${message} (ref: ${reference})`;
}

/** Short, non-sequential reference id. */
function randomAuthReference(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}
