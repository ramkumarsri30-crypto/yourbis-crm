import { AlertTriangle } from "lucide-react";

/**
 * Shown on auth screens when Supabase environment variables are absent.
 * The application must stay buildable and runnable without credentials
 * (CI, fresh clones): instead of a login form that would fail, the user
 * gets actionable guidance. Never rendered as an error dump.
 */
export function SupabaseConfigNotice() {
  return (
    <div
      role="status"
      className="rounded-lg border border-warning/40 bg-warning/5 px-3.5 py-3.5 text-sm"
    >
      <p className="flex items-center gap-2 font-medium text-warning">
        <AlertTriangle aria-hidden="true" className="size-4 shrink-0" />
        Authentication is not configured
      </p>
      <p className="mt-1.5 text-muted-foreground">
        This deployment has no Supabase credentials. Set{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">
          NEXT_PUBLIC_SUPABASE_URL
        </code>{" "}
        and{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
        </code>{" "}
        in your environment, then restart the server. Setup steps are in{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">
          docs/SUPABASE_SETUP.md
        </code>
        .
      </p>
    </div>
  );
}
