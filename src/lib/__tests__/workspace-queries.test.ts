import { describe, expect, it, vi } from "vitest";

import {
  INVITATION_PAGE_SIZE,
  MEMBER_PAGE_SIZE,
  hasMorePages,
  listInvitations,
  listMembers,
} from "@/lib/workspace/queries";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Query-layer tests: shaping, ordering, bounding, and the honest
 * degradation contract (any database error → empty list, never a
 * throw, never fabricated rows). Authorization is NOT under test here —
 * the database's RLS policies enforce it and pgTAP covers those.
 */
type RangeResult = { data: unknown; error: unknown };

/** Builds a chainable PostgREST query mock ending at .range(). */
function makeQueryMock(result: RangeResult) {
  const chain: Record<string, unknown> = {};
  const builder = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    range: vi.fn(() => Promise.resolve(result)),
  };
  Object.assign(chain, builder);
  return builder;
}

function makeSupabase(result: RangeResult): SupabaseClient {
  return { from: () => makeQueryMock(result) } as unknown as SupabaseClient;
}

describe("listMembers", () => {
  it("maps membership rows with display names", async () => {
    const supabase = makeSupabase({
      data: [
        {
          id: "m1",
          user_id: "u1",
          role: "owner",
          created_at: "2026-01-01T00:00:00Z",
          profiles: { display_name: "Alex" },
        },
        {
          id: "m2",
          user_id: "u2",
          role: "member",
          created_at: "2026-02-01T00:00:00Z",
          profiles: null,
        },
      ],
      error: null,
    });

    const members = await listMembers(supabase, "org-1");

    expect(members).toEqual([
      {
        membershipId: "m1",
        userId: "u1",
        role: "owner",
        joinedAt: "2026-01-01T00:00:00Z",
        displayName: "Alex",
      },
      {
        membershipId: "m2",
        userId: "u2",
        role: "member",
        joinedAt: "2026-02-01T00:00:00Z",
        displayName: null,
      },
    ]);
  });

  it("bounds the query to one page", async () => {
    const builder = makeQueryMock({ data: [], error: null });
    const supabase = {
      from: () => builder,
    } as unknown as SupabaseClient;

    await listMembers(supabase, "org-1", 3);

    expect(builder.range).toHaveBeenCalledWith(
      3 * MEMBER_PAGE_SIZE,
      4 * MEMBER_PAGE_SIZE - 1
    );
  });

  it("returns an empty list on any database error", async () => {
    const supabase = makeSupabase({
      data: null,
      error: { code: "42501", message: "denied" },
    });
    await expect(listMembers(supabase, "org-1")).resolves.toEqual([]);
  });
});

describe("listInvitations", () => {
  it("derives the expired status from expires_at without a cron job", async () => {
    const supabase = makeSupabase({
      data: [
        {
          id: "i1",
          invited_email: "a@example.com",
          role: "member",
          status: "pending",
          expires_at: new Date(Date.now() - 60_000).toISOString(),
          accepted_at: null,
          created_at: "2026-01-01T00:00:00Z",
        },
        {
          id: "i2",
          invited_email: "b@example.com",
          role: "admin",
          status: "pending",
          expires_at: new Date(Date.now() + 60_000).toISOString(),
          accepted_at: null,
          created_at: "2026-01-01T00:00:00Z",
        },
        {
          id: "i3",
          invited_email: "c@example.com",
          role: "viewer",
          status: "revoked",
          expires_at: new Date(Date.now() - 60_000).toISOString(),
          accepted_at: null,
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
      error: null,
    });

    const invitations = await listInvitations(supabase, "org-1");

    expect(invitations.map((i) => i.status)).toEqual([
      "expired",
      "pending",
      "revoked",
    ]);
  });

  it("bounds the query to one page, newest first", async () => {
    const builder = makeQueryMock({ data: [], error: null });
    const supabase = {
      from: () => builder,
    } as unknown as SupabaseClient;

    await listInvitations(supabase, "org-1", 2);

    expect(builder.order).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
    expect(builder.range).toHaveBeenCalledWith(
      2 * INVITATION_PAGE_SIZE,
      3 * INVITATION_PAGE_SIZE - 1
    );
  });

  it("returns an empty list on any database error", async () => {
    const supabase = makeSupabase({
      data: null,
      error: { code: "22P02", message: "bad input" },
    });
    await expect(listInvitations(supabase, "org-1")).resolves.toEqual([]);
  });
});

describe("hasMorePages", () => {
  it("signals more pages only when the page was full", () => {
    expect(hasMorePages(MEMBER_PAGE_SIZE, MEMBER_PAGE_SIZE)).toBe(true);
    expect(hasMorePages(MEMBER_PAGE_SIZE - 1, MEMBER_PAGE_SIZE)).toBe(false);
    expect(hasMorePages(0, MEMBER_PAGE_SIZE)).toBe(false);
  });
});
