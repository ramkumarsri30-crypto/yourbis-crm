import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/guards";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace/context";
import { canManageInvitations } from "@/lib/workspace/roles";
import { listInvitations, listMembers } from "@/lib/workspace/queries";

import { InviteMemberForm } from "./invite-member-form";
import { InvitationsTable } from "./invitations-table";
import { MembersTable } from "./members-table";

export const metadata: Metadata = {
  title: "Team — CRM Workspace",
};

export const instant = false;

/**
 * Team settings (Phase 3): the member directory, role management, and
 * the invitation lifecycle for the active workspace.
 *
 * Data rules:
 *   - The active workspace is resolved server-side from the verified
 *     membership list; every query below is additionally RLS-filtered
 *     by the database (member directory vs manager-only invitations).
 *   - Lists are bounded and ordered (lib/workspace/queries) — no
 *     unbounded selects.
 *   - Hiding the invite/manage controls is UX only: the actions behind
 *     them re-authorize server-side, and RLS re-enforces at the row
 *     level even if the UI is bypassed entirely.
 */
export default async function TeamSettingsPage() {
  // Without Supabase there is no session and no team — mirror the
  // layout's redirect (the sign-in screen explains the configuration).
  // This also keeps the route prerenderable in credential-less CI.
  if (!isSupabaseConfigured()) {
    redirect("/sign-in");
  }

  // Cached verification: the (crm) layout already ran requireUser for
  // this request — this resolves from the per-request cache (no extra
  // auth-server round trip).
  const user = await requireUser("/settings/team");

  const supabase = await createClient();
  const { active } = await getWorkspaceContext(supabase);

  if (!active) {
    // The (crm) layout redirects workspace-less users to onboarding;
    // reaching here means the membership query failed — degrade
    // honestly instead of rendering broken tables.
    return (
      <div className="space-y-6">
        <PageHeader
          title="Team"
          description="Your workspace could not be loaded. Refresh the page or create a workspace."
        />
      </div>
    );
  }

  const canManage = canManageInvitations(active.role);

  // Members and invitations are independent reads — fetch them in
  // parallel (invitations only for managers; the RLS policy would hide
  // them from everyone else anyway).
  const [members, invitations] = await Promise.all([
    listMembers(supabase, active.id),
    canManage ? listInvitations(supabase, active.id) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description="Invite teammates, manage their roles, and track outstanding invitations for this workspace."
      />

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Invite a teammate</CardTitle>
            <CardDescription>
              They receive an email with an acceptance link that only
              works for this exact address, expires in 7 days, and can be
              used once.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InviteMemberForm actorRole={active.role} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Invite a teammate</CardTitle>
            <CardDescription>
              Only workspace owners and admins can send invitations. Ask a
              manager of this workspace to add your teammate.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            {members.length} {members.length === 1 ? "person" : "people"} in
            this workspace. {active.role === "owner" || active.role === "admin"
              ? "Owners and admins can change roles and remove members; nobody can change their own role, and the last owner is protected."
              : "You can leave the workspace at any time."}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0 sm:px-0">
          <MembersTable
            members={members}
            actorRole={active.role}
            currentUserId={user.id}
          />
        </CardContent>
      </Card>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Invitations</CardTitle>
            <CardDescription>
              Pending invitations expire after 7 days. Resending rotates
              the link — previously emailed links stop working.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0 sm:px-0">
            <InvitationsTable invitations={invitations} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
