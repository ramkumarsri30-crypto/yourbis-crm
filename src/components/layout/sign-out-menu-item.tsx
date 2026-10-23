"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

/**
 * Sign-out submit with immediate pending feedback (Phase 3 latency
 * finding: the sign-out POST previously gave no feedback for the whole
 * duration of the auth-server round trip). useFormStatus flips the
 * item into a spinner + "Signing out…" state the moment the form is
 * submitted — no full-page reload, no dead-feeling click.
 */
export function SignOutMenuItem() {
  const { pending } = useFormStatus();

  return (
    <DropdownMenuItem
      asChild
      disabled={pending}
      aria-busy={pending || undefined}
    >
      <button type="submit" className="w-full cursor-pointer">
        {pending ? (
          <>
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            <span>Signing out…</span>
          </>
        ) : (
          "Sign out"
        )}
      </button>
    </DropdownMenuItem>
  );
}
