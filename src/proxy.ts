import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16 proxy (the renamed `middleware.ts` convention — see the
 * bundled Next.js docs, "Proxy"). Runs `updateSession` for every
 * non-static request: refreshes the Supabase session cookies and applies
 * the optimistic route redirects defined in `@/lib/supabase/proxy`.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

// The matcher MUST be a static literal here — Next.js parses it at build
// time and cannot follow imported constants (route-segment-config rule).
// Everything except static assets, per the Supabase SSR guidance.
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
