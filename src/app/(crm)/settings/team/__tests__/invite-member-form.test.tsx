/** @vitest-environment jsdom */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { InviteMemberForm } from "@/app/(crm)/settings/team/invite-member-form";
import { initialWorkspaceFormState } from "@/lib/workspace/form-state";

const inviteMemberAction = vi.fn();
vi.mock("@/lib/workspace/actions", () => ({
  inviteMemberAction: (...args: unknown[]) => inviteMemberAction(...args),
}));

beforeEach(() => {
  inviteMemberAction.mockReset();
});

describe("InviteMemberForm", () => {
  it("offers every invitable role to owners and never 'owner'", () => {
    render(<InviteMemberForm actorRole="owner" />);

    const roleSelect = screen.getByLabelText("Role") as HTMLSelectElement;
    const options = Array.from(roleSelect.options).map((o) => o.value);
    expect(options).toEqual(["admin", "member", "viewer"]);
    expect(options).not.toContain("owner");
  });

  it("restricts admins to member/viewer roles, mirroring the database policy", () => {
    render(<InviteMemberForm actorRole="admin" />);

    const roleSelect = screen.getByLabelText("Role") as HTMLSelectElement;
    const options = Array.from(roleSelect.options).map((o) => o.value);
    expect(options).toEqual(["member", "viewer"]);
  });

  it("shows the server's error and preserves the typed email on failure", async () => {
    const user = userEvent.setup();
    inviteMemberAction.mockResolvedValue({
      ...initialWorkspaceFormState,
      values: { inviteEmail: "teammate@company.com", inviteRole: "member" },
      formError: "The invitation was created, but the email could not be delivered. (ref: a1b2c3d4)",
    });

    render(<InviteMemberForm actorRole="owner" />);
    await user.type(
      screen.getByLabelText("Email address"),
      "teammate@company.com"
    );
    await user.click(screen.getByRole("button", { name: "Send invitation" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("could not be delivered");

    const input = screen.getByLabelText("Email address") as HTMLInputElement;
    await waitFor(() => {
      expect(input.defaultValue).toBe("teammate@company.com");
    });
  });

  it("clears the form for the next invite after a confirmed success", async () => {
    const user = userEvent.setup();
    inviteMemberAction.mockResolvedValue({
      ...initialWorkspaceFormState,
      success: {
        title: "Invitation sent to teammate@company.com.",
        description: "They will join as member once they accept.",
      },
    });

    render(<InviteMemberForm actorRole="owner" />);
    await user.type(
      screen.getByLabelText("Email address"),
      "teammate@company.com"
    );
    await user.click(screen.getByRole("button", { name: "Send invitation" }));

    expect(await screen.findByText(/Invitation sent/)).toBeInTheDocument();

    const input = screen.getByLabelText("Email address") as HTMLInputElement;
    await waitFor(() => {
      // Success state carries no echoed values — the post-action reset
      // clears the input for the next invitation.
      expect(input.defaultValue).toBe("");
    });
  });
});
