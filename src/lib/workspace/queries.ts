import type { SupabaseClient } from "@supabase/supabase-js";

import type { InvitationStatus, InvitationView, MemberView } from "./views";

/**
 * Bounded, paginated queries for the team settings screen. RLS filters
 * every row server-side (member directory for memberships; owner/admin
 * for invitations); these functions only shape, order, and bound the
 * result sets — they never add authorization.
 *
 * All lists are capped (`MEMBER_PAGE_SIZE` / `INVITATION_PAGE_SIZE`)
 * and ordered deterministically. No unbounded selects anywhere.
 */

export const MEMBER_PAGE_SIZE = 50;
export const INVITATION_PAGE_SIZE = 50;

/**
 * Lists members of an organization (one page, newest memberships
 * last). The database restricts rows to the caller's own organizations.
 * Display names come from the co-member profile policy
 * (`profiles_select_workspace_peers`); a missing profile renders the
 * member without a name — emails are intentionally NOT available for
 * other members (profiles carry none, auth.users is unreadable).
 */
export async function listMembers(
  supabase: SupabaseClient,
  organizationId: string,
  page = 0
): Promise<MemberView[]> {
  const { data, error } = await supabase
    .from("organization_memberships")
    .select("id, user_id, role, created_at, profiles ( display_name )")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true })
    .range(page * MEMBER_PAGE_SIZE, (page + 1) * MEMBER_PAGE_SIZE - 1);

  if (error || !Array.isArray(data)) {
    return [];
  }

  return data.map((row) => {
    const member = row as unknown as {
      id: string;
      user_id: string;
      role: MemberView["role"];
      created_at: string;
      profiles: { display_name: string | null } | null;
    };
    return {
      membershipId: member.id,
      userId: member.user_id,
      role: member.role,
      joinedAt: member.created_at,
      displayName: member.profiles?.display_name ?? null,
    };
  });
}

/**
 * Lists invitations of an organization (one page, newest first). The
 * database restricts rows to managers (owner/admin) and never exposes
 * `token_hash` (no SELECT grant on that column).
 */
export async function listInvitations(
  supabase: SupabaseClient,
  organizationId: string,
  page = 0
): Promise<InvitationView[]> {
  const { data, error } = await supabase
    .from("organization_invitations")
    .select(
      "id, invited_email, role, status, expires_at, accepted_at, created_at"
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .range(page * INVITATION_PAGE_SIZE, (page + 1) * INVITATION_PAGE_SIZE - 1);

  if (error || !Array.isArray(data)) {
    return [];
  }

  const now = Date.now();
  return data.map((row) => {
    const invitation = row as {
      id: string;
      invited_email: string;
      role: InvitationView["role"];
      status: InvitationStatus;
      expires_at: string;
      accepted_at: string | null;
      created_at: string;
    };
    // Derived view state: a pending row whose expiry has passed shows
    // as "expired" without any cron job (the status column stays
    // 'pending' in storage; acceptance re-checks expires_at anyway).
    const expired =
      invitation.status === "pending" &&
      new Date(invitation.expires_at).getTime() <= now;
    return {
      id: invitation.id,
      invitedEmail: invitation.invited_email,
      role: invitation.role,
      status: expired ? "expired" : invitation.status,
      expiresAt: invitation.expires_at,
      acceptedAt: invitation.accepted_at,
      createdAt: invitation.created_at,
    };
  });
}

/** Count helper for the "load more" affordance (bounded by page size). */
export function hasMorePages(rowCount: number, pageSize: number): boolean {
  return rowCount === pageSize;
}
