"use server";

import { headers } from "next/headers";

import {
  CONFIGURATION_REQUIRED_MESSAGE,
  mapAuthError,
} from "@/lib/auth/errors";
import { formString, type AuthFormState } from "@/lib/auth/form-state";
import { validateEmail } from "@/lib/auth/validation";
import { resolveRequestOrigin } from "@/lib/auth/url";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/**
 * Requests a password recovery email.
 *
 * Anti-enumeration: the response is identical whether or not the address
 * belongs to an account — "user not found" is reported to the caller the
 * same way as success. Only transport-level problems (rate limiting,
 * configuration) surface as errors.
 */
export async function requestPasswordResetAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = formString(formData, "email");

  const emailError = validateEmail(email);
  if (emailError) {
    return { errors: { email: emailError } };
  }

  if (!isSupabaseConfigured()) {
    return { errors: {}, formError: CONFIGURATION_REQUIRED_MESSAGE };
  }

  const origin = resolveRequestOrigin(await headers());
  if (!origin) {
    return {
      errors: {},
      formError: "Unable to send a recovery email right now. Please try again.",
    };
  }

  const GENERIC_SUCCESS: AuthFormState["success"] = {
    title: "Check your email",
    description:
      "If an account exists for that address, a password recovery link is on its way. Open the link to choose a new password. If it doesn't arrive within a few minutes, check your spam folder.",
  };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=${encodeURIComponent("/reset-password")}`,
  });

  if (error) {
    // Unknown address must look exactly like success.
    const code = error.code ?? null;
    if (code === "user_not_found") {
      return { errors: {}, success: GENERIC_SUCCESS };
    }
    // Rate limits and configuration problems are about the request, not
    // the account, so they may be surfaced (with safe wording).
    return { errors: {}, formError: mapAuthError("forgot-password", error).message };
  }

  return { errors: {}, success: GENERIC_SUCCESS };
}
