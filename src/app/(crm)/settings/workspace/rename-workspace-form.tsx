"use client";

import { useActionState, useId, useState } from "react";

import { AuthFormField } from "@/components/auth/auth-form-field";
import { FormFeedback, SubmitButton } from "@/components/shared/form-controls";
import { Input } from "@/components/ui/input";
import { updateWorkspaceNameAction } from "@/lib/workspace/actions";
import { initialWorkspaceFormState } from "@/lib/workspace/form-state";
import {
  validateWorkspaceName,
  type WorkspaceFieldErrors,
} from "@/lib/workspace/validation";

/**
 * Rename form for the active workspace. Client validation is feedback
 * only; the server action re-validates, checks the caller's role, and
 * the database's UPDATE policy (owner/admin, name column only) is the
 * final authority. Success keeps the form mounted with a confirmation
 * message — no redirect, no page reload.
 */
export function RenameWorkspaceForm({ currentName }: { currentName: string }) {
  const [state, formAction] = useActionState(
    updateWorkspaceNameAction,
    initialWorkspaceFormState
  );
  const [localErrors, setLocalErrors] = useState<WorkspaceFieldErrors>({});
  const nameId = useId();

  const nameError = localErrors.workspaceName ?? state.errors.workspaceName;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.formError ? (
        <FormFeedback tone="error">{state.formError}</FormFeedback>
      ) : null}
      {state.success ? (
        <FormFeedback tone="success">{state.success.title}</FormFeedback>
      ) : null}

      <AuthFormField
        id={nameId}
        label="Workspace name"
        error={nameError}
        hint="1–120 characters. Visible to everyone in this workspace."
      >
        {(control) => (
          <Input
            {...control}
            name="workspaceName"
            type="text"
            defaultValue={currentName}
            autoComplete="off"
            maxLength={120}
            className="h-10 max-w-md"
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

      <div>
        <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
      </div>
    </form>
  );
}
