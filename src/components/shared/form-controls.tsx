"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Shared form controls for server-action forms (auth screens and
 * workspace screens alike).
 *
 * `useFormStatus` (React DOM) drives the pending state from inside the
 * <form>: the button disables, spins, and announces "(submitting…)"
 * immediately on submit — visible feedback well within ~100 ms, while
 * the aria-busy label honestly indicates the network operation is still
 * in flight. The visible label never implies success before the action
 * returned.
 */
export function SubmitButton({
  children,
  pendingLabel = "Submitting…",
  ...props
}: React.ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      aria-busy={pending || undefined}
      disabled={pending}
      {...props}
    >
      {pending ? (
        <>
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          <span>{pendingLabel}</span>
        </>
      ) : (
        <>{children}</>
      )}
    </Button>
  );
}

/** Non-field feedback region (errors/success) announced to screen readers. */
export function FormFeedback({
  tone,
  children,
}: {
  tone: "error" | "success";
  children: ReactNode;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      aria-live="polite"
      className={
        tone === "error"
          ? "rounded-lg border border-destructive/30 bg-destructive/5 px-3.5 py-3 text-sm text-destructive"
          : "rounded-lg border border-success/30 bg-success/5 px-3.5 py-3 text-sm text-success"
      }
    >
      {children}
    </div>
  );
}
