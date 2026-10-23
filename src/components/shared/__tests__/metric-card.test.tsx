/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { Users } from "lucide-react";
import { describe, expect, it } from "vitest";

import { MetricCard } from "@/components/shared/metric-card";

describe("MetricCard", () => {
  it("renders label, value, and description", () => {
    render(
      <MetricCard
        label="Total leads"
        value="348"
        description="24 added this month"
        icon={Users}
      />
    );

    expect(screen.getByText("Total leads")).toBeInTheDocument();
    expect(screen.getByText("348")).toBeInTheDocument();
    expect(screen.getByText("24 added this month")).toBeInTheDocument();
  });

  it("renders without an icon", () => {
    render(<MetricCard label="Open deals" value="42" description="Across 4 stages" />);
    expect(screen.getByText("Open deals")).toBeInTheDocument();
  });

  it("renders trend value and context when a trend is provided", () => {
    render(
      <MetricCard
        label="Total leads"
        value="348"
        description="24 added this month"
        trend={{
          direction: "up",
          semantics: "positive",
          value: "+7.4%",
          label: "vs previous period",
        }}
      />
    );

    expect(screen.getByText("+7.4%")).toBeInTheDocument();
    expect(screen.getByText("vs previous period")).toBeInTheDocument();
  });

  it("marks unfavorable trends with the destructive tone", () => {
    render(
      <MetricCard
        label="Tasks due"
        value="8"
        description="3 overdue · 5 due today"
        trend={{
          direction: "up",
          semantics: "negative",
          value: "+2",
          label: "vs yesterday",
        }}
      />
    );

    expect(screen.getByText("+2").className).toContain("text-destructive");
  });

  it("omits the trend line when no trend is provided", () => {
    render(
      <MetricCard label="Open deals" value="42" description="Across 4 stages" />
    );

    expect(screen.queryByText("vs previous period")).not.toBeInTheDocument();
    expect(screen.getByText("Across 4 stages")).toBeInTheDocument();
  });
});
