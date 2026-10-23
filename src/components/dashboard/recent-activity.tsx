import {
  CalendarClock,
  Contact,
  Handshake,
  Phone,
  StickyNote,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/shared/section-header";
import { DEMO_ACTIVITIES } from "@/lib/demo-data";
import { cn, formatDateTime } from "@/lib/utils";
import type { ActivityType } from "@/types";

/**
 * Recent activity feed. All entries come from the demonstration dataset
 * in `src/lib/demo-data.ts`.
 */

const activityIcons: Record<ActivityType, LucideIcon> = {
  "lead-created": UserPlus,
  "deal-updated": Handshake,
  "follow-up-scheduled": CalendarClock,
  "contact-added": Contact,
  "call-logged": Phone,
  "note-added": StickyNote,
};

export function RecentActivity({ className }: { className?: string }) {
  return (
    <Card className={cn("gap-4 p-5", className)}>
      <SectionHeader
        id="recent-activity-heading"
        title="Recent activity"
        description="Latest recorded events"
      />

      <ul
        aria-labelledby="recent-activity-heading"
        className="divide-y divide-border"
      >
        {DEMO_ACTIVITIES.map((activity) => {
          const Icon = activityIcons[activity.type];

          return (
            <li
              key={activity.id}
              className="flex gap-3 py-3 first:pt-0 last:pb-0"
            >
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
                <Icon
                  aria-hidden="true"
                  className="size-3.5 text-muted-foreground"
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug">
                  <span className="font-medium text-foreground">
                    {activity.title}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    — {activity.detail}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  <time dateTime={activity.timestamp}>
                    {formatDateTime(activity.timestamp)}
                  </time>
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
