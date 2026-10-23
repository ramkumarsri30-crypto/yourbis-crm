import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { SettingsNav } from "@/components/layout/settings-nav";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace/context";

export const instant = false;

/**
 * Shared layout for every settings section (Phase 3 hotfix). Renders
 * the settings section tabs and the workspace context line above each
 * section's content, so Workspace settings and Team & invitations are
 * equally discoverable on desktop and mobile — previously the Team
 * screen had no navigation path at all.
 *
 * The context comes from the same per-request, RLS-filtered membership
 * query the (crm) layout already performed (React `cache()`), so this
 * adds no extra database round trip on direct loads, and the layout is
 * preserved across client-side navigation between the two sections.
 *
 * Authorization stays server-side and per-page: every settings page and
 * every server action re-verifies membership and role independently —
 * these tabs are navigation, not permission.
 */
export default async function SettingsLayout({ children }: { children: ReactNode }) {
  // Without Supabase credentials there is no session and no workspace:
  // mirror the section pages' guard (keeps credential-less prerenders
  // pointing at the explanatory sign-in screen).
  if (!isSupabaseConfigured()) {
    redirect("/sign-in");
  }

  const supabase = await createClient();
  const { active } = await getWorkspaceContext(supabase);

  return (
    <div className="space-y-6">
      <SettingsNav activeWorkspace={active} />
      {children}
    </div>
  );
}
