import type { Metadata } from "next";
import Link from "next/link";

import { AuthPanel } from "@/components/auth/auth-panel";
import { SupabaseConfigNotice } from "@/components/auth/supabase-config-notice";
import { isSupabaseConfigured } from "@/lib/supabase/config";

import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Reset your password",
};

// Server-side searchParams access (error banner) makes this route
// request-dependent: allow blocking rendering (Next 16 cacheComponents).
export const instant = false;

/**
 * Whitelisted error codes /auth/confirm may bounce back here when a
 * recovery link fails. Anything else is ignored.
 */
const ERROR_MESSAGES: Record<string, string> = {
  "link-expired":
    "Your password recovery link has expired or was already used. Request a new one below.",
  "invalid-link":
    "This password recovery link is not valid. Request a new one below.",
};

export interface ForgotPasswordPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const params = await searchParams;
  const errorCode = firstParam(params.error);
  const bannerMessage =
    errorCode && ERROR_MESSAGES[errorCode] ? ERROR_MESSAGES[errorCode] : null;
  const configured = isSupabaseConfigured();

  return (
    <AuthPanel
      title="Reset your password"
      description="Enter your account email and we'll send you a recovery link."
      footer={
        <p>
          Remembered it after all?{" "}
          <Link
            href="/sign-in"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      }
    >
      {configured ? (
        <ForgotPasswordForm bannerMessage={bannerMessage} />
      ) : (
        <SupabaseConfigNotice />
      )}
    </AuthPanel>
  );
}
