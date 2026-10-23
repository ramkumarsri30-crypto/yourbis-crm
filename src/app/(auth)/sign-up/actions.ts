"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  CONFIGURATION_REQUIRED_MESSAGE,
  isAuthRedirectUrlRejection,
  logAuthFailure,
  mapAuthError,
  withAuthReference,
} from "@/lib/auth/errors";
import {
  formPassword,
  formString,
  type AuthFormState,
} from "@/lib/auth/form-state";
import { sanitizeDisplayName } from "@/lib/auth/profile";
import { safeRedirectPath } from "@/lib/auth/redirects";
import { resolveRequestOrigin } from "@/lib/auth/url";
import {
  hasNoErrors,
  validateSignUpInput,
} from "@/lib/auth/validation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/**
 * Account registration. Server-side validation mirrors the browser's
 * (client checks are UX, not a boundary), then delegates credential
 * handling entirely to Supabase Auth — no local password storage.
 *
 * Email confirmation is expected to be REQUIRED (production security
 * posture; see docs/SUPABASE_SETUP.md). The user is told to check their
 * email. If a project is configured with auto-confirm, Supabase returns
 * a session immediately and we redirect straight into the app.
 *
 * The full name travels in `user_metadata` for profile initialization
 * later — and is treated as untrusted input there (re-sanitized before
 * any database write; see lib/auth/profile).
 *
 * Recoverable failures echo the submitted name/email (never passwords)
 * so React's input reset doesn't wipe what the user typed, and
 * Supabase-side failures are logged server-side with a sanitized
 * reference id that also appears in the user-facing message.
 */
export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const fullName = formString(formData, "fullName");
  const email = formString(formData, "email");
  const password = formPassword(formData);
  const confirmPassword = formPassword(formData, "confirmPassword");
  const next = formString(formData, "next");

  const values = { fullName, email };

  const errors = validateSignUpInput({
    fullName,
    email,
    password,
    confirmPassword,
  });
  if (!hasNoErrors(errors)) {
    return { errors, values };
  }

  if (!isSupabaseConfigured()) {
    return { errors: {}, values, formError: CONFIGURATION_REQUIRED_MESSAGE };
  }

  // Confirmation emails must return to *this* deployment.
  const origin = resolveRequestOrigin(await headers());
  if (!origin) {
    return {
      errors: {},
      values,
      formError: "Unable to determine the application address. Please try again.",
    };
  }

  const supabase = await createClient();
  const signUpStartedAt = Date.now();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(
        safeRedirectPath(next)
      )}`,
      // Untrusted at rest: profile initialization sanitizes before use.
      data: { full_name: sanitizeDisplayName(fullName) ?? fullName.trim() },
    },
  });

  if (error) {
    // Sanitized diagnostics: coarse status/code plus the fixed-value
    // redirect-allowlist classification. Nothing user-identifying is
    // logged, and the reference id lets a report be correlated with
    // the exact Vercel log line.
    const reference = logAuthFailure("sign-up", {
      code: error.code ?? null,
      status: error.status ?? null,
      redirectRejection: isAuthRedirectUrlRejection(error),
      durationMs: Date.now() - signUpStartedAt,
    });
    return {
      errors: {},
      values,
      formError: withAuthReference(
        mapAuthError("sign-up", error).message,
        reference
      ),
    };
  }

  if (data.session) {
    // This Supabase project has email auto-confirm enabled: the user is
    // signed in already. (Production should keep confirmation required.)
    revalidatePath("/", "layout");
    redirect(safeRedirectPath(next));
  }

  // Expected path: confirmation email sent. The wording must not imply
  // the account is active before the link is clicked.
  return {
    errors: {},
    success: {
      title: "Check your email",
      description: `We sent a confirmation link to ${email}. Click the link to activate your account and sign in. If it doesn't arrive within a few minutes, check your spam folder.`,
    },
  };
}
