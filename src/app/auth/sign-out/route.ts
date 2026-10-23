import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/**
 * Sign-out (POST /auth/sign-out).
 *
 * Invoked as a form POST from the user menu. POST (not GET) so sign-out
 * cannot be triggered by a plain link or prefetch. A same-origin check
 * on the Origin header blocks cross-site form posts (logout CSRF).
 *
 * Signs out through Supabase Auth — which revokes the session server
 * side — and clears the cookies via the client's cookie store. Redirects
 * to the sign-in page with 303 (POST → GET).
 */
export async function POST(request: NextRequest) {
  // Same-origin enforcement: reject cross-site submissions.
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      const requestHost =
        request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
        request.headers.get("host");
      if (!requestHost || originHost !== requestHost) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    if (data?.claims?.sub) {
      await supabase.auth.signOut();
    }
  }

  revalidatePath("/", "layout");
  return NextResponse.redirect(new URL("/sign-in", request.url), {
    status: 303,
  });
}
