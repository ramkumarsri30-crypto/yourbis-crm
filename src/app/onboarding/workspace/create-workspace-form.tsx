"use client";

import { useActionState, useId, useState } from "react";

import { AuthFormField } from "@/components/auth/auth-form-field";
import { FormFeedback, SubmitButton } from "@/components/shared/form-controls";
import { Input } from "@/components/ui/input";
import { createWorkspaceAction } from "@/lib/workspace/actions";
import { initialWorkspaceFormState } from "@/lib/workspace/form-state";
import {
  validateWorkspaceName,
  type WorkspaceFieldErrors,
} from "@/lib/workspace/validation";

/**
 * Create-workspace form. Same interaction contract as the auth forms:
 * inline validation on blur for instant feedback (local errors stay
 * fresher than the server's), the server action re-validates and
 * performs the atomic `create_organization` RPC, and the submit button
 * flips to a pending state the moment it is pressed (no dead clicks, no
 * full-page reload). On success the action redirects into the app; this
 * form never renders a success state.
 */
export function CreateWorkspaceForm() {
  const [state, formAction] = useActionState(
    createWorkspaceAction,
    initialWorkspaceFormState
  );
  const [localErrors, setLocalErrors] = useState<WorkspaceFieldErrors>({});
  const nameId = useId();

  const nameError =
    localErrors.workspaceName ?? state.errors.workspaceName;

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.formError ? (
        <FormFeedback tone="error">{state.formError}</FormFeedback>
      ) : null}

      <AuthFormField id={nameId} label="Workspace name" error={nameError}>
        {(control) => (
          <Input
            {...control}
            name="workspaceName"
            type="text"
            autoComplete="organization"
            placeholder="Acme Inc."
            maxLength={120}
            className="h-10"
            onBlur={(event) => {
              const message = validateWorkspaceName(
                event.currentTarget.value
              );
              setLocalErrors((current) => ({
                ...current,
                workspaceName: message,
              }));
            }}
          />
        )}
      </AuthFormField>

      <SubmitButton pendingLabel="Creating…" className="w-full">
        Create workspace
      </SubmitButton>

      <p className="text-xs text-muted-foreground">
        You will be the workspace owner. Owners can invite teammates,
        assign admins, and manage roles from Team settings.
      </p>
    </form>
  );
}
