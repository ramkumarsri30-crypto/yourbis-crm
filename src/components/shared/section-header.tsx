import type { ReactNode } from "react";

/**
 * Section header used inside cards and page sections. Pass the `id` of
 * the rendered heading when the section wrapper uses
 * `aria-labelledby`.
 */
export interface SectionHeaderProps {
  id?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function SectionHeader({ id, title, description, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h2
          id={id}
          className="text-base font-semibold tracking-tight text-foreground"
        >
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0 pt-0.5">{action}</div> : null}
    </div>
  );
}
