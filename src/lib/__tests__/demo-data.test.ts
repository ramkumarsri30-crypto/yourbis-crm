import { describe, expect, it } from "vitest";

import {
  DEMO_ACTIVITIES,
  DEMO_KPIS,
  DEMO_LEADS,
  DEMO_PIPELINE_STAGES,
  DEMO_TASKS,
  OPEN_STAGE_IDS,
} from "@/lib/demo-data";
import type { PipelineStage } from "@/types";

/**
 * The demonstration dataset is the only data source in Phase 1, so its
 * internal consistency is worth protecting: if someone edits the mock
 * numbers, these tests force the KPIs to stay coherent with the
 * underlying records.
 */

const openStages = DEMO_PIPELINE_STAGES.filter((stage) =>
  (OPEN_STAGE_IDS as readonly string[]).includes(stage.id)
);

function kpi(id: string) {
  const metric = DEMO_KPIS.find((kpi) => kpi.id === id);
  if (!metric) throw new Error(`Missing KPI: ${id}`);
  return metric;
}

describe("demo data integrity", () => {
  it("contains the four expected KPIs", () => {
    expect(DEMO_KPIS.map((kpi) => kpi.id)).toEqual([
      "total-leads",
      "open-deals",
      "weighted-pipeline",
      "tasks-due",
    ]);
  });

  it("keeps the open-deals KPI equal to the sum of open pipeline stages", () => {
    const openDealCount = openStages.reduce(
      (sum, stage) => sum + stage.dealCount,
      0
    );
    expect(kpi("open-deals").value).toBe(openDealCount);
  });

  it("keeps the weighted-pipeline KPI derived from stage values and likelihoods", () => {
    const weightedValue = openStages.reduce(
      (sum, stage) => sum + stage.value * stage.winLikelihood,
      0
    );
    expect(kpi("weighted-pipeline").value).toBe(Math.round(weightedValue));
  });

  it("uses win likelihoods between 0 and 1, ordered sensibly", () => {
    const openSorted = [...openStages].sort(
      (a: PipelineStage, b: PipelineStage) => a.winLikelihood - b.winLikelihood
    );
    for (const stage of DEMO_PIPELINE_STAGES) {
      expect(stage.winLikelihood).toBeGreaterThanOrEqual(0);
      expect(stage.winLikelihood).toBeLessThanOrEqual(1);
    }
    expect(openSorted.map((stage) => stage.id)).toEqual([
      "new",
      "qualified",
      "proposal",
      "negotiation",
    ]);
  });

  it("gives every lead a unique id and a parseable timestamp", () => {
    const ids = new Set(DEMO_LEADS.map((lead) => lead.id));
    expect(ids.size).toBe(DEMO_LEADS.length);
    for (const lead of DEMO_LEADS) {
      expect(Number.isNaN(Date.parse(lead.createdAt))).toBe(false);
      expect(lead.email).toMatch(/@/);
    }
  });

  it("gives every activity a unique id and a parseable timestamp", () => {
    const ids = new Set(DEMO_ACTIVITIES.map((activity) => activity.id));
    expect(ids.size).toBe(DEMO_ACTIVITIES.length);
    for (const activity of DEMO_ACTIVITIES) {
      expect(Number.isNaN(Date.parse(activity.timestamp))).toBe(false);
    }
  });

  it("gives every task a unique id and a parseable due timestamp", () => {
    const ids = new Set(DEMO_TASKS.map((task) => task.id));
    expect(ids.size).toBe(DEMO_TASKS.length);
    for (const task of DEMO_TASKS) {
      expect(Number.isNaN(Date.parse(task.dueAt))).toBe(false);
    }
  });

  it("keeps the tasks-due KPI consistent with the task list", () => {
    const dueNow = DEMO_TASKS.filter(
      (task) => task.status === "today" || task.status === "overdue"
    ).length;
    // The KPI counts everything due today plus the overdue backlog; the
    // list shows only the next five demonstration items.
    expect(kpi("tasks-due").value).toBeGreaterThanOrEqual(dueNow);
  });
});
