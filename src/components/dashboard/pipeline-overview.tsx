import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/shared/section-header";
import { DEMO_PIPELINE_STAGES, OPEN_STAGE_IDS } from "@/lib/demo-data";
import { cn, formatCompactCurrency, formatCurrency } from "@/lib/utils";
import type { PipelineStageId } from "@/types";

/**
 * Pipeline overview rendered as an accessible horizontal bar
 * visualization. Built with plain elements instead of a chart library:
 * the numbers are real text (readable by assistive technology and at any
 * zoom level) and the bars are purely decorative.
 */

const stageBarClasses: Record<PipelineStageId, string> = {
  new: "bg-chart-1",
  qualified: "bg-chart-2",
  proposal: "bg-chart-3",
  negotiation: "bg-chart-4",
  "closed-won": "bg-chart-5",
};

export function PipelineOverview({ className }: { className?: string }) {
  const openStages = DEMO_PIPELINE_STAGES.filter((stage) =>
    (OPEN_STAGE_IDS as readonly string[]).includes(stage.id)
  );
  const openDealCount = openStages.reduce((sum, s) => sum + s.dealCount, 0);
  const openValue = openStages.reduce((sum, s) => sum + s.value, 0);
  const weightedValue = openStages.reduce(
    (sum, s) => sum + s.value * s.winLikelihood,
    0
  );
  const maxValue = Math.max(...DEMO_PIPELINE_STAGES.map((s) => s.value));

  return (
    <Card className={cn("gap-4 p-5", className)}>
      <SectionHeader
        id="pipeline-overview-heading"
        title="Pipeline overview"
        description="Deal count and value by stage"
      />

      <ul
        aria-labelledby="pipeline-overview-heading"
        className="flex flex-col gap-3.5"
      >
        {DEMO_PIPELINE_STAGES.map((stage) => {
          const widthPercent = Math.round((stage.value / maxValue) * 100);

          return (
            <li
              key={stage.id}
              className="flex items-center gap-3"
              aria-label={`${stage.label}: ${stage.dealCount} deals worth ${formatCompactCurrency(stage.value)}`}
            >
              <span className="w-20 shrink-0 truncate text-sm text-foreground sm:w-24">
                {stage.label}
              </span>
              <div
                aria-hidden="true"
                className="h-2 min-w-8 flex-1 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className={cn("h-full rounded-full", stageBarClasses[stage.id])}
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
              <span className="hidden w-14 shrink-0 text-right text-xs text-muted-foreground tabular-nums sm:block">
                {stage.dealCount} {stage.dealCount === 1 ? "deal" : "deals"}
              </span>
              <span className="w-20 shrink-0 text-right text-sm font-medium text-foreground tabular-nums">
                {formatCompactCurrency(stage.value)}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-1.5 border-t border-border pt-4 sm:flex-row sm:items-baseline sm:justify-between">
        <p className="text-sm">
          <span className="text-muted-foreground">Open pipeline: </span>
          <span className="font-medium text-foreground tabular-nums">
            {openDealCount} deals
          </span>
          <span className="text-muted-foreground"> valued at </span>
          <span className="font-medium text-foreground tabular-nums">
            {formatCurrency(openValue)}
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          Weighted by stage likelihood:{" "}
          <span className="font-medium text-foreground tabular-nums">
            {formatCurrency(weightedValue)}
          </span>
        </p>
      </div>
    </Card>
  );
}
