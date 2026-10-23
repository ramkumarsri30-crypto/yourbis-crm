/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** Installs a matchMedia stub reporting the given hover capability. */
function stubHoverCapability(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
  );
}

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

describe("UserMenu — hover-capable pointers (desktop)", () => {
  it("opens on pointer-enter of the trigger without any click", () => {
    stubHoverCapability(true);
    render(<UserMenu user={USER} />);

    fireEvent.mouseEnter(screen.getByRole("button", { name: "Open account menu" }));

    expect(screen.getByText("alex.morgan@example.com")).toBeInTheDocument();
  });

  it("closes after the pointer leaves, honoring the grace delay", async () => {
    stubHoverCapability(true);
    render(<UserMenu user={USER} />);
    const trigger = screen.getByRole("button", { name: "Open account menu" });

    fireEvent.mouseEnter(trigger);
    expect(screen.getByText("alex.morgan@example.com")).toBeInTheDocument();

    // Leaving does not close instantly (grace period to reach the menu).
    fireEvent.mouseLeave(trigger);
    expect(screen.getByText("alex.morgan@example.com")).toBeInTheDocument();

    // After the grace delay the menu closes. Real timers: the 150ms
    // delay is the behavior under test, and waitFor polls past it.
    await waitFor(
      () =>
        expect(
          screen.queryByText("alex.morgan@example.com")
        ).not.toBeInTheDocument(),
      { timeout: 1000 }
    );
  });
});

describe("UserMenu — touch pointers (phones/tablets)", () => {
  it("does NOT open on (synthesized) pointer-enter — tap is the entry", () => {
    stubHoverCapability(false);
    render(<UserMenu user={USER} />);

    fireEvent.mouseEnter(screen.getByRole("button", { name: "Open account menu" }));

    expect(
      screen.queryByText("alex.morgan@example.com")
    ).not.toBeInTheDocument();
  });

  it("opens on tap and closes on an outside tap", async () => {
    stubHoverCapability(false);
    const user = userEvent.setup();
    render(
      <div>
        <UserMenu user={USER} />
        <button type="button">Elsewhere</button>
      </div>
    );

    await user.click(screen.getByRole("button", { name: "Open account menu" }));
    expect(screen.getByText("alex.morgan@example.com")).toBeInTheDocument();

    // Tapping anywhere outside closes the menu (Radix behavior). The
    // events are dispatched directly: while the menu is open Radix
    // both hides outside content from the accessibility tree AND sets
    // pointer-events:none on it (which user-event honors), so a raw
    // pointer sequence on the element is the faithful simulation.
    const elsewhere = screen.getByText("Elsewhere");
    fireEvent.pointerDown(elsewhere);
    fireEvent.pointerUp(elsewhere);
    fireEvent.click(elsewhere);
    await waitFor(() =>
      expect(
        screen.queryByText("alex.morgan@example.com")
      ).not.toBeInTheDocument()
    );
  });
});
