/** @vitest-environment jsdom */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import type { WorkspaceSummary } from "@/lib/workspace/context";

// The switcher's server action is mocked: these tests exercise the
// component's contract (optimistic label, error rollback, no-fake-data
// rendering), not the action itself.
const switchWorkspaceAction = vi.fn();
vi.mock("@/lib/workspace/actions", () => ({
  switchWorkspaceAction: (...args: unknown[]) => switchWorkspaceAction(...args),
}));

const WORKSPACES: WorkspaceSummary[] = [
  { id: "ws-1", name: "Acme Inc.", role: "owner" },
  { id: "ws-2", name: "Globex", role: "member" },
];

// Radix interacts with pointer-capture APIs jsdom does not implement.
beforeEach(() => {
  Element.prototype.hasPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
  switchWorkspaceAction.mockReset();
});

describe("WorkspaceSwitcher", () => {
  it("renders the active workspace and its role label", () => {
    render(
      <WorkspaceSwitcher workspaces={WORKSPACES} activeId="ws-1" />
    );

    expect(screen.getByRole("button", { name: "Switch workspace" }))
      .toHaveTextContent("Acme Inc.");
    expect(screen.getByText("Owner")).toBeInTheDocument();
  });

  it("renders an explicit empty state and stays disabled without workspaces", () => {
    render(<WorkspaceSwitcher workspaces={[]} activeId={null} />);

    const trigger = screen.getByRole("button", { name: "Switch workspace" });
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveTextContent("No workspace");
  });

  it("lists every workspace and switches to the chosen one", async () => {
    const user = userEvent.setup();
    switchWorkspaceAction.mockResolvedValue({ ok: true });
    render(
      <WorkspaceSwitcher workspaces={WORKSPACES} activeId="ws-1" />
    );

    await user.click(screen.getByRole("button", { name: "Switch workspace" }));
    const option = await screen.findByRole("menuitem", { name: /Globex/ });
    await user.click(option);

    await waitFor(() => {
      expect(switchWorkspaceAction).toHaveBeenCalledWith("ws-2");
    });
  });

  it("surfaces a safe error and rolls the label back when switching fails", async () => {
    const user = userEvent.setup();
    switchWorkspaceAction.mockResolvedValue({
      ok: false,
      error: "That workspace is not available for your account.",
    });
    render(
      <WorkspaceSwitcher workspaces={WORKSPACES} activeId="ws-1" />
    );

    await user.click(screen.getByRole("button", { name: "Switch workspace" }));
    const option = await screen.findByRole("menuitem", { name: /Globex/ });
    await user.click(option);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("not available");

    // The label rolls back to the real active workspace.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Switch workspace" }))
        .toHaveTextContent("Acme Inc.");
    });
  });

  it("links to onboarding for creating an additional workspace", async () => {
    const user = userEvent.setup();
    render(
      <WorkspaceSwitcher workspaces={WORKSPACES} activeId="ws-1" />
    );

    await user.click(screen.getByRole("button", { name: "Switch workspace" }));
    const link = await screen.findByRole("menuitem", { name: /New workspace/ });
    // asChild merges the anchor into the menu item — the item IS the link.
    expect(link).toHaveAttribute("href", "/onboarding/workspace");
  });
});
