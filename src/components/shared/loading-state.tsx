import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton placeholders. `variant="page"` mirrors the dashboard layout
 * so route-level `loading.tsx` avoids layout shift; `variant="section"`
 * is a compact block for smaller deferred regions.
 */
export interface LoadingStateProps {
  variant?: "page" | "section";
}

export function LoadingState({ variant = "section" }: LoadingStateProps) {
  if (variant === "section") {
    return (
      <div
        role="status"
        aria-label="Loading content"
        className="space-y-3"
      >
        <span className="sr-only">Loading content…</span>
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }

  return (
    <div role="status" aria-label="Loading page" className="space-y-6">
      <span className="sr-only">Loading page…</span>
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 max-w-full w-96" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="gap-0 p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-9 w-28" />
            <Skeleton className="mt-2 h-3.5 w-36" />
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="gap-0 p-5 lg:col-span-2">
          <Skeleton className="h-64 w-full" />
        </Card>
        <Card className="gap-0 p-5">
          <Skeleton className="h-64 w-full" />
        </Card>
      </div>
    </div>
  );
}
