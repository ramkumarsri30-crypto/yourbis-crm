/**
 * Resolves the application's external origin from request headers.
 *
 * Needed for the `emailRedirectTo` / `redirectTo` values sent to Supabase
 * Auth: confirmation and recovery emails must return the user to *this*
 * deployment (localhost in development, the Vercel domain in preview and
 * production). Behind Vercel's proxy the authoritative host is in
 * `x-forwarded-host`, with `host` as fallback.
 *
 * Values are treated as untrusted input: the resolved origin must parse
 * as a plain http(s) URL, otherwise `null` is returned and the caller
 * skips the email request rather than open a redirect.
 *
 * The proto defaults to `http` for the header-less case — that case is
 * plain local development (`next dev` sets no x-forwarded-proto), while
 * every real deployment proxy (Vercel, nginx, …) sends the header.
 */

export function resolveRequestOrigin(headers: Headers): string | null {
  const forwardedProto =
    firstHeaderValue(headers.get("x-forwarded-proto")) ?? "http";
  const host =
    firstHeaderValue(headers.get("x-forwarded-host")) ??
    firstHeaderValue(headers.get("host"));

  if (!host) {
    return null;
  }

  const origin = `${forwardedProto}://${host}`;
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    // Reject embedded credentials/path tricks in the host header.
    if (parsed.username || parsed.password || parsed.pathname !== "/") {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

/** First value of a possibly comma-separated proxy header. */
function firstHeaderValue(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const first = value.split(",")[0]?.trim() ?? "";
  return first.length > 0 ? first : null;
}
