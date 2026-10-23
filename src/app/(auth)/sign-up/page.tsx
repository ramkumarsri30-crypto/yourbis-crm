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

  return (
    <AuthPanel
      title="Create your account"
      description="Set up your CRM Workspace account."
      footer={
        <p>
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      }
    >
      {configured ? (
        <SignUpForm nextParam={next} />
      ) : (
        <SupabaseConfigNotice />
      )}
    </AuthPanel>
  );
}
