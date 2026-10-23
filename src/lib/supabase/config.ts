/**
 * Supabase environment configuration.
 *
 * Single place that reads (and validates the presence of) the two public
 * Supabase variables. Every Supabase client factory goes through this
 * module so the rest of the application never touches `process.env`
 * directly.
 *
 * Both values are public by design (`NEXT_PUBLIC_`): the publishable key
 * identifies the *application*, not a user, and all data protection comes
 * from database grants + Row Level Security — never from these values.
 *
 * The application must keep building and running when these are absent
 * (CI has no credentials; see AGENTS.md). `isSupabaseConfigured()` lets
 * callers render a helpful configuration message instead of crashing.
 */

export interface SupabaseEnv {
  url: string;
  publishableKey: string;
}

/**
 * Raw env access. Returns `null` when either variable is missing or blank
 * — never throws — so rendering can degrade gracefully.
 */
export function readSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) {
    return null;
  }

  return { url, publishableKey };
}

/**
 * Whether Supabase credentials are present in this environment. Safe to
 * call from client components (the `NEXT_PUBLIC_` values are inlined at
 * build time) and from server code.
 */
export function isSupabaseConfigured(): boolean {
  return readSupabaseEnv() !== null;
}

/** Error thrown when a Supabase client is created without configuration. */
export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
    this.name = "SupabaseNotConfiguredError";
  }
}

/**
 * Returns the validated env or throws `SupabaseNotConfiguredError`.
 * Callers that cannot degrade gracefully (client factories) use this;
 * UI entry points check `isSupabaseConfigured()` first and render a
 * configuration notice instead.
 */
export function requireSupabaseEnv(): SupabaseEnv {
  const env = readSupabaseEnv();
  if (!env) {
    throw new SupabaseNotConfiguredError();
  }
  return env;
}
