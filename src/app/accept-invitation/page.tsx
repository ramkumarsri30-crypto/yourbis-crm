import type { Metadata } from "next";
import Link from "next/link";

import { AuthPanel } from "@/components/auth/auth-panel";
import { isPlausibleInvitationToken } from "@/lib/invitations/tokens";

import { AcceptInvitationForm } from "./accept-invitation-form";

export const metadata: Metadata = {
  title: "Accept invitation — CRM Workspace",
};

export const instant = false;

/**
 * Invitation acceptance screen (Phase 3). Reached from the "Accept
 * invitation" button in the invitation email. Lives OUTSIDE the CRM
 * shell on purpose: the invitee may have no workspace yet (the (crm)
 * layout would bounce them to onboarding), and unauthenticated visitors
 * are already sent to sign-in by the proxy with this URL — query string
 * included — as `next`, so the context survives the round trip.
 *
 * The page deliberately performs NO token validation of its own: any
 * pre-check would leak which tokens exist. The server action's RPC is
 * the single validation path (hash lookup, status, expiry, confirmed
 * email match — atomically, once).
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

  return (
    <AuthPanel
      title="You're invited"
      description="Accepting adds this workspace to your account. The invitation must match the email address of your signed-in account."
    >
      <AcceptInvitationForm token={token} />
    </AuthPanel>
  );
}
