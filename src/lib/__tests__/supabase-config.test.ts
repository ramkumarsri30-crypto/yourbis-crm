import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isSupabaseConfigured,
  readSupabaseEnv,
  requireSupabaseEnv,
  SupabaseNotConfiguredError,
} from "@/lib/supabase/config";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("readSupabaseEnv", () => {
  it("returns null when both variables are missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect(readSupabaseEnv()).toBeNull();
  });

  it("returns null when only one variable is set", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect(readSupabaseEnv()).toBeNull();

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "key");
    expect(readSupabaseEnv()).toBeNull();
  });

  it("returns null for blank values (whitespace only)", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "   ");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "   ");
    expect(readSupabaseEnv()).toBeNull();
  });

  it("trims both values", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "  https://example.supabase.co  ");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "  pub-key  ");
    expect(readSupabaseEnv()).toEqual({
      url: "https://example.supabase.co",
      publishableKey: "pub-key",
    });
  });
});

describe("isSupabaseConfigured", () => {
  it("is false without credentials (fresh clone / CI)", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect(isSupabaseConfigured()).toBe(false);
  });

  it("is true with both credentials", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "pub-key");
    expect(isSupabaseConfigured()).toBe(true);
  });
});

describe("requireSupabaseEnv", () => {
  it("returns the validated env when configured", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "pub-key");
    expect(requireSupabaseEnv()).toEqual({
      url: "https://example.supabase.co",
      publishableKey: "pub-key",
    });
  });

  it("throws SupabaseNotConfiguredError when unconfigured", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    try {
      requireSupabaseEnv();
      expect.unreachable("requireSupabaseEnv should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(SupabaseNotConfiguredError);
      expect((error as SupabaseNotConfiguredError).name).toBe(
        "SupabaseNotConfiguredError"
      );
      // The message must name both variables so operators can fix it.
      expect((error as Error).message).toContain("NEXT_PUBLIC_SUPABASE_URL");
      expect((error as Error).message).toContain(
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
      );
    }
  });
});
