import Link from "next/link";

import { AuthPanel } from "@/components/auth/auth-panel";

/**
 * Entry choice for a signed-out invitee (Phase 3 follow-up). The
 * previous flow bounced every unauthenticated visitor to the sign-in
 * page — a dead end for invitees without an account. This component
 * makes both paths explicit and preserves the full acceptance URL
 * (token included) as `next`, so either path lands right back on the
 * acceptance screen after authentication.
 *
 * Presentational only: it renders exactly the acceptUrl it is given
 * (the page derives it from the query string) and holds no session or
 * token logic.
 */
export function AcceptInvitationGate({ acceptUrl }: { acceptUrl: string }) {
  const next = encodeURIComponent(acceptUrl);

  return (
    <AuthPanel
      title="You're invited"
      description="Accepting adds this workspace to your account. Use the email address the invitation was sent to."
    >
      <div className="space-y-3">
        <Link
          href={`/sign-up?next=${next}`}
          className="flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          Create an account to accept
        </Link>
        <Link
          href={`/sign-in?next=${next}`}
          className="flex h-10 w-full items-center justify-center rounded-md border border-input bg-card text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          I already have an account
        </Link>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Both options bring you straight back to this invitation. The
          invitation only works for the email address it was sent to, and
          expires in 7 days.
        </p>
      </div>
    </AuthPanel>
  );
}
