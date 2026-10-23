"use client";

import { useActionState } from "react";

import { AuthFormField } from "@/components/auth/auth-form-field";
import { FormFeedback, SubmitButton } from "@/components/auth/submit-button";
import { useFormErrors } from "@/components/auth/use-form-errors";
import { Input } from "@/components/ui/input";
import { initialAuthFormState } from "@/lib/auth/form-state";
import { validateEmail } from "@/lib/auth/validation";

import { requestPasswordResetAction } from "./actions";

/**
 * Password recovery request form.
 *
 * The action's response is deliberately identical whether or not the
 * address belongs to an account (anti-enumeration); the success panel
 * therefore never confirms account existence. Validation mirrors the
 * server action — UX only, not a security boundary.
 */
export function ForgotPasswordForm({
  bannerMessage,
}: {
  bannerMessage: string | null;
}) {
  const [state, formAction] = useActionState(
    requestPasswordResetAction,
    initialAuthFormState
  );
  const { validate, errorFor } = useFormErrors(state.errors);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {bannerMessage ? (
        <FormFeedback tone="error">{bannerMessage}</FormFeedback>
      ) : null}

      {state.formError ? (
        <FormFeedback tone="error">{state.formError}</FormFeedback>
      ) : null}

      {state.success ? (
        <div className="space-y-4">
          <FormFeedback tone="success">
            <p className="font-medium">{state.success.title}</p>
            <p className="mt-1 text-success/90">{state.success.description}</p>
          </FormFeedback>
        </div>
      ) : (
        <>
          <AuthFormField id="email" label="Email address" error={errorFor("email")}>
            {(control) => (
              <Input
                {...control}
                type="email"
                name="email"
                autoComplete="email"
                placeholder="name@company.com"
                className="h-10"
                onBlur={(event) =>
                  validate("email", event.currentTarget.value, validateEmail)
                }
              />
            )}
          </AuthFormField>

          <SubmitButton pendingLabel="Sending recovery email…">
            Send recovery link
          </SubmitButton>
        </>
      )}
    </form>
  );
}
