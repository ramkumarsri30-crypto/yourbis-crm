"use client";

import { useActionState } from "react";

import { AuthFormField } from "@/components/auth/auth-form-field";
import { PasswordInput } from "@/components/auth/password-input";
import { FormFeedback, SubmitButton } from "@/components/auth/submit-button";
import { useFormErrors } from "@/components/auth/use-form-errors";
import { initialAuthFormState } from "@/lib/auth/form-state";
import {
  PASSWORD_MIN_LENGTH,
  validateConfirmPassword,
  validatePassword,
} from "@/lib/auth/validation";

import { resetPasswordAction } from "./actions";

/** Reads a sibling field's current value for cross-field validation. */
function readFieldValue(form: HTMLFormElement | null, name: string): string {
  const field = form?.elements.namedItem(name);
  return field instanceof HTMLInputElement ? field.value : "";
}

/**
 * New-password form (recovery flow). The action itself verifies that a
 * session established by the emailed recovery link exists before it
 * changes anything; this form's validation is UX only. Success redirects
 * to the dashboard from the action.
 */
export function ResetPasswordForm() {
  const [state, formAction] = useActionState(
    resetPasswordAction,
    initialAuthFormState
  );
  const { validate, errorFor } = useFormErrors(state.errors);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.formError ? (
        <FormFeedback tone="error">{state.formError}</FormFeedback>
      ) : null}

      <AuthFormField
        id="password"
        label="New password"
        error={errorFor("password")}
        hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
      >
        {(control) => (
          <PasswordInput
            {...control}
            name="password"
            autoComplete="new-password"
            placeholder="Create a new password"
            onBlur={(event) =>
              validate("password", event.currentTarget.value, validatePassword)
            }
          />
        )}
      </AuthFormField>

      <AuthFormField
        id="confirmPassword"
        label="Confirm new password"
        error={errorFor("confirmPassword")}
      >
        {(control) => (
          <PasswordInput
            {...control}
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="Repeat your new password"
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

      <SubmitButton pendingLabel="Updating password…">
        Update password
      </SubmitButton>
    </form>
  );
}
