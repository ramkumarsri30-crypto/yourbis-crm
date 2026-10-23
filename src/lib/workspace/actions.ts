"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { CONFIGURATION_REQUIRED_MESSAGE } from "@/lib/auth/errors";
import { requireUser } from "@/lib/auth/guards";
import { resolveRequestOrigin } from "@/lib/auth/url";
import { buildAcceptInvitationUrl, createEmailSender } from "@/lib/email/sender";
import { RESEND_CONFIGURATION_MESSAGE, isResendConfigured } from "@/lib/email/config";
import {
  generateInvitationToken,
  hashInvitationToken,
  invitationExpiryIso,
  INVITATION_TOKEN_TTL_DAYS,
  isPlausibleInvitationToken,
} from "@/lib/invitations/tokens";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import {
  getWorkspaceContext,
  listMyWorkspaces,
  writeActiveWorkspaceCookie,
} from "@/lib/workspace/context";
import { mapWorkspaceDbError } from "@/lib/workspace/errors";
import {
  workspaceFormString,
  type WorkspaceFormState,
} from "@/lib/workspace/form-state";
import {
  canAssignRole,
  canInviteRole,
  canManageWorkspace,
  canRemoveMember,
  workspaceRoleLabel,
  type WorkspaceRole,
} from "@/lib/workspace/roles";
import {
  hasNoWorkspaceErrors,
  normalizeEmail,
  parseInviteRole,
  validateInviteInput,
  validateWorkspaceName,
} from "@/lib/workspace/validation";

/**
 * Workspace server actions (Phase 3). EVERY action:
 *
 *   1. identifies the caller from the VERIFIED claims (`requireUser`) —
 *      client-supplied user ids, roles, and organization ids are
 *      untrusted input and never authorize anything;
 *   2. validates its input on the server boundary;
 *   3. performs the operation under the caller's own RLS-filtered
 *      session — the database re-enforces every permission this module
 *      pre-checks (hiding controls is UX, not security);
 *   4. returns only safe, mapped messages (lib/workspace/errors).
 *
 * This module exports actions only — helpers live in plain modules so
 * they can be unit-tested without a server runtime.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Workspace creation (onboarding)
// ─────────────────────────────────────────────────────────────────────────────

export async function createWorkspaceAction(
  _prev: WorkspaceFormState,
  formData: FormData
): Promise<WorkspaceFormState> {
  const name = workspaceFormString(formData, "workspaceName");

  const nameError = validateWorkspaceName(name);
  if (nameError) {
    return { errors: { workspaceName: nameError } };
  }

  if (!isSupabaseConfigured()) {
    return { errors: {}, formError: CONFIGURATION_REQUIRED_MESSAGE };
  }

  // Authentication only — the RPC derives the creator from auth.uid()
  // (never from this client's untrusted input).
  await requireUser("/onboarding/workspace");
  const supabase = await createClient();

  // Atomic RPC: organization + owner membership in one transaction.
  const { data: organizationId, error } = await supabase.rpc(
    "create_organization",
    { p_name: name }
  );

  if (error || typeof organizationId !== "string") {
    return { errors: {}, formError: mapWorkspaceDbError("create-workspace", error) };
  }

  // Make the new workspace active and land in the app.
  await writeActiveWorkspaceCookie(organizationId);
  revalidatePath("/", "layout");
  redirect("/");
}

// ─────────────────────────────────────────────────────────────────────────────
// Workspace switching (cookie preference, membership-validated)
// ─────────────────────────────────────────────────────────────────────────────

export interface SwitchWorkspaceResult {
  ok: boolean;
  error?: string;
}

export async function switchWorkspaceAction(
  organizationId: string
): Promise<SwitchWorkspaceResult> {
  await requireUser("/");
  const supabase = await createClient();

  // The cookie is a preference, never an authorization: the target must
  // appear in the caller's server-verified membership list.
  const workspaces = await listMyWorkspaces(supabase);
  const target = workspaces.find((ws) => ws.id === organizationId);

  if (!target) {
    return {
      ok: false,
      error: "That workspace is not available for your account.",
    };
  }

  await writeActiveWorkspaceCookie(target.id);
  revalidatePath("/", "layout");
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Workspace settings — rename
// ─────────────────────────────────────────────────────────────────────────────

export async function updateWorkspaceNameAction(
  _prev: WorkspaceFormState,
  formData: FormData
): Promise<WorkspaceFormState> {
  const name = workspaceFormString(formData, "workspaceName");

  const nameError = validateWorkspaceName(name);
  if (nameError) {
    return { errors: { workspaceName: nameError } };
  }

  await requireUser("/settings/workspace");
  const supabase = await createClient();
  const { active } = await getWorkspaceContext(supabase);

  if (!active) {
    return { errors: {}, formError: "Create a workspace first." };
  }
  if (!canManageWorkspace(active.role)) {
    return {
      errors: {},
      formError: mapWorkspaceDbError("rename-workspace", { code: "42501" }),
    };
  }

  const { error } = await supabase
    .from("organizations")
    .update({ name })
    .eq("id", active.id);

  if (error) {
    return { errors: {}, formError: mapWorkspaceDbError("rename-workspace", error) };
  }

  revalidatePath("/", "layout");
  return {
    errors: {},
    success: { title: "Workspace name updated." },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Invitations — create / resend / revoke / accept
// ─────────────────────────────────────────────────────────────────────────────

export async function inviteMemberAction(
  _prev: WorkspaceFormState,
  formData: FormData
): Promise<WorkspaceFormState> {
  const email = workspaceFormString(formData, "inviteEmail");
  const role = workspaceFormString(formData, "inviteRole");

  const errors = validateInviteInput({ email, role });
  if (!hasNoWorkspaceErrors(errors)) {
    return { errors };
  }

  const inviteRole = parseInviteRole(role);
  if (!inviteRole) {
    return { errors: { inviteRole: "Choose a role for the invitation." } };
  }

  // Delivery cannot run without Resend — fail BEFORE creating anything
  // and never imply the invitation was sent.
  if (!isResendConfigured()) {
    return { errors: {}, formError: RESEND_CONFIGURATION_MESSAGE };
  }

  const user = await requireUser("/settings/team");
  const supabase = await createClient();
  const { active } = await getWorkspaceContext(supabase);

  if (!active) {
    return { errors: {}, formError: "Create a workspace first." };
  }
  if (!canInviteRole(active.role, inviteRole)) {
    return {
      errors: {},
      formError: mapWorkspaceDbError("invite-member", { code: "42501" }),
    };
  }

  const invitedEmail = normalizeEmail(email);

  // Duplicate-pending policy: one live invitation per (workspace,
  // email). The partial unique index backstops races; this early check
  // gives a friendlier message and avoids a wasted email round trip.
  const { data: existing } = await supabase
    .from("organization_invitations")
    .select("id")
    .eq("organization_id", active.id)
    .eq("invited_email", invitedEmail)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();

  if (existing) {
    return {
      errors: {},
      formError:
        "A pending invitation for this email already exists. Revoke it or resend the existing one instead.",
    };
  }

  // Token: random, strong, hashed at rest. The raw value only travels
  // in the email link — never stored, never returned, never logged.
  const rawToken = generateInvitationToken();
  const tokenHash = hashInvitationToken(rawToken);

  const { data: inserted, error: insertError } = await supabase
    .from("organization_invitations")
    .insert({
      organization_id: active.id,
      invited_email: invitedEmail,
      role: inviteRole,
      invited_by: user.id,
      token_hash: tokenHash,
      expires_at: invitationExpiryIso(),
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return {
      errors: {},
      formError: mapWorkspaceDbError("invite-member", insertError),
    };
  }

  // Insert first, then deliver: a delivery failure leaves a pending,
  // resendable invitation and an honest error message — never a false
  // success. Origin derives from this request, so the link returns to
  // the deployment that sent it.
  const origin = resolveRequestOrigin(await headers());
  if (!origin) {
    return {
      errors: {},
      formError:
        "The invitation was created, but its email could not be sent. Use Resend in Team settings.",
    };
  }

  const sender = createEmailSender();
  const result = await sender.sendInvitation({
    to: invitedEmail,
    inviterName: user.email ?? "A teammate",
    workspaceName: active.name,
    role: inviteRole,
    acceptUrl: buildAcceptInvitationUrl(origin, rawToken),
    expiresAt: invitationExpiryFromNow(),
  });

  revalidatePath("/settings/team", "page");

  if (!result.delivered) {
    return {
      errors: {},
      formError:
        "The invitation was created, but the email could not be delivered. Try resending it from the list below.",
    };
  }

  return {
    errors: {},
    success: {
      title: `Invitation sent to ${invitedEmail}.`,
      description: `They will join as ${workspaceRoleLabel(inviteRole).toLowerCase()} once they accept with this exact email address.`,
    },
  };
}

export async function resendInvitationAction(
  _prev: WorkspaceFormState,
  formData: FormData
): Promise<WorkspaceFormState> {
  const invitationId = workspaceFormString(formData, "invitationId");

  if (!isResendConfigured()) {
    return { errors: {}, formError: RESEND_CONFIGURATION_MESSAGE };
  }

  const user = await requireUser("/settings/team");
  const supabase = await createClient();
  const { active } = await getWorkspaceContext(supabase);

  if (!active) {
    return { errors: {}, formError: "Create a workspace first." };
  }

  // RLS restricts the read to this workspace's managers; a foreign id
  // simply does not resolve.
  const { data: invitation } = await supabase
    .from("organization_invitations")
    .select("id, invited_email, role, status")
    .eq("id", invitationId)
    .eq("organization_id", active.id)
    .maybeSingle();

  if (!invitation || invitation.status !== "pending") {
    return {
      errors: {},
      formError: "Only pending invitations can be resent.",
    };
  }

  // Rotate the token (invalidates any previously emailed link) and
  // extend the expiry, atomically under the row's RLS + policy.
  const rawToken = generateInvitationToken();
  const { data: updated, error: updateError } = await supabase
    .from("organization_invitations")
    .update({
      token_hash: hashInvitationToken(rawToken),
      expires_at: invitationExpiryIso(),
    })
    .eq("id", invitation.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (updateError) {
    return {
      errors: {},
      formError: mapWorkspaceDbError("resend-invitation", updateError),
    };
  }
  if (!updated) {
    return {
      errors: {},
      formError: "Only pending invitations can be resent.",
    };
  }

  const origin = resolveRequestOrigin(await headers());
  if (!origin) {
    return {
      errors: {},
      formError: "Unable to determine the application address. Please try again.",
    };
  }

  const sender = createEmailSender();
  const result = await sender.sendInvitation({
    to: invitation.invited_email,
    inviterName: user.email ?? "A teammate",
    workspaceName: active.name,
    role: invitation.role,
    acceptUrl: buildAcceptInvitationUrl(origin, rawToken),
    expiresAt: invitationExpiryFromNow(),
  });

  revalidatePath("/settings/team", "page");

  if (!result.delivered) {
    return {
      errors: {},
      formError:
        "The invitation was refreshed, but the email could not be delivered. Try again in a moment.",
    };
  }

  return {
    errors: {},
    success: {
      title: `Invitation resent to ${invitation.invited_email}.`,
      description: "The previous link no longer works — only the newest email's link is valid.",
    },
  };
}

export async function revokeInvitationAction(
  _prev: WorkspaceFormState,
  formData: FormData
): Promise<WorkspaceFormState> {
  const invitationId = workspaceFormString(formData, "invitationId");

  // Authentication only — RLS re-derives the caller for the update.
  await requireUser("/settings/team");
  const supabase = await createClient();
  const { active } = await getWorkspaceContext(supabase);

  if (!active) {
    return { errors: {}, formError: "Create a workspace first." };
  }

  const { data: updated, error } = await supabase
    .from("organization_invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId)
    .eq("organization_id", active.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    return {
      errors: {},
      formError: mapWorkspaceDbError("revoke-invitation", error),
    };
  }
  if (!updated) {
    return {
      errors: {},
      formError: "Only pending invitations can be revoked.",
    };
  }

  revalidatePath("/settings/team", "page");
  return { errors: {}, success: { title: "Invitation revoked." } };
}

export async function acceptInvitationAction(
  _prev: WorkspaceFormState,
  formData: FormData
): Promise<WorkspaceFormState> {
  const token = workspaceFormString(formData, "token");

  if (!isPlausibleInvitationToken(token)) {
    return {
      errors: {},
      formError: "This invitation is invalid, has expired, or was already used.",
    };
  }

  if (!isSupabaseConfigured()) {
    return { errors: {}, formError: CONFIGURATION_REQUIRED_MESSAGE };
  }

  // Unauthenticated visitors are sent to sign-in and returned here
  // with the token preserved: requireUser's redirect keeps `next`, and
  // signInAction passes it through safeRedirectPath (which allowlists
  // /accept-invitation and sanitizes the query) before redirecting.
  const nextPath = `/accept-invitation?token=${encodeURIComponent(token)}`;
  await requireUser(nextPath);
  const supabase = await createClient();

  // The RPC verifies token hash, status, expiry, and the confirmed
  // email match atomically, under a row lock, exactly once.
  const { data: organizationId, error } = await supabase.rpc(
    "accept_organization_invitation",
    { p_token: token }
  );

  if (error || typeof organizationId !== "string") {
    return {
      errors: {},
      formError: mapWorkspaceDbError("accept-invitation", error),
    };
  }

  await writeActiveWorkspaceCookie(organizationId);
  revalidatePath("/", "layout");
  redirect("/");
}

// ─────────────────────────────────────────────────────────────────────────────
// Team management — role changes and removals
// ─────────────────────────────────────────────────────────────────────────────

export async function updateMemberRoleAction(
  _prev: WorkspaceFormState,
  formData: FormData
): Promise<WorkspaceFormState> {
  const membershipId = workspaceFormString(formData, "membershipId");
  const role = workspaceFormString(formData, "memberRole");

  const user = await requireUser("/settings/team");
  const supabase = await createClient();
  const { active } = await getWorkspaceContext(supabase);

  if (!active) {
    return { errors: {}, formError: "Create a workspace first." };
  }

  const targetRole = role as WorkspaceRole;
  if (!canAssignRole(active.role, targetRole)) {
    return {
      errors: { memberRole: "You cannot assign that role." },
    };
  }

  // Fetch the target through the member directory (RLS limits rows to
  // this workspace); the own row is excluded by policy, but we also
  // give a clearer message up front.
  const { data: target } = await supabase
    .from("organization_memberships")
    .select("id, user_id, organization_id")
    .eq("id", membershipId)
    .eq("organization_id", active.id)
    .maybeSingle();

  if (!target) {
    return { errors: {}, formError: "That member is not in this workspace." };
  }
  if (target.user_id === user.id) {
    return {
      errors: {},
      formError: "You cannot change your own role.",
    };
  }

  const { error } = await supabase
    .from("organization_memberships")
    .update({ role: targetRole })
    .eq("id", target.id);

  if (error) {
    return {
      errors: {},
      formError: mapWorkspaceDbError("update-member-role", error),
    };
  }

  revalidatePath("/settings/team", "page");
  return {
    errors: {},
    success: { title: `Role updated to ${workspaceRoleLabel(targetRole)}.` },
  };
}

export async function removeMemberAction(
  _prev: WorkspaceFormState,
  formData: FormData
): Promise<WorkspaceFormState> {
  const membershipId = workspaceFormString(formData, "membershipId");

  const user = await requireUser("/settings/team");
  const supabase = await createClient();
  const { active } = await getWorkspaceContext(supabase);

  if (!active) {
    return { errors: {}, formError: "Create a workspace first." };
  }

  const { data: target } = await supabase
    .from("organization_memberships")
    .select("id, user_id, organization_id")
    .eq("id", membershipId)
    .eq("organization_id", active.id)
    .maybeSingle();

  if (!target) {
    return { errors: {}, formError: "That member is not in this workspace." };
  }

  const isSelf = target.user_id === user.id;
  if (!isSelf && !canRemoveMember(active.role)) {
    return {
      errors: {},
      formError: mapWorkspaceDbError("remove-member", { code: "42501" }),
    };
  }

  const { error } = await supabase
    .from("organization_memberships")
    .delete()
    .eq("id", target.id);

  if (error) {
    return {
      errors: {},
      formError: mapWorkspaceDbError("remove-member", error),
    };
  }

  revalidatePath("/settings/team", "page");
  return {
    errors: {},
    success: {
      title: isSelf
        ? "You left the workspace."
        : "Member removed from the workspace.",
    },
  };
}

/** Shared expiry date for email bodies (matches invitationExpiryIso). */
function invitationExpiryFromNow(): Date {
  return new Date(Date.now() + INVITATION_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}
