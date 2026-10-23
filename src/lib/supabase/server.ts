import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { requireSupabaseEnv } from "./config";

/**
 * Server-side Supabase client for Server Components, Server Actions, and
 * Route Handlers.
 *
 * Cookie handling follows the current `@supabase/ssr` App Router pattern:
 * `getAll` reads from the request cookie store, and `setAll` writes
 * refreshed session cookies. Writing cookies is only allowed in Server
 * Actions and Route Handlers; when called from a Server Component the
 * write throws and is swallowed — session refresh then happens in
 * `src/proxy.ts` (see `@/lib/supabase/proxy`), which is exactly why the
 * proxy exists.
 *
 * A new client is created per call. Do not cache it in a global: request
 * cookie stores differ between requests (and with Fluid compute a global
 * would mix users' cookies).
 */
export async function createClient() {
  const env = requireSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render — cookies cannot be
          // written there. Safe to ignore: the proxy refreshes sessions.
        }
      },
    },
  });
}
