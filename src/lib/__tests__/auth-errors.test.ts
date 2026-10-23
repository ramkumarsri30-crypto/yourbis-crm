import { describe, expect, it } from "vitest";

import {
  CONFIGURATION_REQUIRED_MESSAGE,
  isConfigurationError,
  mapAuthError,
} from "@/lib/auth/errors";

describe("mapAuthError — rate limiting", () => {
  it.each([
    "over_request_rate_limit",
    "over_email_send_rate_limit",
    "over_sms_send_rate_limit",
  ])("maps %s to the shared throttle message", (code) => {
    const result = mapAuthError("sign-in", { code });
    expect(result.message).toBe(
      "Too many attempts. Please wait a minute and try again."
    );
  });

  it("maps HTTP 429 to the throttle message regardless of code", () => {
    expect(mapAuthError("sign-up", { status: 429 }).message).toContain(
      "Too many attempts"
    );
  });
});

describe("mapAuthError — sign-in", () => {
  it("uses one identical message for invalid credentials and bad requests", () => {
    const a = mapAuthError("sign-in", { code: "invalid_credentials" });
    const b = mapAuthError("sign-in", { status: 400 });
    expect(a.message).toBe("Incorrect email or password.");
    expect(a.message).toBe(b.message);
  });

  it("never discloses whether the email exists", () => {
    // Unknown email and wrong password must be indistinguishable.
    expect(mapAuthError("sign-in", { code: "invalid_credentials" }).message).not
      .toMatch(/no account|not found|unknown/i);
  });

  it("guides unconfirmed users to their inbox", () => {
    expect(mapAuthError("sign-in", { code: "email_not_confirmed" }).message)
      .toContain("confirm your email");
  });

  it("reports suspended accounts without internals", () => {
    expect(mapAuthError("sign-in", { code: "user_banned" }).message).toBe(
      "This account has been suspended."
    );
  });

  it("falls back to a generic message for unknown codes", () => {
    const result = mapAuthError("sign-in", { code: "some_new_failure" });
    expect(result.message).toBe(
      "Unable to sign in. Check your email and password, then try again."
    );
  });

  it("is generic for a null/undefined error", () => {
    expect(mapAuthError("sign-in", null).message).toContain("Unable to sign in");
  });
});

describe("mapAuthError — sign-up", () => {
  it("maps existing-account codes to the email field", () => {
    for (const code of ["user_already_exists", "email_exists"]) {
      const result = mapAuthError("sign-up", { code });
      expect(result.field).toBe("email");
      expect(result.message).toContain("already exists");
    }
  });

  it("maps HTTP 422 to the existing-account message", () => {
    expect(mapAuthError("sign-up", { status: 422 }).field).toBe("email");
  });

  it("maps weak passwords to the password field", () => {
    expect(mapAuthError("sign-up", { code: "weak_password" }).field).toBe(
      "password"
    );
  });

  it("falls back to a generic sign-up message", () => {
    expect(mapAuthError("sign-up", { code: "????" }).message).toBe(
      "Unable to create your account. Please try again."
    );
  });
});

describe("mapAuthError — forgot-password (anti-enumeration)", () => {
  it("uses the same generic message for every failure", () => {
    const notFound = mapAuthError("forgot-password", { code: "user_not_found" });
    const other = mapAuthError("forgot-password", { code: "anything_else" });
    expect(notFound.message).toBe(other.message);
    // The action additionally converts `user_not_found` into the success
    // panel; the mapper itself must never leak the distinction.
    expect(notFound.message).not.toMatch(/no account|not found|unknown/i);
  });
});

describe("mapAuthError — reset-password", () => {
  it("maps same_password and weak_password to the password field", () => {
    expect(mapAuthError("reset-password", { code: "same_password" }).field).toBe(
      "password"
    );
    expect(mapAuthError("reset-password", { code: "weak_password" }).field).toBe(
      "password"
    );
  });

  it("falls back to a generic reset message", () => {
    expect(mapAuthError("reset-password", { code: "????" }).message).toBe(
      "Unable to update your password. Please try again."
    );
  });
});

describe("configuration-error handling", () => {
  it("isConfigurationError recognizes the SupabaseNotConfiguredError shape", () => {
    const error = new Error("boom");
    error.name = "SupabaseNotConfiguredError";
    expect(isConfigurationError(error)).toBe(true);
    expect(isConfigurationError(new Error("boom"))).toBe(false);
    expect(isConfigurationError("not an error")).toBe(false);
  });

  it("exposes actionable configuration guidance", () => {
    expect(CONFIGURATION_REQUIRED_MESSAGE).toContain(
      "NEXT_PUBLIC_SUPABASE_URL"
    );
    expect(CONFIGURATION_REQUIRED_MESSAGE).toContain(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
    );
  });
});
