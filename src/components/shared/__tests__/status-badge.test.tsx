/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  STATUS_CONFIG,
  StatusBadge,
} from "@/components/shared/status-badge";

describe("StatusBadge", () => {
  it("renders a readable label for every configured status", () => {
    for (const status of Object.keys(
      STATUS_CONFIG
    ) as Array<keyof typeof STATUS_CONFIG>) {
      const { unmount } = render(<StatusBadge status={status} />);
      expect(
        screen.getByText(STATUS_CONFIG[status].label)
      ).toBeInTheDocument();
      unmount();
    }
  });

  it("applies the info tone to new leads", () => {
    render(<StatusBadge status="new" />);
    expect(screen.getByText("New").className).toContain("text-primary");
  });

  it("applies the success tone to qualified leads", () => {
    render(<StatusBadge status="qualified" />);
    expect(screen.getByText("Qualified").className).toContain("text-success");
  });

  it("applies the warning tone to tasks due today", () => {
    render(<StatusBadge status="today" />);
    expect(screen.getByText("Due today").className).toContain("text-warning");
  });

  it("applies the destructive tone to overdue tasks", () => {
    render(<StatusBadge status="overdue" />);
    expect(screen.getByText("Overdue").className).toContain(
      "text-destructive"
    );
  });

  it("applies the neutral tone to upcoming tasks", () => {
    render(<StatusBadge status="upcoming" />);
    expect(screen.getByText("Upcoming").className).toContain(
      "text-muted-foreground"
    );
  });
});
