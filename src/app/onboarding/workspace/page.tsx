import type { Metadata } from "next";
import { redirect } from "next/navigation";

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
 * Workspace onboarding (Phase 3). Standalone focused screen outside the
 * CRM shell: a signed-in user with no membership anywhere lands here
 * (the (crm) layout redirects them), creates their first workspace, and
 * is taken straight into the app.
 *
 * Guards:
 *   - Unauthenticated visitors are sent to sign-in with this page as
 *     `next` (proxy optimism + authoritative `requireUser` here).
 *   - Visitors who already belong to a workspace are sent back to `/` —
 *     this screen is only for the first-run experience. Additional
 *     workspaces are created from the workspace switcher, which links
 *     here deliberately.
 *
 * Supabase-unconfigured clones never reach this page: `requireUser`
 * redirects to /sign-in, which renders the configuration notice.
 */
export default async function OnboardingWorkspacePage() {
  const user = await requireUser("/onboarding/workspace");

  const supabase = await createClient();
  const { active } = await getWorkspaceContext(supabase);

  if (active) {
    redirect("/");
  }

  return (
    <AuthPanel
      title="Name your workspace"
      description={`Your workspace is the shared home for your team's records — starting with ${user.email ?? "your account"}. You can rename it later and invite teammates from Team settings.`}
    >
      <CreateWorkspaceForm />
    </AuthPanel>
  );
}
