import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { KpiTrend, TrendSemantics } from "@/types";

/**
 * Metric card for KPI-style numbers. Presentational by design: values
 * arrive pre-formatted so this component never needs to know about
 * currency or date formatting.
 */

const trendSemanticsClasses: Record<TrendSemantics, string> = {
  positive: "text-success",
  negative: "text-destructive",
  neutral: "text-muted-foreground",
};

export interface MetricCardProps {
  label: string;
  /** Formatted value, e.g. "$589,575" or "42". */
  value: string;
  description: string;
  /** Optional trend; only ever populated from explicit demo data today. */
  trend?: KpiTrend;
  icon?: LucideIcon;
}

export function MetricCard({
  label,
  value,
  description,
  trend,
  icon: Icon,
}: MetricCardProps) {
  return (
    <Card className="gap-0 p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon ? (
          <Icon
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-muted-foreground/70"
          />
        ) : null}
      </div>

      <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground tabular-nums">
        {value}
      </p>

      {trend ? (
        <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-medium",
              trendSemanticsClasses[trend.semantics]
            )}
          >
            {trend.direction === "up" ? (
              <TrendingUp aria-hidden="true" className="size-3.5" />
            ) : (
              <TrendingDown aria-hidden="true" className="size-3.5" />
            )}
            {trend.value}
          </span>
          <span className="text-muted-foreground">{trend.label}</span>
        </p>
      ) : null}

      <p
        className={cn(
          "text-xs text-muted-foreground",
          trend ? "mt-1" : "mt-2"
        )}
      >
        {description}
      </p>
    </Card>
  );
}
