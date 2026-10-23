import type { Metadata } from "next";
import Link from "next/link";

import { AuthPanel } from "@/components/auth/auth-panel";
import { SupabaseConfigNotice } from "@/components/auth/supabase-config-notice";
import { isSupabaseConfigured } from "@/lib/supabase/config";

import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = {
  title: "Create your account",
};

// Server-side searchParams access (`next` param) makes this route
// request-dependent: allow blocking rendering (Next 16 cacheComponents).
export const instant = false;

export interface SignUpPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;
  const next = firstParam(params.next);
  const configured = isSupabaseConfigured();

  // Mirror of the sign-in page: keep the attempted destination across
  // the sign-up ↔ sign-in hop so invitation links survive. Re-validated
  // with safeRedirectPath before any redirect uses it.
  const signInHref = next
    ? `/sign-in?next=${encodeURIComponent(next)}`
    : "/sign-in";

  // Invitees arriving from the acceptance screen get a contextual
  // nudge: the account email must match the invited email exactly or
  // acceptance will fail later.
  const isInvitationFlow = next?.startsWith("/accept-invitation") ?? false;

  return (
    <AuthPanel
      title="Create your account"
      description="Set up your CRM Workspace account."
      footer={
        <p>
          Already have an account?{" "}
          <Link
            href={signInHref}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      }
    >
      {configured ? (
        <div className="space-y-4">
          {isInvitationFlow ? (
            <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm text-foreground">
              You&apos;re accepting a workspace invitation — create the
              account with the{" "}
              <span className="font-medium">exact email address</span> the
              invitation was sent to.
            </p>
          ) : null}
          <SignUpForm nextParam={next} />
        </div>
      ) : (
        <SupabaseConfigNotice />
      )}
    </AuthPanel>
  );
}
