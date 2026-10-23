import { describe, expect, it } from "vitest";

import {
  isResendConfigured,
  readResendEnv,
} from "@/lib/email/config";

/**
 * Configuration honesty: no made-up defaults, no silent partial
 * configuration. Missing key, missing sender, or an invalid sender
 * shape all count as NOT configured — callers must surface an explicit
 * error instead of pretending delivery works.
 */
function withResendEnv(
  values: { key?: string; from?: string },
  run: () => void
) {
  const previousKey = process.env.RESEND_API_KEY;
  const previousFrom = process.env.RESEND_FROM_EMAIL;

  if (values.key === undefined) {
    delete process.env.RESEND_API_KEY;
  } else {
    process.env.RESEND_API_KEY = values.key;
  }
  if (values.from === undefined) {
    delete process.env.RESEND_FROM_EMAIL;
  } else {
    process.env.RESEND_FROM_EMAIL = values.from;
  }

  try {
    run();
  } finally {
    if (previousKey === undefined) {
      delete process.env.RESEND_API_KEY;
    } else {
      process.env.RESEND_API_KEY = previousKey;
    }
    if (previousFrom === undefined) {
      delete process.env.RESEND_FROM_EMAIL;
    } else {
      process.env.RESEND_FROM_EMAIL = previousFrom;
    }
  }
}

describe("readResendEnv", () => {
  it("accepts a complete, valid configuration", () => {
    withResendEnv({ key: "re_test_key", from: "no-reply@acme.com" }, () => {
      expect(readResendEnv()).toEqual({
        apiKey: "re_test_key",
        fromEmail: "no-reply@acme.com",
      });
      expect(isResendConfigured()).toBe(true);
    });
  });

  it("rejects missing key or missing sender", () => {
    withResendEnv({ from: "no-reply@acme.com" }, () => {
      expect(readResendEnv()).toBeNull();
      expect(isResendConfigured()).toBe(false);
    });
    withResendEnv({ key: "re_test_key" }, () => {
      expect(readResendEnv()).toBeNull();
    });
    withResendEnv({}, () => {
      expect(readResendEnv()).toBeNull();
    });
  });

  it("rejects syntactically invalid sender addresses", () => {
    withResendEnv({ key: "re_test_key", from: "not-an-address" }, () => {
      expect(readResendEnv()).toBeNull();
      expect(isResendConfigured()).toBe(false);
    });
  });

  it("trims surrounding whitespace from both values", () => {
    withResendEnv({ key: "  re_test_key  ", from: " no-reply@acme.com " }, () => {
      expect(readResendEnv()).toEqual({
        apiKey: "re_test_key",
        fromEmail: "no-reply@acme.com",
      });
    });
  });
});
