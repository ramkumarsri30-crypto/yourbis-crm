"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  CONFIGURATION_REQUIRED_MESSAGE,
  mapAuthError,
} from "@/lib/auth/errors";
import {
  formPassword,
  formString,
  type AuthFormState,
} from "@/lib/auth/form-state";
import { safeRedirectPath } from "@/lib/auth/redirects";
import {
  hasNoErrors,
  validateSignInInput,
} from "@/lib/auth/validation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/**
 * Email/password sign-in. Validates on the server boundary (the browser's
 * validation is UX only), authenticates against Supabase Auth, and
 * redirects to the validated `next` path on success.
 *
 * Cookie writes (the session) are allowed here: server actions may set
 * cookies.
 */
export async function signInAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = formString(formData, "email");
  const password = formPassword(formData);
  const next = formString(formData, "next");

  const errors = validateSignInInput({ email, password });
  if (!hasNoErrors(errors)) {
    return { errors };
  }

  if (!isSupabaseConfigured()) {
    return { errors: {}, formError: CONFIGURATION_REQUIRED_MESSAGE };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Safe message only (identical for unknown email vs. wrong password).
    return { errors: {}, formError: mapAuthError("sign-in", error).message };
  }

  revalidatePath("/", "layout");
  redirect(safeRedirectPath(next));
}
