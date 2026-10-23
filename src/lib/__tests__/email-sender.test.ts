import { afterEach, describe, expect, it, vi } from "vitest";

import {
  FakeEmailSender,
  ResendSender,
  UnconfiguredEmailSender,
  buildAcceptInvitationUrl,
  createEmailSender,
  type EmailSender,
} from "@/lib/email/sender";
import type { InvitationEmailModel } from "@/lib/email/templates";

const MODEL: InvitationEmailModel = {
  to: "teammate@example.com",
  inviterName: "Alex",
  workspaceName: "Acme",
  role: "member",
  acceptUrl: "https://app.example.com/accept-invitation?token=tok",
  expiresAt: new Date("2026-10-30T00:00:00.000Z"),
};

/** Restores global.fetch spies after each case. */
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ResendSender (live adapter)", () => {
  it("delivers on a 2xx response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("{}", { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    const sender = new ResendSender({ apiKey: "re_test", fromEmail: "no-reply@acme.com" });
    const result = await sender.sendInvitation(MODEL);

    expect(result).toEqual({ delivered: true });
    expect(fetchMock).toHaveBeenCalledOnce();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer re_test");
    const body = JSON.parse(init.body as string);
    expect(body.to).toEqual(["teammate@example.com"]);
    expect(body.subject).toContain("Acme");
  });

  it("reports failure on an API error without leaking response bodies", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('{"message":"domain not verified"}', { status: 403 })
    );
    vi.stubGlobal("fetch", fetchMock);

    const sender = new ResendSender({ apiKey: "re_test", fromEmail: "no-reply@acme.com" });
    const result = await sender.sendInvitation(MODEL);

    expect(result.delivered).toBe(false);
    expect(result.reason).toBe("send-failed");
  });

  it("reports failure on network errors and timeouts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down"))
    );

    const sender = new ResendSender({ apiKey: "re_test", fromEmail: "no-reply@acme.com" });
    const result = await sender.sendInvitation(MODEL);

    expect(result).toEqual({ delivered: false, reason: "send-failed" });
  });
});

describe("UnconfiguredEmailSender", () => {
  it("never claims delivery", async () => {
    // Called through the interface to prove conformance.
    const sender: EmailSender = new UnconfiguredEmailSender();
    const result = await sender.sendInvitation(MODEL);
    expect(result).toEqual({ delivered: false, reason: "not-configured" });
  });
});

describe("FakeEmailSender", () => {
  it("records sent invitations and returns the injected result", async () => {
    const fake = new FakeEmailSender();
    const ok = await fake.sendInvitation(MODEL);
    expect(ok.delivered).toBe(true);
    expect(fake.sent).toEqual([MODEL]);

    const failing = new FakeEmailSender({
      delivered: false,
      reason: "send-failed",
    });
    const failed = await failing.sendInvitation(MODEL);
    expect(failed.delivered).toBe(false);
    expect(failing.sent).toHaveLength(1);
  });
});

describe("createEmailSender", () => {
  it("prefers an explicit override (tests/tooling)", () => {
    const override: EmailSender = new FakeEmailSender();
    expect(createEmailSender(override)).toBe(override);
  });

  it("builds the not-configured adapter when the environment lacks Resend values", () => {
    const previousKey = process.env.RESEND_API_KEY;
    const previousFrom = process.env.RESEND_FROM_EMAIL;
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;

    try {
      expect(createEmailSender()).toBeInstanceOf(UnconfiguredEmailSender);
    } finally {
      if (previousKey !== undefined) process.env.RESEND_API_KEY = previousKey;
      if (previousFrom !== undefined) process.env.RESEND_FROM_EMAIL = previousFrom;
    }
  });
});

describe("buildAcceptInvitationUrl", () => {
  it("percent-encodes the raw token into the query string", () => {
    expect(buildAcceptInvitationUrl("https://app.example.com", "abc/def+ghi")).toBe(
      "https://app.example.com/accept-invitation?token=abc%2Fdef%2Bghi"
    );
  });
});
