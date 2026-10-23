"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/error-state";

/**
 * Route-level error boundary for the CRM shell. Renders a generic,
 * non-leaking message; the error itself is logged for diagnosis and the
 * digest is surfaced for support correlation.
 */
export default function CrmError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // surfaced in server/terminal logs, never to the end user
    console.error("CRM route error:", error);
  }, [error]);

  return (
    <ErrorState
      title="Something went wrong"
      description={
        error.digest
          ? `The dashboard could not be rendered. Reference: ${error.digest}.`
          : "The dashboard could not be rendered. Please try again."
      }
      action={
        <Button size="sm" onClick={reset}>
          Try again
        </Button>
      }
    />
  );
}
