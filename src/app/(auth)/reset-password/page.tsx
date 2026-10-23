import type { Metadata } from "next";
import Link from "next/link";

import { AuthPanel } from "@/components/auth/auth-panel";
import { SupabaseConfigNotice } from "@/components/auth/supabase-config-notice";
import { getAuthenticatedUser } from "@/lib/auth/guards";
import { isSupabaseConfigured } from "@/lib/supabase/config";

import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Set a new password",
};

// Session detection (verified claims → cookies) makes this route
// request-dependent: allow blocking rendering (Next 16 cacheComponents).
export const instant = false;

/**
 * Shown when the page is opened without a session — either the recovery
 * link was never followed, or its session has expired. A cold form would
 * only fail on submit; this explains the situation and offers the way
 * forward instead.
 */
function NoSessionNotice() {
  return (
    <div
      role="status"
      className="rounded-lg border border-warning/40 bg-warning/5 px-3.5 py-3.5 text-sm"
    >
      <p className="font-medium text-warning">
        Open your recovery link first
      </p>
      <p className="mt-1.5 text-muted-foreground">
        This page sets a new password after you follow the recovery link we
        emailed you. Links expire for security — request a fresh one to
        continue.
      </p>
      <p className="mt-3">
        <Link
          href="/forgot-password"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Request a recovery link
        </Link>
      </p>
    </div>
  );
}

/**
 * Set-a-new-password page (POST-recovery destination).
 *
 * Deliberately reachable both with a recovery session (the normal flow —
 * /auth/confirm verifies the emailed token, establishes the session, and
 * lands here) and with a regular session (a signed-in user changing their
 * own password, which is equally legitimate). With no session at all, the
 * form is replaced by an explanation.
 */
export default async function ResetPasswordPage() {
  const configured = isSupabaseConfigured();
  // Verified claims, not session presence: decides only what to render.
  const user = configured ? await getAuthenticatedUser() : null;

  return (
    <AuthPanel
      title="Set a new password"
      description="Choose a new password for your account. You'll stay signed in afterwards."
    >
      {!configured ? (
        <SupabaseConfigNotice />
      ) : !user ? (
        <NoSessionNotice />
      ) : (
        <ResetPasswordForm />
      )}
    </AuthPanel>
  );
}
