import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/supabase/config";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings — CRM Workspace",
};

export const instant = false;

/**
 * Settings hub (Phase 3 hotfix). `/settings` itself redirects to the
 * default section — workspace settings. The section tabs (Workspace,
 * Team) live in the shared settings layout (see ./layout.tsx), so this
 * route exists to keep the URL hierarchy predictable: the sidebar's
 * Settings entry points here, and trimming any section URL also works.
 *
 * Auth note: this route sits under the (crm) layout, whose
 * `requireUser()` is the authoritative authentication check (an
 * unauthenticated visitor is sent to sign-in with `/settings` as
 * `next` — the path is on the safe-redirect allowlist). The
 * Supabase-unconfigured guard below only keeps credential-less
 * prerenders pointing at the explanatory sign-in screen.
 */
export default async function SettingsHubPage() {
  if (!isSupabaseConfigured()) {
    redirect("/sign-in");
  }
  redirect("/settings/workspace");
}
