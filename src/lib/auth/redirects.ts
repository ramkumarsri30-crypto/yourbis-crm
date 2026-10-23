/**
 * Safe post-authentication redirect targets.
 *
 * Email links and auth actions carry a `next` parameter back to the page
 * the user was trying to reach. An unchecked value would allow open
 * redirects (`?next=https://evil.example` or `?next=//evil.example`),
 * so this module reduces any candidate to a known internal path.
 *
 * The allowlist is intentionally strict: only real destinations in this
 * application. Unknown paths fall back to the default — a redirect to a
 * wrong (but safe) page is acceptable; a redirect to an attacker's site
 * is not.
 */

/** Pages a signed-in user may legitimately land on after authentication. */
const APPROVED_INTERNAL_PATHS = new Set<string>([
  "/",
  "/reset-password",
]);

export const DEFAULT_AUTHENTICATED_PATH = "/";

/**
 * Normalizes a candidate `next` value to a safe internal path.
 *
 * Rules:
 * - Empty/absent → default path.
 * - Must be an absolute path on this origin (leading single `/`).
 * - Protocol-relative (`//host`), backslash-led (`/\host`), scheme-bearing
 *   (`https:…`), and relative (`foo`) forms are all rejected.
 * - Query strings are preserved only on approved paths; the query itself
 *   is sanitized of control characters.
 * - Anything not explicitly approved → default path.
 */
export function safeRedirectPath(
  candidate: string | null | undefined,
  fallback: string = DEFAULT_AUTHENTICATED_PATH
): string {
  if (!candidate) {
    return fallback;
  }

  // Strip control characters BEFORE parsing: URL serialization would
  // otherwise percent-encode them (`%00`), and the post-parse strip
  // below would no longer see them.
  const trimmed = candidate.trim().replace(/[\u0000-\u001f\u007f]/g, "");
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return fallback;
  }

  let parsed: URL;
  try {
    // Parse against a dummy origin so absolute-path strings are handled
    // uniformly; anything with an embedded scheme (e.g. `/:\\host` tricks)
    // fails or ends up non-approved below.
    parsed = new URL(trimmed, "https://internal.invalid");
  } catch {
    return fallback;
  }

  const pathname = parsed.pathname;
  if (!APPROVED_INTERNAL_PATHS.has(pathname)) {
    return fallback;
  }

  // Defense in depth: URL serialization cannot produce raw control
  // characters in `search`, but stripping again costs nothing.
  const search = parsed.search.replace(/[\u0000-\u001f\u007f]/g, "");
  return `${pathname}${search}`;
}

/** Default landing page after a recovery session is established. */
export const DEFAULT_RECOVERY_PATH = "/reset-password";
