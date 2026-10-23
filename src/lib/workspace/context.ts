import { cache } from "react";
import { cookies } from "next/headers";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { WorkspaceRole } from "./roles";

/**
 * Server-side workspace context (Phase 3).
 *
 * Resolves, for the current request only:
 *   - the caller's workspace list (memberships joined to organizations,
 *     ONE PostgREST query), and
 *   - the active workspace: the `active_workspace` cookie when it names
 *     an organization the caller verifiably belongs to, otherwise the
 *     first membership.
 *
 * Security model:
 *   - The cookie is a UI preference, NEVER an authorization boundary.
 *     It is re-validated against the server-verified membership list on
 *     every read; a tampered/stale cookie simply falls back to the
 *     default workspace. Data access remains bound to the database's
 *     RLS policies regardless of which workspace is "active".
 *   - The membership list comes from the database under the caller's
 *     own RLS-filtered session — a client-supplied organization id
 *     grants nothing.
 *
 * Performance model (see the Phase 3 latency diagnosis):
 *   - `listMyWorkspaces` is wrapped in React `cache()` — one execution
 *     per request even when the layout, the page, and multiple server
 *     actions all need it.
 *   - The layout fetches profile + memberships with `Promise.all`, so
 *     the two queries overlap instead of serializing.
 */

/** Cookie carrying the active workspace id (UI preference only). */
export const ACTIVE_WORKSPACE_COOKIE = "active_workspace";

const ACTIVE_WORKSPACE_COOKIE_MAX_AGE =
  60 * 60 * 24 * 365; /* one year; re-validated on every read */

export interface WorkspaceSummary {
  id: string;
  name: string;
  role: WorkspaceRole;
}

export interface WorkspaceContext {
  /** Every workspace the caller verifiably belongs to. */
  workspaces: WorkspaceSummary[];
  /** Active workspace (cookie-validated), or null when none exist. */
  active: WorkspaceSummary | null;
}

/** Raw membership row shape returned by the PostgREST embed. */
interface MembershipRow {
  organization_id: string;
  role: WorkspaceRole;
  organizations: {
    id: string;
    name: string;
  } | null;
}

/**
 * The caller's workspaces, RLS-filtered by the database. Cached per
 * request via React `cache()`: layout, pages, and actions within one
 * render share a single database round trip.
 */
export const listMyWorkspaces = cache(
  async (supabase: SupabaseClient): Promise<WorkspaceSummary[]> => {
    const { data, error } = await supabase
      .from("organization_memberships")
      .select(
        "organization_id, role, organizations ( id, name )"
      )
      .order("created_at", { ascending: true })
      .limit(50);

    if (error || !Array.isArray(data)) {
      // Failures surface as "no workspaces" — callers redirect to
      // onboarding, which re-queries and shows a real error there if
      // the database is genuinely unreachable. Never throws to callers.
      return [];
    }

    const workspaces: WorkspaceSummary[] = [];
    for (const row of data as unknown as MembershipRow[]) {
      if (!row.organizations) {
        continue; // defensively skip broken joins
      }
      workspaces.push({
        id: row.organizations.id,
        name: row.organizations.name,
        role: row.role,
      });
    }
    return workspaces;
  }
);

/**
 * Pure active-workspace resolution (unit-tested):
 * - a cookie naming a workspace in the verified list wins;
 * - anything else (unknown, stale, foreign, malformed) falls back to
 *   the first membership;
 * - an empty list has no active workspace.
 */
export function resolveActiveWorkspace(
  workspaces: WorkspaceSummary[],
  cookieValue: string | undefined | null
): WorkspaceSummary | null {
  if (workspaces.length === 0) {
    return null;
  }
  if (cookieValue) {
    const matched = workspaces.find((ws) => ws.id === cookieValue);
    if (matched) {
      return matched;
    }
  }
  return workspaces[0] ?? null;
}

/**
 * Full context for the current request: cached membership query +
 * cookie-validated active workspace.
 */
export async function getWorkspaceContext(
  supabase: SupabaseClient
): Promise<WorkspaceContext> {
  const workspaces = await listMyWorkspaces(supabase);
  const cookieStore = await cookies();
  const active = resolveActiveWorkspace(
    workspaces,
    cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value
  );
  return { workspaces, active };
}

/**
 * Cookie options for setting the active workspace. httpOnly: the value
 * is not security-relevant, but keeping it server-managed avoids any
 * client tampering surface; sameSite=lax + secure in production are
 * the defaults for session-adjacent cookies.
 */
export function activeWorkspaceCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ACTIVE_WORKSPACE_COOKIE_MAX_AGE,
  };
}

/** Reads the active-workspace cookie value (for actions that set it). */
export async function readActiveWorkspaceCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value ?? null;
}

/** Sets the active-workspace cookie (server actions only). */
export async function writeActiveWorkspaceCookie(organizationId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(
    ACTIVE_WORKSPACE_COOKIE,
    organizationId,
    activeWorkspaceCookieOptions()
  );
}
