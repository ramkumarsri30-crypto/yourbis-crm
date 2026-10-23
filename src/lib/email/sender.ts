import { readResendEnv, type ResendEnv } from "./config";
import {
  invitationEmailHtml,
  invitationEmailSubject,
  invitationEmailText,
  type InvitationEmailModel,
} from "./templates";

/**
 * Email delivery via the Resend HTTP API — SERVER-ONLY, plain fetch (no
 * SDK dependency). The sender is an injectable adapter so automated
 * tests exercise a fake; live delivery runs only with real
 * configuration (never claimed to work without an actual test).
 *
 * Error handling rules (spec sections 5 and 6):
 *   - Failures return `{ delivered: false, reason }` — callers must not
 *     show success. Reasons are coarse ("send-failed") on purpose.
 *   - Logs carry NO secrets (API key), NO recipient address, and NO
 *     token — only a coarse event name plus an HTTP status when one
 *     exists, so operators can diagnose without exposing personal data.
 */

export type EmailDeliveryReason = "not-configured" | "send-failed";

export interface EmailDeliveryResult {
  delivered: boolean;
  reason?: EmailDeliveryReason;
}

export interface EmailSender {
  sendInvitation(model: InvitationEmailModel): Promise<EmailDeliveryResult>;
}

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const REQUEST_TIMEOUT_MS = 10_000;

/** Adapter used in production/development (real Resend API). */
export class ResendSender implements EmailSender {
  private readonly env: ResendEnv;

  constructor(env: ResendEnv) {
    this.env = env;
  }

  async sendInvitation(
    model: InvitationEmailModel
  ): Promise<EmailDeliveryResult> {
    let response: Response;
    try {
      response = await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.env.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from: this.env.fromEmail,
          to: [model.to],
          subject: invitationEmailSubject(model),
          html: invitationEmailHtml(model),
          text: invitationEmailText(model),
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      // Network error, DNS failure, or timeout. No status known; the
      // message stays coarse and free of request contents.
      console.error("invitation email delivery failed", {
        event: "resend-request-error",
      });
      return { delivered: false, reason: "send-failed" };
    }

    if (!response.ok) {
      // Log only the coarse event + status. The response body can
      // contain sender/recipient details — never log it.
      console.error("invitation email delivery failed", {
        event: "resend-api-error",
        status: response.status,
      });
      return { delivered: false, reason: "send-failed" };
    }

    return { delivered: true };
  }
}

/** Not-configured adapter: every send reports a configuration failure. */
export class UnconfiguredEmailSender implements EmailSender {
  // Intentionally takes no argument (a valid, narrower implementation
  // of the interface); callers invoke it through `EmailSender`.
  async sendInvitation(): Promise<EmailDeliveryResult> {
    return { delivered: false, reason: "not-configured" };
  }
}

/** In-memory fake for automated tests (assert calls, simulate failures). */
export class FakeEmailSender implements EmailSender {
  readonly sent: InvitationEmailModel[] = [];
  private readonly result: EmailDeliveryResult;

  constructor(result: EmailDeliveryResult = { delivered: true }) {
    this.result = result;
  }

  async sendInvitation(
    model: InvitationEmailModel
  ): Promise<EmailDeliveryResult> {
    this.sent.push(model);
    return this.result;
  }
}

/**
 * Builds the production sender from the environment, or the
 * not-configured adapter when Resend is not set up. The optional
 * override exists for tests and tooling.
 */
export function createEmailSender(override?: EmailSender): EmailSender {
  if (override) {
    return override;
  }
  const env = readResendEnv();
  if (!env) {
    return new UnconfiguredEmailSender();
  }
  return new ResendSender(env);
}

/**
 * Resolves the acceptance URL for an invitation email. Uses the same
 * per-request origin derivation as the auth flows so links always
 * return to the deployment that sent them.
 */
export function buildAcceptInvitationUrl(
  origin: string,
  rawToken: string
): string {
  return `${origin}/accept-invitation?token=${encodeURIComponent(rawToken)}`;
}
