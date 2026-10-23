"use client";

import { createBrowserClient } from "@supabase/ssr";

import { requireSupabaseEnv } from "./config";

/**
 * Browser-side Supabase client (client components and event handlers).
 *
 * A fresh instance per call is cheap; the underlying auth state lives in
 * cookies, not in the client object. Never create this client at module
 * scope — call `createClient()` inside components/handlers so a missing
 * configuration surfaces at a controlled call site, not at import time.
 *
 * Server code must use the client from `@/lib/supabase/server` instead.
 */
export function createClient() {
  const env = requireSupabaseEnv();
  return createBrowserClient(env.url, env.publishableKey);
}
