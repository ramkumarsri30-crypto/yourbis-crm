import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { getAuthUserRecordFor, requireUser } from "@/lib/auth/guards";
import { ensureProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import {
  getWorkspaceContext,
  resolveActiveWorkspace,
} from "@/lib/workspace/context";
import { ensureDefaultWorkspace, needsDefaultWorkspace } from "@/lib/workspace/ensure-default";

// The shell renders the verified user's identity, so every route under
// this layout is request-dependent (cookies). Allow blocking rendering
// instead of an instant static shell (Next 16 cacheComponents) — no
// personalized response can end up in a shared prerender this way.
export const instant = false;

/**
 * Layout for all CRM module routes. Route groups do not affect the URL,
 * so the Overview dashboard is served at `/` — the application home —
 * while future modules (leads, contacts, deals, …) will live alongside
 * it under this same shell.
 *
 * Every route under this layout requires an authenticated session:
 * `requireUser()` is the authoritative check (verified claims, see
 * lib/auth/guards) and redirects unauthenticated visitors to the sign-in
 * page. The proxy's redirect is only an optimistic early exit — this is
 * the boundary. Reading cookies here also makes the shell dynamic per
 * request, so no personalized response can be cached and reused across
 * users.
 *
 * Phase 3: the shell also resolves the workspace context — the verified
 * membership list and the membership-validated active workspace. Every
 * account that owns no workspace yet (fresh sign-ups as well as users
 * who only hold invited memberships) gets their default personal
 * workspace provisioned here through the audited create_organization
 * RPC (see lib/workspace/ensure-default) — roles in each workspace stay
 * independent. A user who still ends up with no workspace (creation
 * failed, e.g. database unreachable) is sent to `/onboarding/workspace`
 * (outside this layout, so no redirect loop), whose create form surfaces
 * real errors. The active-workspace cookie is a UI preference only;
 * every page and action re-validates membership server-side.
 *
 * Latency (see the Phase 3 performance notes in docs/ARCHITECTURE.md):
 * the profile row and the membership list are fetched in PARALLEL
 * (Promise.all), and `listMyWorkspaces` is per-request cached (React
 * `cache`) so pages/actions under this layout never re-fetch it. The
 * default-workspace check is a scan of that cached list — zero extra
 * database reads for accounts that already own a workspace.
 *
 * With Supabase unconfigured (fresh clone, CI) there is no session, so
 * `/` redirects to `/sign-in`, which renders the configuration notice —
 * the app stays runnable and self-explaining.
 */
// Explicit prop typing (instead of the global `LayoutProps` helper) keeps
// `tsc --noEmit` working in fresh clones/CI, where next-env.d.ts has not
// been generated yet. See AGENTS.md rule on reproducible typechecks.
export default async function CrmLayout({ children }: { children: ReactNode }) {
  // Authoritative guard: redirects (302) when unauthenticated.
  const verified = await requireUser();

  // Full record for the shell (display name from sign-up metadata).
  const record = await getAuthUserRecordFor(verified);

  // Idempotent, RLS-constrained profile row (created on first visit;
  // degrades to identity-derived values on any failure — never blocks)
  // and the workspace context, fetched in parallel — two independent
  // reads, no reason to serialize them.
  const supabase = await createClient();
  const [user, workspaceContext] = await Promise.all([
    ensureProfile(supabase, record),
    getWorkspaceContext(supabase),
  ]);

  // Default-workspace provisioning: accounts owning nothing (fresh
  // sign-ups; members invited into someone else's workspace) get their
  // own workspace created automatically. No-op for existing owners.
  let workspaces = workspaceContext.workspaces;
  if (needsDefaultWorkspace(workspaces)) {
    workspaces = await ensureDefaultWorkspace(supabase, {
      displayName: user.displayName,
    });
  }

  // Re-resolve the active workspace against the (possibly extended)
  // list. The previous active id is a membership-verified value, so it
  // is a safe stand-in for the cookie preference here; a fresh account
  // (no prior active) lands on its first — the new default.
  const active = resolveActiveWorkspace(
    workspaces,
    workspaceContext.active?.id ?? null
  );

  // Still no membership anywhere → focused workspace creation flow
  // (default provisioning failed; the onboarding screen re-queries and
  // its create action surfaces real errors).
  if (!active) {
    redirect("/onboarding/workspace");
  }

  return (
    <AppShell
      user={user}
      workspaces={workspaces}
      activeWorkspace={active}
    >
      {children}
    </AppShell>
  );
}
