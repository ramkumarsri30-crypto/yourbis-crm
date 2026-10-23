"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  CONFIGURATION_REQUIRED_MESSAGE,
  logAuthFailure,
  mapAuthError,
  withAuthReference,
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
 * Recoverable failures echo the submitted email (never the password).
 * Supabase-side failures are logged with a sanitized reference id that
 * also appears in the user-facing message.
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

  const values = { email };

  const errors = validateSignInInput({ email, password });
  if (!hasNoErrors(errors)) {
    return { errors, values };
  }

  if (!isSupabaseConfigured()) {
    return { errors: {}, values, formError: CONFIGURATION_REQUIRED_MESSAGE };
  }

  const supabase = await createClient();
  const signInStartedAt = Date.now();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Safe message only (identical for unknown email vs. wrong password);
    // the sanitized log line carries the coarse code/status for the
    // operator, the reference id correlates it with the user's report.
    const reference = logAuthFailure("sign-in", {
      code: error.code ?? null,
      status: error.status ?? null,
      durationMs: Date.now() - signInStartedAt,
    });
    return {
      errors: {},
      values,
      formError: withAuthReference(
        mapAuthError("sign-in", error).message,
        reference
      ),
    };
  }

  revalidatePath("/", "layout");
  redirect(safeRedirectPath(next));
}
