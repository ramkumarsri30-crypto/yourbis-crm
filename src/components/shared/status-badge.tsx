import type { LeadStatus, TaskStatus } from "@/types";
import { cn } from "@/lib/utils";

/**
 * Status badge for CRM records (lead stages, task states, and future
 * record kinds). Every status renders a text label, so state is never
 * communicated by color alone — the dot is purely decorative.
 */

export type StatusTone =
  | "info"
  | "success"
  | "warning"
  | "destructive"
  | "neutral";

interface StatusConfigEntry {
  label: string;
  tone: StatusTone;
}

export const STATUS_CONFIG: Record<LeadStatus | TaskStatus, StatusConfigEntry> =
  {
    // Lead statuses
    new: { label: "New", tone: "info" },
    working: { label: "Working", tone: "warning" },
    qualified: { label: "Qualified", tone: "success" },
    unresponsive: { label: "Unresponsive", tone: "neutral" },
    // Task statuses
    overdue: { label: "Overdue", tone: "destructive" },
    today: { label: "Due today", tone: "warning" },
    upcoming: { label: "Upcoming", tone: "neutral" },
  };

const toneClasses: Record<StatusTone, string> = {
  info: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  neutral: "bg-muted text-muted-foreground",
};

export interface StatusBadgeProps {
  status: LeadStatus | TaskStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center gap-1.5 rounded-full px-2 text-xs font-medium whitespace-nowrap",
        toneClasses[config.tone],
        className
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
}
