"use client";

import { useActionState } from "react";
import { Send, Ban } from "lucide-react";

import { SubmitButton } from "@/components/shared/form-controls";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { resendInvitationAction, revokeInvitationAction } from "@/lib/workspace/actions";
import { initialWorkspaceFormState } from "@/lib/workspace/form-state";
import { workspaceRoleLabel } from "@/lib/workspace/roles";
import type { InvitationStatus, InvitationView } from "@/lib/workspace/views";

/** Deterministic date rendering (UTC) — server and client agree. */
function formatUtcDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Status pill: text label always present — color is never the only signal. */
const INVITATION_STATUS_STYLES: Record<InvitationStatus, { label: string; className: string }> =
  {
    pending: {
      label: "Pending",
      className: "bg-primary/10 text-primary",
    },
    accepted: {
      label: "Accepted",
      className: "bg-success/10 text-success",
    },
    revoked: {
      label: "Revoked",
      className: "bg-muted text-muted-foreground",
    },
    // Derived at read time (expired rows stay 'pending' in storage).
    expired: {
      label: "Expired",
      className: "bg-warning/10 text-warning",
    },
  };

function InvitationStatusPill({ status }: { status: InvitationStatus }) {
  const style = INVITATION_STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex h-5 w-fit shrink-0 items-center gap-1.5 rounded-full px-2 text-xs font-medium whitespace-nowrap ${style.className}`}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {style.label}
    </span>
  );
}

/**
 * Invitation list (owner/admin). Rows come RLS-filtered from the server;
 * `token_hash` is structurally absent (no SELECT grant). Resend rotates
 * the token server-side; revoke flips the status. Both re-authorize in
 * the action and re-enforce via RLS — this table's controls are UX.
 */
export function InvitationsTable({
  invitations,
}: {
  invitations: InvitationView[];
}) {
  if (invitations.length === 0) {
    return (
      <p className="px-6 pb-6 text-sm text-muted-foreground">
        No invitations yet. Invite a teammate above — they will appear here
        with their status.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-6">Invited email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Sent</TableHead>
          <TableHead>Expires</TableHead>
          <TableHead className="pr-6 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invitations.map((invitation) => (
          <InvitationRow key={invitation.id} invitation={invitation} />
        ))}
      </TableBody>
    </Table>
  );
}

function InvitationRow({ invitation }: { invitation: InvitationView }) {
  return (
    <TableRow>
      <TableCell className="pl-6 font-medium text-foreground">
        {invitation.invitedEmail}
      </TableCell>
      <TableCell>{workspaceRoleLabel(invitation.role)}</TableCell>
      <TableCell>
        <InvitationStatusPill status={invitation.status} />
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatUtcDate(invitation.createdAt)}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatUtcDate(invitation.expiresAt)}
      </TableCell>
      <TableCell className="pr-6">
        <div className="flex justify-end">
          {invitation.status === "pending" ? (
            <InvitationActions invitationId={invitation.id} email={invitation.invitedEmail} />
          ) : (
            <span className="text-muted-foreground/60">—</span>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

/** Resend (rotates the link) and Revoke for a pending invitation. */
function InvitationActions({
  invitationId,
  email,
}: {
  invitationId: string;
  email: string;
}) {
  const [resendState, resendAction] = useActionState(
    resendInvitationAction,
    initialWorkspaceFormState
  );
  const [revokeState, revokeAction] = useActionState(
    revokeInvitationAction,
    initialWorkspaceFormState
  );

  const feedback =
    resendState.formError ??
    revokeState.formError ??
    resendState.success?.title ??
    revokeState.success?.title;

  const feedbackTone = resendState.formError || revokeState.formError
    ? "destructive"
    : "success";

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <form action={resendAction}>
          <input type="hidden" name="invitationId" value={invitationId} />
          <SubmitButton
            variant="ghost"
            size="sm"
            pendingLabel="Sending…"
            aria-label={`Resend invitation to ${email}`}
            className="h-8 gap-1.5 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <Send aria-hidden="true" className="size-3.5" />
            Resend
          </SubmitButton>
        </form>
        <form action={revokeAction}>
          <input type="hidden" name="invitationId" value={invitationId} />
          <SubmitButton
            variant="ghost"
            size="sm"
            pendingLabel="Revoking…"
            aria-label={`Revoke invitation for ${email}`}
            className="h-8 gap-1.5 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <Ban aria-hidden="true" className="size-3.5" />
            Revoke
          </SubmitButton>
        </form>
      </div>
      {feedback ? (
        <p
          role={feedbackTone === "destructive" ? "alert" : "status"}
          className={`text-xs ${feedbackTone === "destructive" ? "text-destructive" : "text-success"}`}
        >
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
