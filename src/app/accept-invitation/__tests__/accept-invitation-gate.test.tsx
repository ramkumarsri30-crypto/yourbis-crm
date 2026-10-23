/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AcceptInvitationGate } from "../accept-invitation-gate";

/**
 * Entry choice for signed-out invitees (Phase 3 follow-up): both the
 * sign-up and the sign-in path must carry the FULL acceptance URL
 * (token included) as `next`, so either path lands right back on the
 * acceptance screen after authentication.
 */

/** A valid-shape 43-char base64url token. */
const TOKEN = "t".repeat(43);
const ACCEPT_URL = `/accept-invitation?token=${TOKEN}`;

describe("AcceptInvitationGate", () => {
  it("renders both entry points", () => {
    render(<AcceptInvitationGate acceptUrl={ACCEPT_URL} />);

    expect(
      screen.getByRole("link", { name: "Create an account to accept" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "I already have an account" })
    ).toBeInTheDocument();
  });

  it("preserves the full acceptance URL (token included) as next on BOTH paths", () => {
    render(<AcceptInvitationGate acceptUrl={ACCEPT_URL} />);
    const expectedNext = encodeURIComponent(ACCEPT_URL);

    expect(screen.getByRole("link", { name: "Create an account to accept" }))
      .toHaveAttribute("href", `/sign-up?next=${expectedNext}`);
    expect(screen.getByRole("link", { name: "I already have an account" }))
      .toHaveAttribute("href", `/sign-in?next=${expectedNext}`);
  });

  it("double-encodes safely: the token never breaks out of the next param", () => {
    // base64url tokens cannot contain &, but the gate must be robust
    // for any acceptUrl value it is handed.
    const hostile = "/accept-invitation?token=abc&injected=1";
    render(<AcceptInvitationGate acceptUrl={hostile} />);

    const href = screen
      .getByRole("link", { name: "Create an account to accept" })
      .getAttribute("href");
    expect(href).toBe(
      `/sign-up?next=${encodeURIComponent(hostile)}`
    );
  });

  it("explains the constraints (single email, expiry) without leaking internals", () => {
    render(<AcceptInvitationGate acceptUrl={ACCEPT_URL} />);

    const note = screen.getByText(/expires in 7 days/i);
    expect(note).toBeInTheDocument();
    expect(note).toHaveTextContent(/email address it was sent to/);
  });
});
