"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  CONFIGURATION_REQUIRED_MESSAGE,
  mapAuthError,
} from "@/lib/auth/errors";
import {
  formPassword,
  type AuthFormState,
} from "@/lib/auth/form-state";
import {
  hasNoErrors,
  validateResetPasswordInput,
} from "@/lib/auth/validation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const EXPIRED_LINK_MESSAGE =
  "Your recovery link has expired or is no longer valid. Request a new one to continue.";

/**
 * Sets a new password after a recovery session was established by the
 * confirmation link (see /auth/confirm).
 *
 * Authorization: the password change happens on the Supabase session
 * established by clicking the emailed link — this action first verifies
 * a session exists (verified claims), and rejects everything else with
 * the expired-link message. Nobody can set a password by merely visiting
 * the route or submitting the form cold.
 */
export async function resetPasswordAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const password = formPassword(formData);
  const confirmPassword = formPassword(formData, "confirmPassword");

  const errors = validateResetPasswordInput({ password, confirmPassword });
  if (!hasNoErrors(errors)) {
    return { errors };
  }

  if (!isSupabaseConfigured()) {
    return { errors: {}, formError: CONFIGURATION_REQUIRED_MESSAGE };
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) {
    return { errors: {}, formError: EXPIRED_LINK_MESSAGE };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { errors: {}, formError: mapAuthError("reset-password", error).message };
  }

  revalidatePath("/", "layout");
  redirect("/");
}
