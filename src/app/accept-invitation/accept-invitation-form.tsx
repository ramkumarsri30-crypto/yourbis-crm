"use client";

import { useActionState } from "react";

import { FormFeedback, SubmitButton } from "@/components/shared/form-controls";
import { acceptInvitationAction } from "@/lib/workspace/actions";
import { initialWorkspaceFormState } from "@/lib/workspace/form-state";

/**
 * Accept-invitation form. The raw token travels as a hidden field to the
 * server action, which authenticates the caller (redirecting to sign-in
 * with the full URL as `next` when needed) and hands the token to the
 * acceptance RPC — the only place validation happens. Success redirects
 * into the app with the accepted workspace made active; this form only
 * ever renders error states.
 */
export function AcceptInvitationForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(
    acceptInvitationAction,
    initialWorkspaceFormState
  );

  return (
    <form action={formAction} className="space-y-5">
      {/* Raw token — only ever present in the email link, the HTML form,
          and the RPC call. Never logged, never echoed back. */}
      <input type="hidden" name="token" value={token} />

      {state.formError ? (
        <FormFeedback tone="error">{state.formError}</FormFeedback>
      ) : null}

      <SubmitButton pendingLabel="Accepting…" className="w-full">
        Accept invitation
      </SubmitButton>

      <p className="text-xs text-muted-foreground">
        If you were signed out, you will be asked to sign in first and
        brought right back here. The invitation only works for the email
        address it was sent to.
      </p>
    </form>
  );
}
