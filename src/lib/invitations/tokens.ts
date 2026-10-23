import { createHash, randomBytes } from "node:crypto";

/**
 * Invitation token design (see the migration and docs/ARCHITECTURE.md):
 *
 *   raw token   32 cryptographically random bytes, base64url-encoded
 *               (43 chars, ~256 bits of entropy). Only this value ever
 *               travels in the email link — it is never stored, never
 *               logged, never returned in any API response.
 *   token_hash  SHA-256 hex digest (64 chars) of the raw token. The
 *               only representation persisted (unique-constrained for
 *               the acceptance lookup).
 *   lifetime    7 days (the database guard bounds expiry to 30 days).
 *
 * Single use is enforced by the acceptance RPC: the invitation row is
 * locked (SELECT … FOR UPDATE), its status/expiry/email verified, and
 * the status flipped to 'accepted' in the same transaction. A hash
 * lookup that misses, or a row that is not pending, fails identically
 * (no enumeration signal).
 */

export const INVITATION_TOKEN_BYTES = 32;
/** Expected raw-token length: 32 bytes base64url-encoded. */
export const INVITATION_TOKEN_LENGTH = 43;
export const INVITATION_TOKEN_TTL_DAYS = 7;
/** Maximum the database guard accepts (validation ceiling). */
export const INVITATION_TOKEN_MAX_TTL_DAYS = 30;

/** Generates a fresh raw invitation token (43-char base64url). */
export function generateInvitationToken(): string {
  return randomBytes(INVITATION_TOKEN_BYTES).toString("base64url");
}

/** SHA-256 hex digest of a raw token — the only value stored at rest. */
export function hashInvitationToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

/** Expiry timestamp used for new/rotated invitations. */
export function invitationExpiryFrom(now: Date = new Date()): Date {
  return new Date(
    now.getTime() + INVITATION_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  );
}

/** ISO string for PostgREST timestamptz writes. */
export function invitationExpiryIso(now?: Date): string {
  return invitationExpiryFrom(now).toISOString();
}

/**
 * Shape check performed before any database round trip. The RPC
 * re-checks (32–128 chars); this early check keeps obviously-malformed
 * links from costing a query.
 */
export function isPlausibleInvitationToken(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 32 &&
    value.length <= 128 &&
    /^[A-Za-z0-9_-]+$/.test(value)
  );
}
