import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { ensureProfileForCurrentUser } from "@/lib/auth/profile";
import {
  DEFAULT_RECOVERY_PATH,
  safeRedirectPath,
} from "@/lib/auth/redirects";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/**
 * Email verification callback (GET /auth/confirm).
 *
 * Current Supabase SSR flow: the confirmation/recovery email links here
 * with a one-time `token_hash` and a `type` (see docs/SUPABASE_SETUP.md
 * for the email-template settings). `verifyOtp` validates the token and
 * establishes the session — cookies are written through the server
 * client's cookie store, which Route Handlers may set.
 *
 * Security notes:
 * - The token is never logged, echoed, or forwarded to error pages.
 * - `next` is reduced to a known internal path (no open redirects).
 * - Failures redirect to a clean URL with a whitelisted error code.
 */

/** OTP types that establish a session through this endpoint. */
const ALLOWED_OTP_TYPES = new Set<string>([
  "signup",
  "recovery",
  "invite",
  "magiclink",
  "email_change",
  "email",
]);

/** Where each type lands after a successful verification. */
function defaultDestinationFor(type: string): string {
  return type === "recovery" ? DEFAULT_RECOVERY_PATH : "/";
}

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(
      new URL("/sign-in?error=auth-not-configured", request.url)
    );
  }

  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next");

  // Missing or malformed parameters: no session, no token disclosure.
  if (!tokenHash || !type || !ALLOWED_OTP_TYPES.has(type)) {
    return redirectToErrorPage(request, type, "invalid-link");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type: type as EmailOtpType,
    token_hash: tokenHash,
  });

  if (error) {
    // Expired/already-used link or token mismatch. The specific reason
    // is not disclosed; the user gets a clean, actionable page.
    return redirectToErrorPage(request, type, "link-expired");
  }

  // Session established. Best-effort profile initialization (idempotent;
  // the app shell re-runs it on render, so failure here is harmless).
  await ensureProfileForCurrentUser(supabase);

  const destination = safeRedirectPath(
    next,
    defaultDestinationFor(type)
  );
  return NextResponse.redirect(new URL(destination, request.url));
}

function redirectToErrorPage(
  request: NextRequest,
  type: string | null,
  code: "invalid-link" | "link-expired"
): NextResponse {
  const url = new URL(
    type === "recovery" ? "/forgot-password" : "/sign-in",
    request.url
  );
  url.search = "";
  url.searchParams.set("error", code);
  return NextResponse.redirect(url);
}
