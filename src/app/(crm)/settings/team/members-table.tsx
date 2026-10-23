"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { LogOut, UserX } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { removeMemberAction, updateMemberRoleAction } from "@/lib/workspace/actions";
import { initialWorkspaceFormState } from "@/lib/workspace/form-state";
import {
  assignableRolesFor,
  canAssignRole,
  canRemoveMember,
  workspaceRoleLabel,
  type WorkspaceRole,
} from "@/lib/workspace/roles";
import type { MemberView } from "@/lib/workspace/views";

/** Deterministic date rendering (UTC) — server and client agree. */
function formatUtcDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function initialsFor(name: string | null): string {
  if (!name) {
    return "…";
  }
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "…";
}

/**
 * Member directory (Phase 3). All authorization derives from props the
 * SERVER computed (verified role of the viewer, member rows already
 * RLS-filtered); hiding controls is UX — the actions behind them
 * re-authorize and the database re-enforces.
 *
 * Interaction model: role selects submit immediately on change with a
 * visible pending state; removals and self-leave use a two-step
 * arm/confirm button so a single stray click cannot drop a teammate.
 */
export function MembersTable({
  members,
  actorRole,
  currentUserId,
}: {
  members: MemberView[];
  actorRole: WorkspaceRole;
  currentUserId: string;
}) {
  if (members.length === 0) {
    return (
      <p className="px-6 pb-6 text-sm text-muted-foreground">
        Nobody is listed in this workspace yet.
      </p>
    );
  }

  const ownerCount = members.filter((m) => m.role === "owner").length;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-6">Member</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Joined</TableHead>
          <TableHead className="pr-6 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <MemberRow
            key={member.membershipId}
            member={member}
            actorRole={actorRole}
            currentUserId={currentUserId}
            isOnlyOwner={member.role === "owner" && ownerCount === 1}
          />
        ))}
      </TableBody>
    </Table>
  );
}

function MemberRow({
  member,
  actorRole,
  currentUserId,
  isOnlyOwner,
}: {
  member: MemberView;
  actorRole: WorkspaceRole;
  currentUserId: string;
  isOnlyOwner: boolean;
}) {
  const isSelf = member.userId === currentUserId;
  const canEditRole =
    !isSelf &&
    member.role !== "owner" &&
    assignableRolesFor(actorRole).length > 0 &&
    // The viewer must be allowed to assign at least one *different*
    // role to this member; otherwise a select is pointless.
    ["admin", "member", "viewer"].some(
      (role) => role !== member.role && canAssignRole(actorRole, role as WorkspaceRole)
    );

  return (
    <TableRow>
      <TableCell className="pl-6">
        <div className="flex items-center gap-2.5">
          <Avatar className="size-7">
            <AvatarFallback className="bg-primary/10 text-[11px] font-medium text-primary">
              {initialsFor(member.displayName)}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium text-foreground">
            {member.displayName ?? "Team member"}
          </span>
          {isSelf ? (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              You
            </Badge>
          ) : null}
        </div>
      </TableCell>

      <TableCell>
        {canEditRole ? (
          <RoleSelectForm
            membershipId={member.membershipId}
            currentRole={member.role}
            actorRole={actorRole}
          />
        ) : (
          <span className="text-sm text-foreground">
            {workspaceRoleLabel(member.role)}
          </span>
        )}
      </TableCell>

      <TableCell className="text-muted-foreground">
        {formatUtcDate(member.joinedAt)}
      </TableCell>

      <TableCell className="pr-6">
        <div className="flex justify-end">
          <MemberActionsCell
            membershipId={member.membershipId}
            displayName={member.displayName}
            isSelf={isSelf}
            actorRole={actorRole}
            isOnlyOwner={isOnlyOwner}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}

/** Select + immediate submit for a member's role change. */
function RoleSelectForm({
  membershipId,
  currentRole,
  actorRole,
}: {
  membershipId: string;
  currentRole: WorkspaceRole;
  actorRole: WorkspaceRole;
}) {
  const [state, formAction] = useActionState(
    updateMemberRoleAction,
    initialWorkspaceFormState
  );
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={formAction} className="space-y-1">
      <input type="hidden" name="membershipId" value={membershipId} />
      <RoleSelect
        key={`${membershipId}-${currentRole}`}
        currentRole={currentRole}
        actorRole={actorRole}
      />
      {state.formError ? (
        <p role="alert" className="text-xs text-destructive">
          {state.formError}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="text-xs text-success">
          {state.success.title}
        </p>
      ) : null}
    </form>
  );
}

/** The select itself; submits its form on change and pends visibly. */
function RoleSelect({
  currentRole,
  actorRole,
}: {
  currentRole: WorkspaceRole;
  actorRole: WorkspaceRole;
}) {
  const { pending } = useFormStatus();
  const options = assignableRolesFor(actorRole);

  return (
    <select
      name="memberRole"
      defaultValue={currentRole}
      disabled={pending}
      aria-busy={pending || undefined}
      aria-label="Change role"
      onChange={(event) => {
        if (event.currentTarget.value !== currentRole) {
          event.currentTarget.form?.requestSubmit();
        }
      }}
      className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-wait disabled:opacity-60 dark:bg-input/30"
    >
      {options.map((role) => (
        <option key={role} value={role}>
          {workspaceRoleLabel(role)}
        </option>
      ))}
    </select>
  );
}

/** Remove / leave controls with inline, honest feedback. */
function MemberActionsCell({
  membershipId,
  displayName,
  isSelf,
  actorRole,
  isOnlyOwner,
}: {
  membershipId: string;
  displayName: string | null;
  isSelf: boolean;
  actorRole: WorkspaceRole;
  isOnlyOwner: boolean;
}) {
  const [state, formAction] = useActionState(
    removeMemberAction,
    initialWorkspaceFormState
  );

  // Self-leave is always offered except for the protected last owner.
  const showLeave = isSelf && !isOnlyOwner;
  const showRemove = !isSelf && canRemoveMember(actorRole);

  if (!showLeave && !showRemove) {
    return <span className="text-muted-foreground/60">—</span>;
  }

  const target = displayName ?? "this member";

  return (
    <form action={formAction} className="space-y-1 text-right">
      <input type="hidden" name="membershipId" value={membershipId} />
      {showLeave ? (
        <ConfirmSubmitButton
          label="Leave"
          confirmLabel="Confirm leave"
          icon={<LogOut aria-hidden="true" className="size-3.5" />}
          srLabel="Leave this workspace"
        />
      ) : null}
      {showRemove ? (
        <ConfirmSubmitButton
          label="Remove"
          confirmLabel="Confirm removal"
          icon={<UserX aria-hidden="true" className="size-3.5" />}
          srLabel={`Remove ${target} from the workspace`}
        />
      ) : null}
      {state.formError ? (
        <p role="alert" className="text-xs text-destructive">
          {state.formError}
        </p>
      ) : null}
    </form>
  );
}

/**
 * Two-step destructive submit: the first click arms the button, the
 * second confirms. Auto-disarms after 4 seconds or on blur so a stray
 * click never removes anyone on its own. Pending state comes from
 * useFormStatus (inside the form).
 */
function ConfirmSubmitButton({
  label,
  confirmLabel,
  icon,
  srLabel,
}: {
  label: string;
  confirmLabel: string;
  icon: React.ReactNode;
  srLabel: string;
}) {
  const [armed, setArmed] = useState(false);
  const { pending } = useFormStatus();

  useEffect(() => {
    if (!armed) {
      return;
    }
    const timer = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(timer);
  }, [armed]);

  return (
    <Button
      type="submit"
      variant={armed ? "destructive" : "ghost"}
      size="sm"
      aria-label={srLabel}
      aria-busy={pending || undefined}
      disabled={pending}
      onBlur={() => setArmed(false)}
      onClick={(event) => {
        if (!armed) {
          event.preventDefault();
          setArmed(true);
        }
      }}
      className="h-8 gap-1.5 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
    >
      {icon}
      {pending ? "Working…" : armed ? confirmLabel : label}
    </Button>
  );
}
