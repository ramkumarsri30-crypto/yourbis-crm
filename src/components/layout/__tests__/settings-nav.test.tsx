/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SettingsNav } from "@/components/layout/settings-nav";
import type { WorkspaceSummary } from "@/lib/workspace/context";

const usePathname = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => usePathname(),
}));

const ACTIVE: WorkspaceSummary = {
  id: "org-1",
  name: "Acme Inc.",
  role: "owner",
};

beforeEach(() => {
  usePathname.mockReset();
});

describe("SettingsNav", () => {
  it("renders both settings destinations as links", () => {
    usePathname.mockReturnValue("/settings/workspace");
    render(<SettingsNav activeWorkspace={ACTIVE} />);

    expect(
      screen.getByRole("link", { name: "Workspace" })
    ).toHaveAttribute("href", "/settings/workspace");
    expect(screen.getByRole("link", { name: "Team" })).toHaveAttribute(
      "href",
      "/settings/team"
    );
  });

  it("marks the current section and only it as current", () => {
    usePathname.mockReturnValue("/settings/team");
    render(<SettingsNav activeWorkspace={ACTIVE} />);

    expect(screen.getByRole("link", { name: "Team" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByRole("link", { name: "Workspace" })).not.toHaveAttribute(
      "aria-current"
    );
  });

  it("marks the workspace section current on /settings/workspace", () => {
    usePathname.mockReturnValue("/settings/workspace");
    render(<SettingsNav activeWorkspace={ACTIVE} />);

    expect(screen.getByRole("link", { name: "Workspace" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByRole("link", { name: "Team" })).not.toHaveAttribute(
      "aria-current"
    );
  });

  it("shows the active workspace name and the caller's role", () => {
    usePathname.mockReturnValue("/settings/team");
    render(<SettingsNav activeWorkspace={ACTIVE} />);

    expect(screen.getByText("Acme Inc.")).toBeInTheDocument();
    expect(screen.getByText(/your role: Owner/i)).toBeInTheDocument();
  });

  it("renders without a workspace context line when none exists", () => {
    usePathname.mockReturnValue("/settings/workspace");
    render(<SettingsNav activeWorkspace={null} />);

    expect(screen.queryByText(/your role:/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Team" })).toBeInTheDocument();
  });
});
