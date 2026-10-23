import type { Metadata } from "next";
import Link from "next/link";

import { AuthPanel } from "@/components/auth/auth-panel";
import { getAuthenticatedUser } from "@/lib/auth/guards";
import { isPlausibleInvitationToken } from "@/lib/invitations/tokens";
import { isSupabaseConfigured } from "@/lib/supabase/config";

import { AcceptInvitationForm } from "./accept-invitation-form";
import { AcceptInvitationGate } from "./accept-invitation-gate";

export const metadata: Metadata = {
  title: "Accept invitation — CRM Workspace",
};

export const instant = false;

/**
 * Invitation acceptance screen (Phase 3). Reached from the "Accept
 * invitation" button in the invitation email. Lives OUTSIDE the CRM
 * shell on purpose: the invitee may have no workspace yet (the (crm)
 * layout would bounce them to onboarding).
 *
 * The page renders for signed-in AND signed-out visitors (the proxy
 * lets it through; see PUBLIC_PAGES in lib/supabase/proxy):
 *
 *   - Signed out: an explicit choice — "Create an account" for
 *     invitees without one, "Sign in" for those who have — both
 *     carrying the full acceptance URL (token included) as `next`
 *     (see AcceptInvitationGate). This removes the previous dead end
 *     where an invitee without an account saw only a sign-in form.
 *   - Signed in: the acceptance form. Its server action re-verifies
 *     the caller and hands the token to the acceptance RPC — the only
 *     place real validation happens.
 *
 * The page deliberately performs NO token validation of its own: any
 * pre-check would leak which tokens exist. Shape checking only.
 */
export interface AcceptInvitationPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

export default async function AcceptInvitationPage({
  searchParams,
}: AcceptInvitationPageProps) {
  const params = await searchParams;
  const token = firstParam(params.token);

  // Shape check only (length/charset): obviously-broken links render an
  // explanation instead of a form that can only fail. Anything passing
  // the shape check is submitted to the RPC, which decides for real.
  if (!isPlausibleInvitationToken(token)) {
    return (
      <AuthPanel
        title="This invitation won't work"
        description="Invitation links are single-use, expire after 7 days, and only work for the email address they were sent to."
      >
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li>The link may have expired or already been used.</li>
          <li>Your teammate may have revoked or resent it — ask for the newest email.</li>
          <li>
            You must open it while signed in with the invited email address.
          </li>
        </ul>
        <div className="mt-6 flex flex-col gap-2 text-sm">
          <Link
            href="/sign-in"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in with the invited email
          </Link>
          <Link
            href="/"
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Go to the app
          </Link>
        </div>
      </AuthPanel>
    );
  }

  // The full acceptance URL travels as `next` through sign-in/sign-up
  // and back (safeRedirectPath allowlists /accept-invitation and keeps
  // its query string), so the token survives the authentication hop.
  const acceptUrl = `/accept-invitation?token=${encodeURIComponent(token)}`;

  // Session check that never redirects: unauthenticated invitees get
  // the sign-in / create-account choice instead of a login dead end.
  // (Falls back to "signed out" when Supabase is unconfigured — the
  // auth screens then explain the configuration.)
  const user = isSupabaseConfigured() ? await getAuthenticatedUser() : null;

  if (!user) {
    return <AcceptInvitationGate acceptUrl={acceptUrl} />;
  }

  return (
    <AuthPanel
      title="You're invited"
      description="Accepting adds this workspace to your account. The invitation must match the email address of your signed-in account."
    >
      <AcceptInvitationForm token={token} />
    </AuthPanel>
  );
}

