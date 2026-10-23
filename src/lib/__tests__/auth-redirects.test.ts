import { describe, expect, it } from "vitest";

import {
  DEFAULT_AUTHENTICATED_PATH,
  DEFAULT_RECOVERY_PATH,
  safeRedirectPath,
} from "@/lib/auth/redirects";

/**
 * The `next` parameter flows through sign-in/sign-up links, server
 * actions, and email links — every value here is attacker-controlled.
 * These tests pin the open-redirect defenses.
 */
describe("safeRedirectPath", () => {
  it("returns the default for null, undefined, and empty values", () => {
    expect(safeRedirectPath(null)).toBe(DEFAULT_AUTHENTICATED_PATH);
    expect(safeRedirectPath(undefined)).toBe(DEFAULT_AUTHENTICATED_PATH);
    expect(safeRedirectPath("")).toBe(DEFAULT_AUTHENTICATED_PATH);
    expect(safeRedirectPath("   ")).toBe(DEFAULT_AUTHENTICATED_PATH);
  });

  it("allows the two approved internal paths", () => {
    expect(safeRedirectPath("/")).toBe("/");
    expect(safeRedirectPath("/reset-password")).toBe("/reset-password");
  });

  it("preserves a sanitized query string on approved paths", () => {
    expect(safeRedirectPath("/?tab=pipeline")).toBe("/?tab=pipeline");
    expect(safeRedirectPath("/reset-password?src=email")).toBe(
      "/reset-password?src=email"
    );
  });

  it("strips control characters from the query string", () => {
    expect(safeRedirectPath("/?q=a\u0000b\u007f")).toBe("/?q=ab");
  });

  it("blocks absolute URLs to other origins", () => {
    expect(safeRedirectPath("https://evil.example")).toBe(
      DEFAULT_AUTHENTICATED_PATH
    );
    expect(safeRedirectPath("http://evil.example/phish")).toBe(
      DEFAULT_AUTHENTICATED_PATH
    );
    expect(safeRedirectPath("https://localhost:3000")).toBe(
      DEFAULT_AUTHENTICATED_PATH
    );
  });

  it("blocks protocol-relative URLs", () => {
    expect(safeRedirectPath("//evil.example")).toBe(
      DEFAULT_AUTHENTICATED_PATH
    );
    expect(safeRedirectPath("//evil.example/x")).toBe(
      DEFAULT_AUTHENTICATED_PATH
    );
  });

  it("blocks backslash-led URLs (browser-relative scheme tricks)", () => {
    expect(safeRedirectPath("/\\evil.example")).toBe(
      DEFAULT_AUTHENTICATED_PATH
    );
    expect(safeRedirectPath("/\\/evil.example")).toBe(
      DEFAULT_AUTHENTICATED_PATH
    );
  });

  it("blocks relative paths without a leading slash", () => {
    expect(safeRedirectPath("dashboard")).toBe(DEFAULT_AUTHENTICATED_PATH);
    expect(safeRedirectPath("./dashboard")).toBe(DEFAULT_AUTHENTICATED_PATH);
  });

  it("falls back for any path outside the allowlist", () => {
    expect(safeRedirectPath("/admin")).toBe(DEFAULT_AUTHENTICATED_PATH);
    expect(safeRedirectPath("/sign-in")).toBe(DEFAULT_AUTHENTICATED_PATH);
    expect(safeRedirectPath("/leads/42")).toBe(DEFAULT_AUTHENTICATED_PATH);
  });

  it("ignores an embedded host by comparing the parsed pathname", () => {
    // The allowlist is on the pathname, so an embedded path-looking host
    // portion cannot smuggle an approval through.
    expect(safeRedirectPath("/reset-password/../../admin")).toBe(
      DEFAULT_AUTHENTICATED_PATH
    );
  });

  it("honors a custom fallback", () => {
    expect(safeRedirectPath("https://evil.example", "/reset-password")).toBe(
      "/reset-password"
    );
  });

  it("trims surrounding whitespace before judging", () => {
    expect(safeRedirectPath("  /  ")).toBe("/");
    expect(safeRedirectPath(" https://evil.example ")).toBe(
      DEFAULT_AUTHENTICATED_PATH
    );
  });

  it("exposes the recovery landing path as a known-safe destination", () => {
    expect(DEFAULT_RECOVERY_PATH).toBe("/reset-password");
    expect(safeRedirectPath(DEFAULT_RECOVERY_PATH)).toBe(DEFAULT_RECOVERY_PATH);
  });
});
