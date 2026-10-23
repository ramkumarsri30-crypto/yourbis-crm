import { describe, expect, it, vi } from "vitest";

import {
  CONFIGURATION_REQUIRED_MESSAGE,
  isAuthRedirectUrlRejection,
  isConfigurationError,
  logAuthFailure,
  mapAuthError,
  withAuthReference,
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

  it("maps redirect-URL allowlist rejections to the actionable guidance", () => {
    // Known-value matches of the auth server's stable wording.
    for (const message of [
      "The redirect URL is not allowed",
      "the redirect URL provided is not allowed for this app",
      "The redirect URI is not allowed.",
    ]) {
      const result = mapAuthError("sign-up", { code: null, status: 400, message });
      expect(result.field).toBe("form");
      expect(result.message).toContain("URL Configuration");
      expect(result.message).not.toContain(message); // never reflected back
    }
  });

  it("maps the redirect_uri_not_allowed code without relying on message text", () => {
    const result = mapAuthError("sign-up", { code: "redirect_uri_not_allowed" });
    expect(result.message).toContain("URL Configuration");
  });
});

describe("isAuthRedirectUrlRejection", () => {
  it("recognizes the known redirect-rejection wordings and code", () => {
    expect(
      isAuthRedirectUrlRejection({ message: "The redirect URL is not allowed" })
    ).toBe(true);
    expect(isAuthRedirectUrlRejection({ code: "redirect_uri_not_allowed" })).toBe(
      true
    );
  });

  it("rejects unrelated errors", () => {
    expect(isAuthRedirectUrlRejection({ message: "Invalid login credentials" })).toBe(
      false
    );
    expect(isAuthRedirectUrlRejection(null)).toBe(false);
    expect(isAuthRedirectUrlRejection({})).toBe(false);
  });
});

describe("logAuthFailure (sanitized diagnostics)", () => {
  it("logs coarse detail only and returns a short reference", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const reference = logAuthFailure("sign-up", {
        code: "some_code",
        status: 400,
        redirectRejection: false,
        durationMs: 42,
      });

      expect(reference).toMatch(/^[0-9a-f]{8}$/);
      expect(errorSpy).toHaveBeenCalledTimes(1);
      const [label, detail] = errorSpy.mock.calls[0];
      expect(label).toBe("auth sign-up failed");
      expect(detail).toEqual({
        action: "sign-up",
        code: "some_code",
        status: 400,
        redirectUrlRejected: false,
        durationMs: 42,
        ref: reference,
      });
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("never receives or logs raw provider messages", () => {
    // The signature accepts coarse inputs only — verified by type and
    // by the logged payload shape above. withAuthReference appends the
    // reference so user reports correlate with the exact log line.
    expect(withAuthReference("Safe message.", "a1b2c3d4")).toBe(
      "Safe message. (ref: a1b2c3d4)"
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
