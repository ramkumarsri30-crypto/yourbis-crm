import { describe, expect, it } from "vitest";

import {
  fallbackProfileView,
  initialsFor,
  sanitizeDisplayName,
} from "@/lib/auth/profile";
import { DISPLAY_NAME_MAX_LENGTH } from "@/lib/auth/validation";

describe("sanitizeDisplayName", () => {
  it("returns null for non-string input", () => {
    expect(sanitizeDisplayName(null)).toBeNull();
    expect(sanitizeDisplayName(undefined)).toBeNull();
  });

  it("strips control characters", () => {
    expect(sanitizeDisplayName("A\u0000lex\u007f")).toBe("Alex");
  });

  it("trims surrounding whitespace", () => {
    expect(sanitizeDisplayName("  Alex Morgan  ")).toBe("Alex Morgan");
  });

  it("returns null for empty results", () => {
    expect(sanitizeDisplayName("")).toBeNull();
    expect(sanitizeDisplayName("   ")).toBeNull();
    expect(sanitizeDisplayName("\u0000\u001f")).toBeNull();
  });

  it(`returns null above ${DISPLAY_NAME_MAX_LENGTH} characters`, () => {
    expect(sanitizeDisplayName("a".repeat(DISPLAY_NAME_MAX_LENGTH + 1))).toBeNull();
  });

  it("keeps a valid name at the boundary", () => {
    expect(sanitizeDisplayName("a".repeat(DISPLAY_NAME_MAX_LENGTH))).toBe(
      "a".repeat(DISPLAY_NAME_MAX_LENGTH)
    );
  });
});

describe("initialsFor", () => {
  it("takes the first letters of a multi-word name", () => {
    expect(initialsFor("Alex Morgan", "alex@example.com")).toBe("AM");
  });

  it("falls back to the email local part when no name exists", () => {
    expect(initialsFor(null, "alex.morgan@example.com")).toBe("AM");
  });

  it("splits on dots, underscores, and hyphens too", () => {
    expect(initialsFor(null, "alex_morgan-smith@example.com")).toBe("AM");
  });

  it("uses a single letter when only one is available", () => {
    expect(initialsFor("Alexandra", "a@example.com")).toBe("A");
  });

  it("uppercases the result", () => {
    expect(initialsFor("alex morgan", "alex@example.com")).toBe("AM");
  });

  it("returns a question mark when nothing can be derived", () => {
    expect(initialsFor(null, "")).toBe("?");
    expect(initialsFor("   ", "")).toBe("?");
  });

  it("caps at two letters", () => {
    expect(initialsFor("Ada Lovelace Byron", "ada@example.com")).toBe("AL");
  });
});

describe("fallbackProfileView", () => {
  it("derives a safe view from the auth record", () => {
    const view = fallbackProfileView({
      id: "00000000-0000-0000-0000-000000000000",
      email: "alex.morgan@example.com",
      displayNameFromMetadata: "  Alex Morgan ",
    });
    expect(view).toEqual({
      displayName: "Alex Morgan",
      initials: "AM",
      email: "alex.morgan@example.com",
    });
  });

  it("degrades to the email identity when metadata is unusable", () => {
    const view = fallbackProfileView({
      id: "00000000-0000-0000-0000-000000000000",
      email: "sam@example.com",
      displayNameFromMetadata: "\u0000\u0001",
    });
    expect(view.displayName).toBeNull();
    expect(view.initials).toBe("S");
  });

  it("survives a missing email", () => {
    const view = fallbackProfileView({
      id: "00000000-0000-0000-0000-000000000000",
      email: null,
      displayNameFromMetadata: null,
    });
    expect(view.email).toBe("");
    expect(view.initials).toBe("?");
  });
});
