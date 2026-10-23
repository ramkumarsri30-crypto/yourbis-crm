import { describe, expect, it } from "vitest";

import {
  hasNoErrors,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  validateConfirmPassword,
  validateEmail,
  validateFullName,
  validatePassword,
  validateResetPasswordInput,
  validateSignInInput,
  validateSignUpInput,
} from "@/lib/auth/validation";

describe("validateEmail", () => {
  it("rejects empty input", () => {
    expect(validateEmail("")).toBe("Enter your email address.");
  });

  it("rejects whitespace-only input", () => {
    expect(validateEmail("   ")).toBe("Enter your email address.");
  });

  it("rejects addresses without an @", () => {
    expect(validateEmail("name.company.com")).toBeDefined();
  });

  it("rejects addresses without a domain dot", () => {
    expect(validateEmail("name@company")).toBeDefined();
  });

  it("rejects addresses with spaces", () => {
    expect(validateEmail("name @company.com")).toBeDefined();
  });

  it("rejects overly long input", () => {
    expect(validateEmail(`${"a".repeat(320)}@x.io`)).toBe(
      "This email address is too long."
    );
  });

  it("accepts a normal address (trimmed)", () => {
    expect(validateEmail("  name@company.com ")).toBeUndefined();
  });
});

describe("validatePassword", () => {
  it("rejects empty input", () => {
    expect(validatePassword("")).toBe("Enter a password.");
  });

  it(`rejects fewer than ${PASSWORD_MIN_LENGTH} characters`, () => {
    expect(validatePassword("abc123!")).toBe(
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`
    );
  });

  it(`rejects more than ${PASSWORD_MAX_LENGTH} characters`, () => {
    expect(validatePassword("a".repeat(73))).toBe(
      `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer.`
    );
  });

  it("accepts a valid password", () => {
    expect(validatePassword("correct horse battery")).toBeUndefined();
  });

  it("does not trim whitespace (passwords are literal)", () => {
    // 8 characters *including* the leading space: valid as-is, but only
    // 7 (and invalid) if the validator trimmed — which it must not.
    expect(validatePassword(" abc123!")).toBeUndefined();
  });
});

describe("validateConfirmPassword", () => {
  it("rejects empty confirmation", () => {
    expect(validateConfirmPassword("secret", "")).toBe(
      "Confirm your password."
    );
  });

  it("rejects mismatch", () => {
    expect(validateConfirmPassword("secret", "secreT")).toBe(
      "Passwords do not match."
    );
  });

  it("accepts a match", () => {
    expect(validateConfirmPassword("secret", "secret")).toBeUndefined();
  });
});

describe("validateFullName", () => {
  it("rejects empty input", () => {
    expect(validateFullName("")).toBe("Enter your full name.");
  });

  it("rejects names longer than 120 characters", () => {
    expect(validateFullName("a".repeat(121))).toBe(
      "Name must be 120 characters or fewer."
    );
  });

  it("rejects control characters", () => {
    expect(validateFullName("Bad\u0007Name")).toBe(
      "Name contains invalid characters."
    );
  });

  it("accepts a normal name and trims before measuring", () => {
    expect(validateFullName("  Alex Morgan ")).toBeUndefined();
  });
});

describe("composite validators", () => {
  it("validateSignInInput reports email and password errors together", () => {
    const errors = validateSignInInput({ email: "nope", password: "" });
    expect(errors.email).toBeDefined();
    expect(errors.password).toBeDefined();
    expect(hasNoErrors(errors)).toBe(false);
  });

  it("validateSignInInput passes for valid credentials", () => {
    expect(
      hasNoErrors(
        validateSignInInput({ email: "a@b.co", password: "longenough" })
      )
    ).toBe(true);
  });

  it("validateSignUpInput reports every invalid field", () => {
    const errors = validateSignUpInput({
      fullName: "",
      email: "bad",
      password: "short",
      confirmPassword: "different",
    });
    expect(errors.fullName).toBeDefined();
    expect(errors.email).toBeDefined();
    expect(errors.password).toBeDefined();
    expect(errors.confirmPassword).toBeDefined();
  });

  it("validateSignUpInput passes for valid input", () => {
    expect(
      hasNoErrors(
        validateSignUpInput({
          fullName: "Alex Morgan",
          email: "alex@example.com",
          password: "longenough",
          confirmPassword: "longenough",
        })
      )
    ).toBe(true);
  });

  it("validateResetPasswordInput flags a mismatch", () => {
    const errors = validateResetPasswordInput({
      password: "longenough",
      confirmPassword: "other",
    });
    expect(errors.confirmPassword).toBe("Passwords do not match.");
  });

  it("hasNoErrors is true for an empty error object", () => {
    expect(hasNoErrors({})).toBe(true);
  });
});
