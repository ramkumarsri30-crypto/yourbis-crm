"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

/**
 * Submit button for auth forms. `useFormStatus` (inside the <form>)
 * drives the pending state: disabled + spinner + "(submitting…)"
 * announcement via aria-busy. The visible label never implies success.
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
      className="h-10 w-full"
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
