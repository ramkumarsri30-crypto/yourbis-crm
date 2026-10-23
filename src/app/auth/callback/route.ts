import { type NextRequest, NextResponse } from "next/server";

import { ensureProfileForCurrentUser } from "@/lib/auth/profile";
import { DEFAULT_AUTHENTICATED_PATH, safeRedirectPath } from "@/lib/auth/redirects";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/**
 * PKCE code-exchange callback (GET /auth/callback).
 *
 * Supabase flows that redirect with an authorization `code` (OAuth
 * providers, magic links, and email templates using ConfirmationURL with
 * PKCE) land here. `exchangeCodeForSession` validates the code against
 * the code verifier and establishes the session.
 *
 * Security notes:
 * - The code is never logged or echoed; failures redirect to a clean
 *   URL with a generic error code.
 * - `next` is reduced to a known internal path (no open redirects).
 */
export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(
      new URL("/sign-in?error=auth-not-configured", request.url)
    );
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (!code) {
    // No code: nothing to exchange. Treat as an invalid callback.
    return redirectWithError(request);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Expired/used code or verifier mismatch — generic message only.
    return redirectWithError(request);
  }

  await ensureProfileForCurrentUser(supabase);

  return NextResponse.redirect(
    new URL(safeRedirectPath(next, DEFAULT_AUTHENTICATED_PATH), request.url)
  );
}

function redirectWithError(request: NextRequest): NextResponse {
  const url = new URL("/sign-in", request.url);
  url.search = "";
  url.searchParams.set("error", "callback-failed");
  return NextResponse.redirect(url);
}
