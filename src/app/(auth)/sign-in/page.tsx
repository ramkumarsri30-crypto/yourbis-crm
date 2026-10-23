import type { Metadata } from "next";
import Link from "next/link";

import { AuthPanel } from "@/components/auth/auth-panel";
import { SupabaseConfigNotice } from "@/components/auth/supabase-config-notice";
import { isSupabaseConfigured } from "@/lib/supabase/config";

import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  title: "Sign in",
};

// Server-side searchParams access (error banner, `next` param) makes this
// route request-dependent: allow blocking rendering instead of requiring
// an instant static shell (Next 16 cacheComponents).
export const instant = false;

/**
 * Whitelisted error codes the auth machinery may bounce back here
 * (from /auth/confirm and /auth/callback). Anything else is ignored.
 */
const ERROR_MESSAGES: Record<string, string> = {
  "link-expired":
    "Your confirmation link has expired or was already used. Sign in to continue, or request a new confirmation email by signing up again.",
  "callback-failed":
    "We could not complete the sign-in. The link may have expired — please try again.",
};

export interface SignInPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const next = firstParam(params.next);
  const errorCode = firstParam(params.error);
  const bannerMessage =
    errorCode && ERROR_MESSAGES[errorCode] ? ERROR_MESSAGES[errorCode] : null;
  const configured = isSupabaseConfigured();

  // Preserve the attempted destination across the sign-in ↔ sign-up
  // hop (invitation links carry /accept-invitation?token=…). The value
  // is untrusted here; it is re-validated with safeRedirectPath before
  // any redirect actually uses it.
  const signUpHref = next
    ? `/sign-up?next=${encodeURIComponent(next)}`
    : "/sign-up";

  return (
    <AuthPanel
      title="Sign in"
      description="Access your CRM workspace."
      footer={
        <p>
          Don&apos;t have an account?{" "}
          <Link
            href={signUpHref}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Create one
          </Link>
        </p>
      }
    >
      {configured ? (
        <SignInForm nextParam={next} bannerMessage={bannerMessage} />
      ) : (
        <SupabaseConfigNotice />
      )}
    </AuthPanel>
  );
}
