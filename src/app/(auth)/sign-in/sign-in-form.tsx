"use client";

import Link from "next/link";
import { useActionState } from "react";

import { AuthFormField } from "@/components/auth/auth-form-field";
import { PasswordInput } from "@/components/auth/password-input";
import { FormFeedback, SubmitButton } from "@/components/shared/form-controls";
import { useFormErrors } from "@/components/auth/use-form-errors";
import { Input } from "@/components/ui/input";
import { initialAuthFormState } from "@/lib/auth/form-state";
import { validateEmail, validatePassword } from "@/lib/auth/validation";

import { signInAction } from "./actions";

/**
 * Sign-in form. Inline validation (on blur) for fast feedback; the
 * server action re-validates and authenticates — client checks are UX,
 * not a security boundary. Success redirects from the action itself.
 */
export function SignInForm({
  nextParam,
  bannerMessage,
}: {
  nextParam: string | null;
  bannerMessage: string | null;
}) {
  const [state, formAction] = useActionState(signInAction, initialAuthFormState);
  const { validate, errorFor } = useFormErrors(state.errors);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {/* Preserve the attempted destination (validated server-side). */}
      <input type="hidden" name="next" value={nextParam ?? ""} />

      {bannerMessage ? (
        <FormFeedback tone="error">{bannerMessage}</FormFeedback>
      ) : null}

      {state.formError ? (
        <FormFeedback tone="error">{state.formError}</FormFeedback>
      ) : null}

      <AuthFormField id="email" label="Email address" error={errorFor("email")}>
        {(control) => (
          <Input
            {...control}
            type="email"
            name="email"
            autoComplete="email"
            placeholder="name@company.com"
            defaultValue={state.values?.email ?? ""}
            className="h-10"
            onBlur={(event) => validate("email", event.currentTarget.value, validateEmail)}
          />
        )}
      </AuthFormField>

      <div className="space-y-2">
        <AuthFormField
          id="password"
          label="Password"
          error={errorFor("password")}
        >
          {(control) => (
            <PasswordInput
              {...control}
              name="password"
              autoComplete="current-password"
              placeholder="Your password"
              onBlur={(event) =>
                validate("password", event.currentTarget.value, validatePassword)
              }
            />
          )}
        </AuthFormField>
        <p className="text-right">
          <Link
            href="/forgot-password"
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Forgot your password?
          </Link>
        </p>
      </div>

      <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
    </form>
  );
}
