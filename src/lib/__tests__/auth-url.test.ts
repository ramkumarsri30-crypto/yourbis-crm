import { describe, expect, it } from "vitest";

import { resolveRequestOrigin } from "@/lib/auth/url";

function headersWith(entries: Record<string, string>): Headers {
  return new Headers(entries);
}

describe("resolveRequestOrigin", () => {
  it("uses x-forwarded-host and x-forwarded-proto when present (Vercel)", () => {
    expect(
      resolveRequestOrigin(
        headersWith({
          "x-forwarded-host": "yourbis-crm.vercel.app",
          "x-forwarded-proto": "https",
        })
      )
    ).toBe("https://yourbis-crm.vercel.app");
  });

  it("takes only the first value of comma-separated proxy headers", () => {
    expect(
      resolveRequestOrigin(
        headersWith({
          "x-forwarded-host": "app.example.com, proxy.example.com",
          "x-forwarded-proto": "https, http",
        })
      )
    ).toBe("https://app.example.com");
  });

  it("falls back to the host header", () => {
    expect(
      resolveRequestOrigin(headersWith({ host: "localhost:3000" }))
    ).toBe("http://localhost:3000");
  });

  it("defaults the protocol to http when no proto header exists (local dev)", () => {
    // `next dev` sends no x-forwarded-proto; real deployment proxies
    // always do. Defaulting to http keeps local email links working.
    expect(
      resolveRequestOrigin(headersWith({ "x-forwarded-host": "app.example.com" }))
    ).toBe("http://app.example.com");
  });

  it("returns null when no host information exists", () => {
    expect(resolveRequestOrigin(headersWith({}))).toBeNull();
  });

  it("rejects non-http(s) protocols", () => {
    expect(
      resolveRequestOrigin(
        headersWith({
          "x-forwarded-host": "app.example.com",
          "x-forwarded-proto": "javascript",
        })
      )
    ).toBeNull();
  });

  it("rejects hosts with embedded credentials", () => {
    expect(
      resolveRequestOrigin(
        headersWith({ "x-forwarded-host": "user:pass@app.example.com" })
      )
    ).toBeNull();
  });

  it("rejects hosts smuggling a path", () => {
    expect(
      resolveRequestOrigin(headersWith({ host: "app.example.com/evil" }))
    ).toBeNull();
  });

  it("ignores empty header values", () => {
    expect(
      resolveRequestOrigin(
        headersWith({ "x-forwarded-host": "", host: "" })
      )
    ).toBeNull();
  });

  it("ignores comma-separated headers that trim to nothing", () => {
    expect(
      resolveRequestOrigin(headersWith({ "x-forwarded-host": " , " }))
    ).toBeNull();
  });
});
