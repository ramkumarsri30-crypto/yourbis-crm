import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-side authentication guard.
 *
 * Authorization decisions use `auth.getClaims()` — the cryptographically
 * verified form of the caller's identity (JWT signature + expiry checked
 * against the server's keys). `auth.getSession()` is deliberately never
 * used for authorization: a session object read from a cookie is not
 * proof of identity (see AGENTS.md and Supabase SSR guidance).
 *
 * When full user data (email, metadata) is required, use `getUser()`,
 * which fetches the authoritative record from the auth server. This
 * module provides both, plus `requireUser()` for protected server
 * components.
 */

/** Verified identity facts needed for authorization decisions. */
export interface VerifiedAuthUser {
  /** `sub` claim — the auth user's UUID. */
  id: string;
  /** Email claim, when present on the token. */
  email: string | null;
}

/** Full user record (from the auth server) for places that need details. */
export interface AuthUserRecord extends VerifiedAuthUser {
  displayNameFromMetadata: string | null;
}

/**
 * Returns the verified claims for the current request, or null when the
 * caller is unauthenticated (or Supabase is unconfigured — the app stays
 * operational without credentials; see lib/supabase/config).
 *
 * Safe to call from Server Components; session refresh happens in the
 * proxy, and a stale token here simply yields null.
 */
export async function getAuthenticatedUser(): Promise<VerifiedAuthUser | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  const claims = data?.claims;
  if (!claims?.sub) {
    return null;
  }

  return { id: claims.sub, email: claims.email ?? null };
}

/**
 * Fetches the authoritative user record from the Supabase auth server for
 * an already-verified identity. Callers that have run `requireUser()` (or
 * `getAuthenticatedUser()`) pass its result here instead of calling
 * `getAuthUserRecord()` — this skips the second verification round-trip.
 *
 * `getUser()` costs one network call, so this is for rendering the user's
 * own profile — not for authorization decisions (use the verified claims).
 * When the auth server is unreachable the record degrades to the verified
 * claims' facts; callers handle that (see lib/auth/profile).
 */
export async function getAuthUserRecordFor(
  verified: VerifiedAuthUser
): Promise<AuthUserRecord> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  const metadataName =
    typeof data.user?.user_metadata?.full_name === "string"
      ? (data.user.user_metadata.full_name as string)
      : null;

  return {
    ...verified,
    email: data.user?.email ?? verified.email,
    displayNameFromMetadata: metadataName,
  };
}

/**
 * Fetches the authoritative user record for the current request, or null
 * when unauthenticated. Equivalent to `getAuthenticatedUser()` followed by
 * `getAuthUserRecordFor()`.
 */
export async function getAuthUserRecord(): Promise<AuthUserRecord | null> {
  const verified = await getAuthenticatedUser();
  if (!verified) {
    return null;
  }
  return getAuthUserRecordFor(verified);
}

/**
 * Guard for protected server components (the CRM dashboard and, later,
 * every module page). Redirects unauthenticated visitors to the sign-in
 * page, preserving the attempted path in `next` (validated on the way
 * back by lib/auth/redirects).
 *
 * This is the authoritative check — the proxy's redirect is only an
 * optimistic early exit. Data operations use their own verification.
 */
export async function requireUser(returnPath: string = "/"): Promise<VerifiedAuthUser> {
  const user = await getAuthenticatedUser();
  if (!user) {
    const safePath = returnPath.startsWith("/") && !returnPath.startsWith("//")
      ? returnPath
      : "/";
    redirect(`/sign-in?next=${encodeURIComponent(safePath)}`);
  }
  return user;
}
