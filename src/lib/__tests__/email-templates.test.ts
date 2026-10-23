import { describe, expect, it } from "vitest";

import {
  invitationEmailHtml,
  invitationEmailSubject,
  invitationEmailText,
  type InvitationEmailModel,
} from "@/lib/email/templates";

/**
 * Email bodies embed user-controlled strings (inviter name, workspace
 * name) and the raw acceptance token. Tests pin: HTML escaping, token
 * presence only in the link, and no secrets beyond the intended
 * content.
 */
const MODEL: InvitationEmailModel = {
  to: "teammate@example.com",
  inviterName: 'Alex "The Closer" <script>alert(1)</script>',
  workspaceName: "Acme & Sons <b>LLC</b>",
  role: "member",
  acceptUrl: "https://app.example.com/accept-invitation?token=abc123_DEF-456",
  expiresAt: new Date("2026-10-30T00:00:00.000Z"),
};

describe("invitation email templates", () => {
  it("subjects include inviter and workspace names", () => {
    const subject = invitationEmailSubject(MODEL);
    expect(subject).toContain("Acme & Sons <b>LLC</b>");
    expect(subject).toContain("invited you to join");
    expect(subject).toContain("CRM Workspace");
  });

  it("text bodies include the acceptance link and role", () => {
    const text = invitationEmailText(MODEL);
    expect(text).toContain(MODEL.acceptUrl);
    expect(text).toContain("member");
    expect(text).toContain("October 30, 2026");
    expect(text).toContain("ignore this email");
  });

  it("HTML bodies escape user-controlled strings", () => {
    const html = invitationEmailHtml(MODEL);
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b>LLC</b>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Acme &amp; Sons");
  });

  it("HTML bodies carry the token only inside the link attributes", () => {
    const html = invitationEmailHtml(MODEL);
    expect(html).toContain(MODEL.acceptUrl);
    // The token appears exactly twice: button href + fallback link.
    expect(html.split("abc123_DEF-456").length - 1).toBe(2);
  });

  it("renders every invitable role without throwing", () => {
    for (const role of ["admin", "member", "viewer"] as const) {
      const model = { ...MODEL, role };
      expect(invitationEmailText(model)).toContain(role);
      expect(invitationEmailHtml(model)).toContain(role);
    }
  });
});
