"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";

import { AuthFormField } from "@/components/auth/auth-form-field";
import { FormFeedback, SubmitButton } from "@/components/shared/form-controls";
import { Input } from "@/components/ui/input";
import { inviteMemberAction } from "@/lib/workspace/actions";
import { initialWorkspaceFormState } from "@/lib/workspace/form-state";
import {
  INVITABLE_ROLES,
  canInviteRole,
  workspaceRoleDescription,
  workspaceRoleLabel,
  type WorkspaceRole,
} from "@/lib/workspace/roles";
import {
  validateInviteEmail,
  type WorkspaceFieldErrors,
} from "@/lib/workspace/validation";

/**
 * Invite form (owner/admin). Role options mirror the database policy:
 * admins may offer member/viewer; owners additionally admin; `owner` is
 * never offered. The server action re-validates input, checks the
 * caller's role, inserts under RLS, and only then attempts delivery —
 * the visible message never claims delivery before it happened.
 *
 * On success the form clears (fresh state for the next invite) and the
 * server-rendered invitation table refreshes via revalidatePath.
 */
export function InviteMemberForm({ actorRole }: { actorRole: WorkspaceRole }) {
  const [state, formAction] = useActionState(
    inviteMemberAction,
    initialWorkspaceFormState
  );
  const [localErrors, setLocalErrors] = useState<WorkspaceFieldErrors>({});
  const formRef = useRef<HTMLFormElement>(null);
  const emailId = useId();
  const roleId = useId();

  const offeredRoles = INVITABLE_ROLES.filter((role) =>
    canInviteRole(actorRole, role)
  );

  // Clear the inputs after a confirmed success (the invitation table
  // below refreshes with the new pending row). The DOM reset is a
  // direct manipulation; the stale local validation state is derived
  // away below instead of being set in an effect.
  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  const emailError = state.success
    ? undefined
    : (localErrors.inviteEmail ?? state.errors.inviteEmail);
  const roleError = state.errors.inviteRole;

  return (
    <form ref={formRef} action={formAction} className="space-y-4" noValidate>
      {state.formError ? (
        <FormFeedback tone="error">{state.formError}</FormFeedback>
      ) : null}
      {state.success ? (
        <FormFeedback tone="success">
          <p className="font-medium">{state.success.title}</p>
          {state.success.description ? (
            <p className="mt-0.5">{state.success.description}</p>
          ) : null}
        </FormFeedback>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
        <AuthFormField
          id={emailId}
          label="Email address"
          error={emailError}
        >
          {(control) => (
            <Input
              {...control}
              name="inviteEmail"
              type="email"
              autoComplete="off"
              placeholder="teammate@company.com"
              maxLength={320}
              className="h-10"
              onBlur={(event) => {
                const message = validateInviteEmail(
                  event.currentTarget.value
                );
                setLocalErrors((current) => ({
                  ...current,
                  inviteEmail: message,
                }));
              }}
            />
          )}
        </AuthFormField>

        <AuthFormField id={roleId} label="Role" error={roleError}>
          {(control) => (
            <select
              {...control}
              name="inviteRole"
              defaultValue="member"
              className="h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              {offeredRoles.map((role) => (
                <option key={role} value={role}>
                  {workspaceRoleLabel(role)}
                </option>
              ))}
            </select>
          )}
        </AuthFormField>
      </div>

      <div>
        <SubmitButton pendingLabel="Sending…">Send invitation</SubmitButton>
      </div>

      <p className="text-xs text-muted-foreground">
        {offeredRoles.map((role) => (
          <span key={role} className="block">
            <span className="font-medium text-foreground">
              {workspaceRoleLabel(role)}:
            </span>{" "}
            {workspaceRoleDescription(role)}
          </span>
        ))}
      </p>
    </form>
  );
}
