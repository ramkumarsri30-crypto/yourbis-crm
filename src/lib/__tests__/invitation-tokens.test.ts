import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  INVITATION_TOKEN_LENGTH,
  INVITATION_TOKEN_TTL_DAYS,
  generateInvitationToken,
  hashInvitationToken,
  invitationExpiryFrom,
  invitationExpiryIso,
  isPlausibleInvitationToken,
} from "@/lib/invitations/tokens";

/**
 * Token design: 32 random bytes (base64url, 43 chars, ~256 bits), only
 * the SHA-256 hex digest is stored, 7-day lifetime. These tests pin the
 * shape guarantees the acceptance RPC's bounds rely on.
 */
describe("invitation tokens", () => {
  it("generates 43-char base64url tokens", () => {
    for (let i = 0; i < 20; i += 1) {
      const token = generateInvitationToken();
      expect(token).toHaveLength(INVITATION_TOKEN_LENGTH);
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it("generates unpredictable tokens (no repeats across draws)", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateInvitationToken()));
    expect(tokens.size).toBe(50);
  });

  it("hashes tokens with SHA-256 hex (64 chars), never storing the raw value", () => {
    const token = generateInvitationToken();
    const hash = hashInvitationToken(token);

    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
    expect(hash).toBe(
      createHash("sha256").update(token, "utf8").digest("hex")
    );
    expect(hash).not.toBe(token);
  });

  it("produces stable hashes regardless of instance", () => {
    expect(hashInvitationToken("abc123")).toBe(
      hashInvitationToken("abc123")
    );
  });

  it("plausibility-checks shape before any database round trip", () => {
    expect(isPlausibleInvitationToken(generateInvitationToken())).toBe(true);
    expect(isPlausibleInvitationToken("short")).toBe(false);
    expect(
      isPlausibleInvitationToken("a".repeat(31))
    ).toBe(false);
    expect(
      isPlausibleInvitationToken(`bad chars ${"x".repeat(30)}`)
    ).toBe(false);
    expect(isPlausibleInvitationToken(12345)).toBe(false);
    expect(isPlausibleInvitationToken(null)).toBe(false);
    expect(isPlausibleInvitationToken(undefined)).toBe(false);
  });

  it("computes expiry exactly 7 days out, in the past for old dates", () => {
    const now = new Date("2026-10-23T00:00:00.000Z");
    const expiry = invitationExpiryFrom(now);

    expect(expiry.getTime() - now.getTime()).toBe(
      INVITATION_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
    );
    expect(invitationExpiryIso(now)).toBe(expiry.toISOString());
    expect(invitationExpiryIso(now)).toBe("2026-10-30T00:00:00.000Z");
  });
});
