import type { Metadata } from "next";
import {
  ChartColumn,
  FlaskConical,
  Handshake,
  ListChecks,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/shared/metric-card";
import { PageHeader } from "@/components/shared/page-header";
import { PipelineOverview } from "@/components/dashboard/pipeline-overview";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { RecentLeadsTable } from "@/components/dashboard/recent-leads-table";
import { UpcomingTasks } from "@/components/dashboard/upcoming-tasks";
import { DEMO_KPIS } from "@/lib/demo-data";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { KpiId } from "@/types";

export const metadata: Metadata = {
  title: "Sales overview",
};

const kpiIcons: Record<KpiId, LucideIcon> = {
  "total-leads": Users,
  "open-deals": Handshake,
  "weighted-pipeline": ChartColumn,
  "tasks-due": ListChecks,
};

function formatKpiValue(id: KpiId, value: number): string {
  return id === "weighted-pipeline" ? formatCurrency(value) : formatNumber(value);
}

/**
 * Overview dashboard. Every record and metric on this page comes from
 * the clearly-labeled demonstration dataset in `src/lib/demo-data.ts`;
 * no live CRM data exists in Phase 1.
 */
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales overview"
        description="Monitor pipeline health, recent team activity, and upcoming work."
        badge={
          <Badge
            variant="outline"
            className="gap-1.5 text-muted-foreground"
            title="All metrics and records on this page are hand-authored demonstration data."
          >
            <FlaskConical aria-hidden="true" />
            Demo data
          </Badge>
        }
      />

      <section
        aria-label="Key metrics"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {DEMO_KPIS.map((kpi) => (
          <MetricCard
            key={kpi.id}
            label={kpi.label}
            value={formatKpiValue(kpi.id, kpi.value)}
            description={kpi.description}
            trend={kpi.trend}
            icon={kpiIcons[kpi.id]}
          />
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <PipelineOverview className="lg:col-span-2" />
        <RecentActivity />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <RecentLeadsTable className="lg:col-span-2" />
        <UpcomingTasks />
      </div>

      <p className="text-xs text-muted-foreground">
        All metrics, records, and activity on this page are hand-authored
        demonstration data for the Phase 1 prototype. No live CRM data is
        connected, and trend values are illustrative only.
      </p>
    </div>
  );
}
