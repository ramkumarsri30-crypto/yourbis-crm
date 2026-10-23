/**
 * Resend configuration — SERVER-ONLY.
 *
 * Both values are secrets/configuration for the server side:
 *   RESEND_API_KEY     never prefixed with NEXT_PUBLIC_, never in any
 *                      client bundle, never logged.
 *   RESEND_FROM_EMAIL  must be an address on a domain VERIFIED in the
 *                      Resend dashboard. There is no default value on
 *                      purpose: a made-up sender would silently bounce
 *                      or be rejected, and "assume the domain is
 *                      verified" is exactly what must not happen.
 *
 * This module is imported only from server code (server actions /
 * route handlers). Keep it out of any client-importable path.
 */

export interface ResendEnv {
  apiKey: string;
  fromEmail: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Raw env access; null when incomplete (never throws). */
export function readResendEnv(): ResendEnv | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();

  if (!apiKey || !fromEmail) {
    return null;
  }
  // A syntactically invalid sender can never deliver; treat it as
  // unconfigured so callers surface a configuration error instead of a
  // confusing delivery failure later.
  if (!EMAIL_PATTERN.test(fromEmail)) {
    return null;
  }

  return { apiKey, fromEmail };
}

export function isResendConfigured(): boolean {
  return readResendEnv() !== null;
}

/** Configuration guidance shown when email delivery cannot run. */
export const RESEND_CONFIGURATION_MESSAGE =
  "Email delivery is not configured yet. Set RESEND_API_KEY and RESEND_FROM_EMAIL (a verified Resend sender domain) on the server — see docs/SUPABASE_SETUP.md. The invitation was not sent.";
