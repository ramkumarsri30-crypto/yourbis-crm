"use client";

import Link from "next/link";
import { useActionState } from "react";

import { AuthFormField } from "@/components/auth/auth-form-field";
import { PasswordInput } from "@/components/auth/password-input";
import { FormFeedback, SubmitButton } from "@/components/shared/form-controls";
import { useFormErrors } from "@/components/auth/use-form-errors";
import { Input } from "@/components/ui/input";
import { initialAuthFormState } from "@/lib/auth/form-state";
import {
  PASSWORD_MIN_LENGTH,
  validateConfirmPassword,
  validateEmail,
  validateFullName,
  validatePassword,
} from "@/lib/auth/validation";

import { signUpAction } from "./actions";

/** Reads a sibling field's current value for cross-field validation. */
function readFieldValue(form: HTMLFormElement | null, name: string): string {
  const field = form?.elements.namedItem(name);
  return field instanceof HTMLInputElement ? field.value : "";
}

/**
 * Registration form. Inline validation mirrors the server action's
 * checks (same validators, both sides). When Supabase requires email
 * confirmation (the expected production posture) the action returns a
 * success panel instructing the user to confirm — never a fake
 * "account created and signed in" state.
 */
export function SignUpForm({ nextParam }: { nextParam: string | null }) {
  const [state, formAction] = useActionState(signUpAction, initialAuthFormState);
  const { validate, errorFor } = useFormErrors(state.errors);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={nextParam ?? ""} />

      {state.formError ? (
        <FormFeedback tone="error">{state.formError}</FormFeedback>
      ) : null}

      {state.success ? (
        <div className="space-y-4">
          <FormFeedback tone="success">
            <p className="font-medium">{state.success.title}</p>
            <p className="mt-1 text-success/90">{state.success.description}</p>
          </FormFeedback>
          <p className="text-sm text-muted-foreground">
            Verified your email already?{" "}
            <Link
              href="/sign-in"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      ) : (
        <>
          <AuthFormField id="fullName" label="Full name" error={errorFor("fullName")}>
            {(control) => (
              <Input
                {...control}
                type="text"
                name="fullName"
                autoComplete="name"
                placeholder="Alex Morgan"
                defaultValue={state.values?.fullName ?? ""}
                className="h-10"
                onBlur={(event) =>
                  validate("fullName", event.currentTarget.value, validateFullName)
                }
              />
            )}
          </AuthFormField>

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

          <AuthFormField
            id="password"
            label="Password"
            error={errorFor("password")}
            hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
          >
            {(control) => (
              <PasswordInput
                {...control}
                name="password"
                autoComplete="new-password"
                placeholder="Create a password"
                onBlur={(event) =>
                  validate("password", event.currentTarget.value, validatePassword)
                }
              />
            )}
          </AuthFormField>

          <AuthFormField
            id="confirmPassword"
            label="Confirm password"
            error={errorFor("confirmPassword")}
          >
            {(control) => (
              <PasswordInput
                {...control}
                name="confirmPassword"
                autoComplete="new-password"
                placeholder="Repeat your password"
                onBlur={(event) =>
                  validate(
                    "confirmPassword",
                    event.currentTarget.value,
                    (value) =>
                      validateConfirmPassword(
                        readFieldValue(event.currentTarget.form, "password"),
                        value
                      )
                  )
                }
              />
            )}
          </AuthFormField>

          <SubmitButton pendingLabel="Creating account…">
            Create account
          </SubmitButton>

          <p className="text-xs leading-relaxed text-muted-foreground">
            By creating an account you agree to the{" "}
            <span className="underline decoration-dotted underline-offset-2">
              Terms of Service
            </span>{" "}
            and{" "}
            <span className="underline decoration-dotted underline-offset-2">
              Privacy Policy
            </span>{" "}
            <span aria-hidden="true">(placeholder documents — final versions
            pending)</span>
            <span className="sr-only">
              (placeholder documents — final versions pending)
            </span>
            .
          </p>
        </>
      )}
    </form>
  );
}
