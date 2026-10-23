import type { SupabaseClient } from "@supabase/supabase-js";

import type { AuthUserRecord } from "./guards";
import { DISPLAY_NAME_MAX_LENGTH } from "./validation";

/**
 * Profile read/initialization for `public.profiles`.
 *
 * Flow (spec §10): a profile row is created only after a verified
 * authenticated session exists, through the user's own RLS-constrained
 * insert — never with a service key, never from unverified input. The
 * insert is idempotent: repeated attempts (callback handler + dashboard
 * render racing, retries) all converge on one row.
 *
 * A missing or failed profile never blocks the application: the caller
 * degrades to identity-derived display values instead of redirecting or
 * crashing.
 */

/** What the shell needs to render the signed-in user. */
export interface ProfileView {
  displayName: string | null;
  initials: string;
  /** Fallback email from the verified identity. */
  email: string;
}

/**
 * Sanitizes an untrusted display name (from sign-up metadata) into a
 * value the database CHECK constraint will accept, or null.
 */
export function sanitizeDisplayName(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") {
    return null;
  }
  const stripped = raw.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  if (stripped.length === 0 || stripped.length > DISPLAY_NAME_MAX_LENGTH) {
    return null;
  }
  return stripped;
}

/** Two-letter initials from a display name or email local part. */
export function initialsFor(displayName: string | null, email: string): string {
  const source = displayName?.trim() || email.split("@")[0] || "?";
  const letters = source
    .split(/[\s._-]+/)
    .filter((part) => part.length > 0)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (letters.slice(0, 2) || "?");
}

/** Fallback view when no profile row exists yet (or Supabase is down). */
export function fallbackProfileView(user: AuthUserRecord): ProfileView {
  // Sanitize first: the initials must derive from the same cleaned value
  // as the display name (raw metadata may contain control characters).
  const displayName = sanitizeDisplayName(user.displayNameFromMetadata);
  return {
    displayName,
    initials: initialsFor(displayName, user.email ?? ""),
    email: user.email ?? "",
  };
}

/** Raw profile columns the caller needs (RLS already limits rows). */
interface ProfileRow {
  display_name: string | null;
}

/**
 * Reads the current user's profile row. No `where id = …` filter is
 * applied client-side on purpose: Row Level Security restricts the scan
 * to the caller's own row, so the database — not the client — enforces
 * ownership (AGENTS.md rule 5). Returns null when absent or unreadable;
 * never throws to the caller.
 */
export async function readProfile(
  supabase: SupabaseClient
): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name")
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  return { display_name: data.display_name ?? null };
}

/**
 * Ensures a profile row exists for the signed-in user; returns the best
 * available view either way.
 *
 * - Reads first (no write on the hot path once the row exists).
 * - If missing, inserts `(id = user.id, display_name = sanitized)`.
 *   RLS constrains the insert to the caller's own id, so even a bug in
 *   this code cannot create someone else's profile.
 * - Re-reads after insert to return persisted values.
 * - Any failure degrades to the fallback view. No redirect, no throw:
 *   a missing profile must never cause a redirect loop (spec §10).
 */
export async function ensureProfile(
  supabase: SupabaseClient,
  user: AuthUserRecord
): Promise<ProfileView> {
  const email = user.email ?? "";
  const existing = await readProfile(supabase);
  if (existing) {
    return {
      displayName: existing.display_name,
      initials: initialsFor(existing.display_name, email),
      email,
    };
  }

  const displayName = sanitizeDisplayName(user.displayNameFromMetadata);
  const { error: insertError } = await supabase.from("profiles").insert({
    id: user.id,
    display_name: displayName,
  });

  if (!insertError) {
    const created = await readProfile(supabase);
    if (created) {
      return {
        displayName: created.display_name,
        initials: initialsFor(created.display_name, email),
        email,
      };
    }
  }
  // Insert raced, was rejected, or the re-read failed: degrade gracefully.
  return fallbackProfileView(user);
}

/**
 * Best-effort profile initialization for the *currently signed-in* user,
 * using an existing Supabase client (callers in route handlers already
 * hold one). Intended right after a session is established (confirm /
 * callback handlers): makes the profile exist before the first dashboard
 * render. Failures are swallowed — the app shell re-runs `ensureProfile`
 * on render, which is idempotent.
 */
export async function ensureProfileForCurrentUser(
  supabase: SupabaseClient
): Promise<void> {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) {
    return;
  }

  const metadataName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : null;

  await ensureProfile(supabase, {
    id: user.id,
    email: user.email ?? null,
    displayNameFromMetadata: metadataName,
  });
}
