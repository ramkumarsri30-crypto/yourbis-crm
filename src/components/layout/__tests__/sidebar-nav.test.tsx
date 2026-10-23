/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SidebarNav } from "@/components/layout/sidebar-nav";

const usePathname = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => usePathname(),
}));

beforeEach(() => {
  usePathname.mockReset();
});

describe("SidebarNav", () => {
  it("renders available items as links and upcoming items as disabled controls", () => {
    usePathname.mockReturnValue("/");
    render(<SidebarNav />);

    const overview = screen.getByRole("link", { name: "Overview" });
    expect(overview).toHaveAttribute("href", "/");

    const settings = screen.getByRole("link", { name: "Settings" });
    expect(settings).toHaveAttribute("href", "/settings");

    // Upcoming modules never navigate — visibly disabled, no href.
    const leads = screen.getByRole("button", { name: /Leads/ });
    expect(leads).toBeDisabled();

    const deals = screen.getByRole("button", { name: /Deals/ });
    expect(deals).toBeDisabled();
  });

  it("keeps the Settings entry highlighted on every settings section", () => {
    usePathname.mockReturnValue("/settings/team");
    render(<SidebarNav />);

    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("keeps the Settings entry highlighted on the settings hub itself", () => {
    usePathname.mockReturnValue("/settings");
    render(<SidebarNav />);

    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("highlights Overview only on the dashboard route", () => {
    usePathname.mockReturnValue("/settings/workspace");
    render(<SidebarNav />);

    expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute(
      "aria-current"
    );
  });
});
