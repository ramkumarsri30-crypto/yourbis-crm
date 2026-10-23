import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/shared/section-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { DEMO_TASKS } from "@/lib/demo-data";
import { cn, formatDateTime } from "@/lib/utils";

/**
 * Upcoming tasks list. Tasks are read-only demonstration records; task
 * management itself arrives in Phase 6.
 */
export function UpcomingTasks({ className }: { className?: string }) {
  return (
    <Card className={cn("gap-4 p-5", className)}>
      <SectionHeader
        id="upcoming-tasks-heading"
        title="Upcoming tasks"
        description="Next demonstration items"
      />

      <ul
        aria-labelledby="upcoming-tasks-heading"
        className="divide-y divide-border"
      >
        {DEMO_TASKS.map((task) => (
          <li key={task.id} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-center justify-between gap-2">
              <StatusBadge status={task.status} />
              <time
                dateTime={task.dueAt}
                className="shrink-0 text-xs text-muted-foreground tabular-nums"
              >
                {formatDateTime(task.dueAt)}
              </time>
            </div>
            <p className="mt-1.5 truncate text-sm font-medium text-foreground">
              {task.title}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {task.relatedTo}
            </p>
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted-foreground">
        Task management arrives in Phase 6.
      </p>
    </Card>
  );
}
