/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UserMenu } from "@/components/layout/user-menu";
import type { ProfileView } from "@/lib/auth/profile";

const USER: ProfileView = {
  displayName: "Alex Morgan",
  initials: "AM",
  email: "alex.morgan@example.com",
};

// Radix interacts with pointer-capture APIs jsdom does not implement.
beforeEach(() => {
  Element.prototype.hasPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

describe("UserMenu", () => {
  it("shows the signed-in user's name and initials on the trigger", () => {
    render(<UserMenu user={USER} />);

    expect(screen.getByRole("button", { name: "Open account menu" }))
      .toHaveTextContent("Alex Morgan");
    expect(screen.getByText("AM")).toBeInTheDocument();
  });

  it("falls back to the email when no display name exists", () => {
    render(
      <UserMenu user={{ displayName: null, initials: "S", email: "sam@example.com" }} />
    );

    expect(screen.getByRole("button", { name: "Open account menu" }))
      .toHaveTextContent("sam@example.com");
  });

  it("opens the menu with the user's identity and a working sign-out form", async () => {
    const user = userEvent.setup();
    render(<UserMenu user={USER} />);

    await user.click(screen.getByRole("button", { name: "Open account menu" }));

    // Identity block inside the menu.
    expect(screen.getAllByText("Alex Morgan").length).toBeGreaterThan(1);
    expect(screen.getByText("alex.morgan@example.com")).toBeInTheDocument();

    // Sign out is a plain POST form to the sign-out route handler —
    // functional without client-side JavaScript.
    const form = screen.getByText("Sign out").closest("form");
    expect(form).not.toBeNull();
    expect(form).toHaveAttribute("action", "/auth/sign-out");
    expect(form).toHaveAttribute("method", "post");
    expect(
      screen.getByRole("menuitem", { name: "Sign out" })
    ).toBeInTheDocument();
  });

  it("keeps unimplemented entries visibly disabled (no fake controls)", async () => {
    const user = userEvent.setup();
    render(<UserMenu user={USER} />);

    await user.click(screen.getByRole("button", { name: "Open account menu" }));

    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /Profile/ })
    ).toHaveAttribute("aria-disabled", "true");
    expect(
      screen.getByRole("menuitem", { name: /Preferences/ })
    ).toHaveAttribute("aria-disabled", "true");
  });
});
