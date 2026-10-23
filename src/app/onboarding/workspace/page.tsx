import type { Metadata } from "next";
import Link from "next/link";

import { AuthPanel } from "@/components/auth/auth-panel";
import { requireUser } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace/context";

import { CreateWorkspaceForm } from "./create-workspace-form";

export const metadata: Metadata = {
  title: "Create a workspace — CRM Workspace",
};

export const instant = false;

/**
 * Workspace creation (Phase 3 hotfix). Standalone focused screen outside
 * the CRM shell. Serves BOTH creation cases:
 *
 *   - First run: a signed-in user with no membership anywhere is sent
 *     here by the (crm) layout and creates their first workspace.
 *   - Additional workspaces: the workspace switcher's "New workspace"
 *     entry links here. Existing members previously bounced off this
 *     page (an unconditional `redirect("/")` for anyone with a
 *     membership), which made creating a second workspace impossible —
 *     the reported production bug. The form now renders for every
 *     authenticated user.
 *
 * Guards:
 *   - Unauthenticated visitors are sent to sign-in with this page as
 *     `next` (proxy optimism + authoritative `requireUser` here).
 *   - The database remains the authority on creation itself: the
 *     `create_organization` RPC creates the org and the caller's owner
 *     membership atomically; this page holds no privileged logic.
 *
 * Supabase-unconfigured clones never reach this page: `requireUser`
 * redirects to /sign-in, which renders the configuration notice.
 */
export default async function OnboardingWorkspacePage() {
  const user = await requireUser("/onboarding/workspace");

  const supabase = await createClient();
  const { active, workspaces } = await getWorkspaceContext(supabase);

  // Existing members arrive from the switcher: contextual copy plus a
  // way back. First-run users see the original onboarding experience.
  const hasWorkspaces = workspaces.length > 0;

  return (
    <AuthPanel
      title={hasWorkspaces ? "Create a workspace" : "Name your workspace"}
      description={
        hasWorkspaces
          ? `A separate workspace keeps this team's records apart from ${
              active?.name ?? "your existing workspaces"
            }. You will be the owner of the new workspace and it becomes active once created.`
          : `Your workspace is the shared home for your team's records — starting with ${user.email ?? "your account"}. You can rename it later and invite teammates from Team settings.`
      }
      footer={
        hasWorkspaces ? (
          <Link
            href="/"
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            Cancel and return to {active?.name ?? "the app"}
          </Link>
        ) : undefined
      }
    >
      <CreateWorkspaceForm />
    </AuthPanel>
  );
}
