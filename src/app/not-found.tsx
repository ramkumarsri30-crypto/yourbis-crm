import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/error-state";

/**
 * Root not-found boundary. Rendered inside the root layout only (no CRM
 * shell), so it provides its own centering and a way back to the
 * Overview dashboard.
 */
export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <ErrorState
          icon={FileQuestion}
          title="Page not found"
          description="The page you are looking for does not exist or has not been implemented yet."
          action={
            <Button asChild size="sm">
              <Link href="/">Back to overview</Link>
            </Button>
          }
        />
      </div>
    </div>
  );
}
