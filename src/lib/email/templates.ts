import { workspaceRoleLabel, type WorkspaceRole } from "@/lib/workspace/roles";

/**
 * Invitation email content. Pure module — no I/O, fully unit-testable.
 * The acceptance URL embeds the raw token; the token appears ONLY here
 * (the email body) and never in logs, stored rows, or API responses.
 */

export interface InvitationEmailModel {
  /** Recipient address (the invited email, normalized). */
  to: string;
  /** Display name of the inviter (workspace manager). */
  inviterName: string;
  /** Organization display name. */
  workspaceName: string;
  /** Role the invitee will receive on acceptance. */
  role: WorkspaceRole;
  /** Full acceptance URL, including the raw token. */
  acceptUrl: string;
  /** When the invitation expires (absolute, for the email body). */
  expiresAt: Date;
}

export function invitationEmailSubject(model: InvitationEmailModel): string {
  return `${model.inviterName} invited you to join ${model.workspaceName} on CRM Workspace`;
}

function formatExpiry(expiresAt: Date): string {
  return expiresAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function invitationEmailText(model: InvitationEmailModel): string {
  return [
    `Hi,`,
    ``,
    `${model.inviterName} has invited you to join the workspace "${model.workspaceName}" on CRM Workspace as a ${workspaceRoleLabel(model.role).toLowerCase()}.`,
    ``,
    `Accept the invitation by ${formatExpiry(model.expiresAt)}:`,
    model.acceptUrl,
    ``,
    `If you did not expect this invitation, you can ignore this email — the link only works for the email address it was sent to.`,
    ``,
    `— CRM Workspace`,
  ].join("\n");
}

export function invitationEmailHtml(model: InvitationEmailModel): string {
  const esc = escapeHtml;
  return [
    `<p>Hi,</p>`,
    `<p><strong>${esc(model.inviterName)}</strong> has invited you to join the workspace <strong>${esc(model.workspaceName)}</strong> on CRM Workspace as a <strong>${esc(workspaceRoleLabel(model.role).toLowerCase())}</strong>.</p>`,
    `<p style="margin: 24px 0;">`,
    `  <a href="${escapeAttributeValue(model.acceptUrl)}" style="display:inline-block;background:#16a34a;color:#ffffff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Accept invitation</a>`,
    `</p>`,
    `<p style="color:#64748b;font-size:13px;">This invitation expires on ${esc(formatExpiry(model.expiresAt))}. If the button does not work, open this link: ${escapeAttributeValue(model.acceptUrl)}</p>`,
    `<p style="color:#64748b;font-size:13px;">If you did not expect this invitation, you can ignore this email — the link only works for the email address it was sent to.</p>`,
    `<p>— CRM Workspace</p>`,
  ].join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttributeValue(value: string): string {
  return escapeHtml(value);
}
