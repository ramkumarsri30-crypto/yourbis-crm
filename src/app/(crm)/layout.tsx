import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { getAuthUserRecordFor, requireUser } from "@/lib/auth/guards";
import { ensureProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

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
  // degrades to identity-derived values on any failure — never blocks).
  const supabase = await createClient();
  const user = await ensureProfile(supabase, record);

  return <AppShell user={user}>{children}</AppShell>;
}
