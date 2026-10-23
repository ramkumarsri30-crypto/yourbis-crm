/** @vitest-environment jsdom */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CreateWorkspaceForm } from "@/app/onboarding/workspace/create-workspace-form";
import { initialWorkspaceFormState } from "@/lib/workspace/form-state";

// The server action is mocked: these tests exercise the form contract
// (visible errors, value preservation across the post-action reset,
// pending state), not the action itself (covered separately).
const createWorkspaceAction = vi.fn();
vi.mock("@/lib/workspace/actions", () => ({
  createWorkspaceAction: (...args: unknown[]) => createWorkspaceAction(...args),
}));

beforeEach(() => {
  createWorkspaceAction.mockReset();
});

describe("CreateWorkspaceForm", () => {
  it("renders a labeled name field and the submit control", () => {
    render(<CreateWorkspaceForm />);

    expect(screen.getByLabelText("Workspace name")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create workspace" })
    ).toBeInTheDocument();
  });

  it("shows the server's safe error and keeps the typed name", async () => {
    const user = userEvent.setup();
    createWorkspaceAction.mockResolvedValue({
      ...initialWorkspaceFormState,
      values: { workspaceName: "Acme" },
      formError: "You cannot create a workspace right now. (ref: a1b2c3d4)",
    });

    render(<CreateWorkspaceForm />);
    await user.type(screen.getByLabelText("Workspace name"), "Acme");
    await user.click(screen.getByRole("button", { name: "Create workspace" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("You cannot create a workspace");
    expect(alert).toHaveTextContent("(ref: a1b2c3d4)");

    // Recoverable failure: the submitted value is re-seeded as the
    // input's defaultValue, surviving React's post-action reset.
    const input = screen.getByLabelText("Workspace name") as HTMLInputElement;
    await waitFor(() => {
      expect(input.defaultValue).toBe("Acme");
    });
  });

  it("flips into a pending state immediately and blocks duplicate submits", async () => {
    const user = userEvent.setup();
    let resolveAction: (value: unknown) => void = () => {};
    createWorkspaceAction.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAction = resolve;
        })
    );

    render(<CreateWorkspaceForm />);
    await user.type(screen.getByLabelText("Workspace name"), "Acme");
    await user.click(screen.getByRole("button", { name: "Create workspace" }));

    const pending = await screen.findByRole("button", { name: /Creating…/ });
    expect(pending).toBeDisabled();
    expect(pending).toHaveAttribute("aria-busy", "true");

    // A second click while in flight must not fire the action again.
    await user.click(pending);
    expect(createWorkspaceAction).toHaveBeenCalledTimes(1);

    resolveAction({ ...initialWorkspaceFormState });
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Create workspace" })
      ).toBeEnabled();
    });
  });

  it("validates locally on blur with the shared name rules", async () => {
    const user = userEvent.setup();
    render(<CreateWorkspaceForm />);

    const input = screen.getByLabelText("Workspace name");
    await user.click(input);
    await user.tab();

    expect(await screen.findByText("Enter a workspace name.")).toBeInTheDocument();
    expect(createWorkspaceAction).not.toHaveBeenCalled();
  });
});
