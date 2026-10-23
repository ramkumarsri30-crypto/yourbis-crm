import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { readSupabaseEnv } from "@/lib/supabase/config";

/**
 * Session refresh + optimistic route protection for the Next.js 16 proxy
 * (`src/proxy.ts`; "middleware" was renamed to "proxy" in Next 16).
 *
 * Two responsibilities, in order:
 *
 * 1. **Refresh the session.** Create a server client bound to the
 *    *incoming request* cookies, call `auth.getClaims()` (verified —
 *    this triggers a refresh when needed), and propagate any refreshed
 *    cookies to both the request context (so the render sees them) and
 *    the outgoing response (so the browser keeps them). This is what
 *    keeps a session alive across page reloads.
 *
 * 2. **Optimistic redirect.** Route-shape checks only: unauthenticated
 *    visitors to app pages are sent to `/sign-in`; signed-in users on
 *    auth pages are sent to the app. This is UX, not the security
 *    boundary — the authoritative check is `requireUser()` in the
 *    server layout, and future data operations verify independently
 *    (spec §7: do not rely exclusively on the proxy).
 *
 * When Supabase is unconfigured (fresh clone, CI), the proxy passes
 * every request through — the app stays buildable and runnable, and
 * auth screens show a configuration notice.
 */

/**
 * Auth pages that make sense only when signed out. `/reset-password` is
 * deliberately NOT here: it must stay reachable with the recovery
 * session the confirmation link establishes.
 */
const SIGNED_OUT_ONLY_PAGES = new Set<string>([
  "/sign-in",
  "/sign-up",
  "/forgot-password",
]);

/** Prefixes that are part of the auth machinery itself (always public). */
const PUBLIC_PREFIXES = ["/auth"];

/**
 * Pages that render for BOTH signed-in and signed-out visitors. The
 * invitation acceptance screen is the one such page: it shows a
 * sign-in / create-account choice to unauthenticated invitees (with
 * the full token URL preserved as `next`) and the acceptance form to
 * authenticated ones. The page itself holds no privileged logic —
 * the acceptance RPC re-authenticates and re-validates everything.
 */
const PUBLIC_PAGES = new Set<string>(["/accept-invitation"]);

function isPublicPath(pathname: string): boolean {
  return (
    SIGNED_OUT_ONLY_PAGES.has(pathname) ||
    PUBLIC_PAGES.has(pathname) ||
    PUBLIC_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
  );
}

export async function updateSession(request: NextRequest) {
  const env = readSupabaseEnv();
  if (!env) {
    // No credentials: nothing to refresh or protect. The (crm) layout's
    // requireUser() still redirects app pages to /sign-in, which renders
    // the configuration notice.
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  // IMPORTANT: create a new client per request. Never cache this client
  // in a global — cookie stores differ between requests.
  const supabase = createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Propagate refreshed cookies to the incoming request context…
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        // …and to the outgoing response.
        supabaseResponse = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  // Do not run code between createServerClient and getClaims() — an
  // accidental throw here can randomly sign users out.
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims?.sub);

  const { pathname } = request.nextUrl;

  if (!isAuthenticated && !isPublicPath(pathname)) {
    // Optimistic: send signed-out visitors to sign-in, preserving the
    // destination (validated before use by safeRedirectPath). The query
    // string is preserved too — invitation links
    // (/accept-invitation?token=…) must survive the sign-in round trip;
    // searchParams.set() percent-encodes the value, and
    // safeRedirectPath re-validates the allowlisted path and strips
    // control characters from the search on the way back in.
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = "";
    url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  // Navigating to a signed-out-only page while signed in → back to the
  // app. Only for GET navigations: POSTs on these paths are server
  // actions (form submissions) and must reach their handler.
  if (
    isAuthenticated &&
    request.method === "GET" &&
    SIGNED_OUT_ONLY_PAGES.has(pathname)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // IMPORTANT: return supabaseResponse as-is. Building a different
  // response without copying its cookies would drop refreshed sessions
  // and sign users out.
  return supabaseResponse;
}
