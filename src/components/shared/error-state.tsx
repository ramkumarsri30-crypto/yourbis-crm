import { CircleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Error state for failed renders and failed data loading. The optional
 * `action` slot receives the recovery control (retry button or link
 * home) so this component stays reusable across client and server
 * boundaries.
 */
export interface ErrorStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function ErrorState({
  icon: Icon = CircleAlert,
  title,
  description,
  action,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center"
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-destructive/10">
        <Icon aria-hidden="true" className="size-5 text-destructive" />
      </span>
      <div className="max-w-md space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
