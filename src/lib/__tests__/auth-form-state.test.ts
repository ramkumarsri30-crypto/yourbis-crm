import { describe, expect, it } from "vitest";

import { formPassword, formString } from "@/lib/auth/form-state";

describe("formString", () => {
  it("returns a trimmed string value", () => {
    const data = new FormData();
    data.set("email", "  alex@example.com  ");
    expect(formString(data, "email")).toBe("alex@example.com");
  });

  it("returns an empty string for missing keys", () => {
    expect(formString(new FormData(), "missing")).toBe("");
  });

  it("returns an empty string for non-string entries", () => {
    const data = new FormData();
    data.set("file", new File(["x"], "x.txt"));
    expect(formString(data, "file")).toBe("");
  });
});

describe("formPassword", () => {
  it("preserves leading and trailing spaces (passwords are literal)", () => {
    const data = new FormData();
    data.set("password", " padded passphrase ");
    expect(formPassword(data)).toBe(" padded passphrase ");
  });

  it("reads from the configured key", () => {
    const data = new FormData();
    data.set("confirmPassword", "match");
    expect(formPassword(data, "confirmPassword")).toBe("match");
  });

  it("returns an empty string for missing keys", () => {
    expect(formPassword(new FormData())).toBe("");
  });

  it("returns an empty string for non-string entries", () => {
    // FormData coerces primitives to strings, so the only real non-string
    // entry is a File — that is the branch formPassword guards against.
    const data = new FormData();
    data.set("password", new File(["x"], "x.txt"));
    expect(formPassword(data)).toBe("");
  });
});
