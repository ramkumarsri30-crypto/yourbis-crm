import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace/context";
import { canManageWorkspace, workspaceRoleDescription } from "@/lib/workspace/roles";

import { RenameWorkspaceForm } from "./rename-workspace-form";

export const metadata: Metadata = {
  title: "Workspace settings — CRM Workspace",
};

export const instant = false;

/**
 * Workspace settings (Phase 3): rename the active workspace and see your
 * own role in it. The active workspace comes from the server-verified
 * membership list (validated against the cookie per request); a
 * client-supplied workspace id grants nothing anywhere on this screen.
 *
 * Renaming is limited to owners/admins here as UX — the database's RLS
 * policy on `organizations` is the actual enforcement, and the server
 * action re-authorizes independently.
 */
export default async function WorkspaceSettingsPage() {
  // Without Supabase there is no session and no workspace — mirror the
  // layout's redirect (the sign-in screen explains the configuration).
  // This also keeps the route prerenderable in credential-less CI.
  if (!isSupabaseConfigured()) {
    redirect("/sign-in");
  }

  const supabase = await createClient();
  const { active } = await getWorkspaceContext(supabase);

  if (!active) {
    // The (crm) layout redirects workspace-less users to onboarding;
    // reaching this branch means the membership query failed — degrade
    // honestly instead of rendering an empty shell.
    return (
      <div className="space-y-6">
        <PageHeader
          title="Workspace settings"
          description="Your workspace could not be loaded. Refresh the page or create a workspace."
        />
      </div>
    );
  }

  const canRename = canManageWorkspace(active.role);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workspace settings"
        description="Manage the active workspace. Billing, domains, and danger-zone actions arrive in later phases."
      />

      <Card>
        <CardHeader>
          <CardTitle>Workspace name</CardTitle>
          <CardDescription>
            The name teammates see in the workspace switcher and
            invitation emails. {canRename ? "" : "Only owners and admins can rename it."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {canRename ? (
            <RenameWorkspaceForm currentName={active.name} />
          ) : (
            <p className="text-sm font-medium text-foreground">{active.name}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your access</CardTitle>
          <CardDescription>
            What you can do in this workspace. Roles are assigned by
            owners and admins from Team settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          <p>
            <span className="font-medium text-foreground">Role:</span>{" "}
            <span className="text-muted-foreground">
              {workspaceRoleDescription(active.role)}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            Owners can additionally invite admins and assign admin roles;
            transferring ownership arrives in a later phase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
