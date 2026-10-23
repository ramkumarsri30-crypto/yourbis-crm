import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { WorkspaceFormState } from "@/lib/workspace/form-state";
import type { WorkspaceSummary } from "@/lib/workspace/context";

// ─────────────────────────────────────────────────────────────────────────────
// Module mocks: server-only boundaries are replaced; pure helpers (tokens,
// validation, errors, roles, url derivation) stay real so their logic is
// exercised through the actions.
// ─────────────────────────────────────────────────────────────────────────────

const revalidatePath = vi.fn<(path: string, type?: string) => void>();
const redirect = vi.fn((path: string): never => {
  // Mirror next/navigation's redirect(): always throws. The sentinel is
  // asserted by tests that expect the redirect and caught nowhere else.
  throw new Error(`NEXT_REDIRECT:${path}`);
});
const requireUser = vi.fn<(...args: unknown[]) => Promise<unknown>>();
const createClient = vi.fn<(...args: unknown[]) => Promise<unknown>>();
const getWorkspaceContext = vi.fn<(...args: unknown[]) => Promise<unknown>>();
const listMyWorkspaces = vi.fn<(...args: unknown[]) => Promise<unknown>>();
const writeActiveWorkspaceCookie = vi.fn<
  (...args: unknown[]) => Promise<unknown>
>();
const isSupabaseConfigured = vi.fn<(...args: unknown[]) => boolean>();
const isResendConfigured = vi.fn<(...args: unknown[]) => boolean>();
const createEmailSender = vi.fn<(...args: unknown[]) => unknown>();

vi.mock("next/cache", () => ({
  revalidatePath: (path: string, type?: string) => revalidatePath(path, type),
}));
vi.mock("next/navigation", () => ({ redirect: (path: string) => redirect(path) }));
vi.mock("next/headers", () => ({
  headers: vi.fn(async () =>
    new Headers({
      host: "crm.example.com",
      "x-forwarded-proto": "https",
    })
  ),
}));
vi.mock("@/lib/auth/guards", () => ({ requireUser: (...a: unknown[]) => requireUser(...a) }));
vi.mock("@/lib/supabase/config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/supabase/config")>()),
  isSupabaseConfigured: (...a: unknown[]) => isSupabaseConfigured(...a),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: (...a: unknown[]) => createClient(...a) }));
vi.mock("@/lib/workspace/context", () => ({
  getWorkspaceContext: (...a: unknown[]) => getWorkspaceContext(...a),
  listMyWorkspaces: (...a: unknown[]) => listMyWorkspaces(...a),
  writeActiveWorkspaceCookie: (...a: unknown[]) => writeActiveWorkspaceCookie(...a),
}));
vi.mock("@/lib/email/config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/email/config")>()),
  isResendConfigured: (...a: unknown[]) => isResendConfigured(...a),
}));
vi.mock("@/lib/email/sender", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/email/sender")>()),
  createEmailSender: (...a: unknown[]) => createEmailSender(...a),
}));

import {
  acceptInvitationAction,
  createWorkspaceAction,
  inviteMemberAction,
  resendInvitationAction,
  switchWorkspaceAction,
} from "@/lib/workspace/actions";

// ─────────────────────────────────────────────────────────────────────────────
// Fake PostgREST client: chains route by operation kind (select / insert /
// update / delete), so per-kind results are configured per test.
// ─────────────────────────────────────────────────────────────────────────────

type QueryResult = { data: unknown; error?: { code?: string; message?: string } | null };

function fakeSupabase(
  setup: {
    rpc?: QueryResult;
    select?: QueryResult;
    insert?: QueryResult;
    update?: QueryResult;
    delete?: QueryResult;
  } = {}
) {
  const rpc = vi.fn(async () => setup.rpc ?? { data: null, error: null });

  const from = vi.fn(() => {
    let kind: "select" | "insert" | "update" | "delete" | null = null;
    const pick = (): QueryResult =>
      (kind && setup[kind]) ?? { data: null, error: null };
    const builder: Record<string, unknown> = {
      select: () => {
        if (kind === null) kind = "select";
        return builder;
      },
      insert: () => {
        kind = "insert";
        return builder;
      },
      update: () => {
        kind = "update";
        return builder;
      },
      delete: () => {
        kind = "delete";
        return builder;
      },
      eq: () => builder,
      order: () => builder,
      range: () => builder,
      limit: () => builder,
      maybeSingle: () => Promise.resolve(pick()),
      single: () => Promise.resolve(pick()),
      then: (resolve: unknown, reject: unknown) =>
        Promise.resolve(pick()).then(resolve as never, reject as never),
    };
    return builder;
  });

  return { rpc, from };
}

function formData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.set(key, value);
  }
  return fd;
}

const OWNER: WorkspaceSummary = { id: "org-1", name: "Acme Inc.", role: "owner" };
const MEMBER: WorkspaceSummary = { id: "org-1", name: "Acme Inc.", role: "member" };
const USER = { id: "user-1", email: "owner@example.com" };
const INITIAL: WorkspaceFormState = { errors: {} };

/** Matches a 43-char base64url raw token anywhere it should not appear. */
const RAW_TOKEN_PATTERN = /[A-Za-z0-9_-]{43}/;

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  isSupabaseConfigured.mockReturnValue(true);
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  requireUser.mockResolvedValue(USER);
  getWorkspaceContext.mockResolvedValue({ workspaces: [OWNER], active: OWNER });
  listMyWorkspaces.mockResolvedValue([OWNER]);
  writeActiveWorkspaceCookie.mockResolvedValue(undefined);
  isResendConfigured.mockReturnValue(true);
  createEmailSender.mockReturnValue({
    sendInvitation: vi.fn(async () => ({ delivered: true })),
  });
});

afterEach(() => {
  consoleError.mockRestore();
});

// ─────────────────────────────────────────────────────────────────────────────
// createWorkspaceAction
// ─────────────────────────────────────────────────────────────────────────────

describe("createWorkspaceAction", () => {
  it("rejects an invalid name with a field error and no database call", async () => {
    const supabase = fakeSupabase();
    createClient.mockResolvedValue(supabase);

    const state = await createWorkspaceAction(
      INITIAL,
      formData({ workspaceName: "   " })
    );

    expect(state.errors.workspaceName).toBeDefined();
    expect(state.values?.workspaceName).toBe("");
    expect(requireUser).not.toHaveBeenCalled();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("fails honestly when Supabase is not configured", async () => {
    isSupabaseConfigured.mockReturnValue(false);

    const state = await createWorkspaceAction(
      INITIAL,
      formData({ workspaceName: "Acme" })
    );

    expect(state.formError).toContain("not configured");
    expect(state.values?.workspaceName).toBe("Acme");
  });

  it("calls the atomic RPC with the expected parameter name", async () => {
    const supabase = fakeSupabase({
      rpc: { data: "org-new", error: null },
    });
    createClient.mockResolvedValue(supabase);
    listMyWorkspaces.mockResolvedValue([
      OWNER,
      { id: "org-new", name: "Acme", role: "owner" },
    ]);

    await expect(
      createWorkspaceAction(INITIAL, formData({ workspaceName: "Acme" }))
    ).rejects.toThrow("NEXT_REDIRECT:/");

    expect(requireUser).toHaveBeenCalledWith("/onboarding/workspace");
    expect(supabase.rpc).toHaveBeenCalledWith("create_organization", {
      p_name: "Acme",
    });
  });

  it("maps an RPC failure, preserves the name, and never claims success", async () => {
    const supabase = fakeSupabase({
      rpc: { data: null, error: { code: "42501", message: "insufficient privilege" } },
    });
    createClient.mockResolvedValue(supabase);

    const state = await createWorkspaceAction(
      INITIAL,
      formData({ workspaceName: "Acme" })
    );

    expect(state.formError).toContain("You cannot create a workspace");
    expect(state.formError).toMatch(/\(ref: [0-9a-f]{8}\)/);
    expect(state.values?.workspaceName).toBe("Acme");
    expect(state.success).toBeUndefined();
    expect(writeActiveWorkspaceCookie).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();

    // The sanitized log line carries the code but never the raw message.
    expect(consoleError).toHaveBeenCalled();
    const payload = consoleError.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(payload.code).toBe("42501");
    expect(JSON.stringify(payload)).not.toContain("insufficient privilege");
  });

  it("activates the new workspace only after membership verification", async () => {
    const supabase = fakeSupabase({ rpc: { data: "org-new", error: null } });
    createClient.mockResolvedValue(supabase);
    listMyWorkspaces.mockResolvedValue([
      OWNER,
      { id: "org-new", name: "Acme", role: "owner" },
    ]);

    await expect(
      createWorkspaceAction(INITIAL, formData({ workspaceName: "Acme" }))
    ).rejects.toThrow("NEXT_REDIRECT:/");

    expect(listMyWorkspaces).toHaveBeenCalled();
    expect(writeActiveWorkspaceCookie).toHaveBeenCalledWith("org-new");
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("skips the cookie when verification cannot see the new membership", async () => {
    const supabase = fakeSupabase({ rpc: { data: "org-new", error: null } });
    createClient.mockResolvedValue(supabase);
    // The re-read does not include the new organization (transient
    // failure): creation still succeeded, so the user is taken home, but
    // the cookie must NOT name an unverified organization.
    listMyWorkspaces.mockResolvedValue([OWNER]);

    await expect(
      createWorkspaceAction(INITIAL, formData({ workspaceName: "Acme" }))
    ).rejects.toThrow("NEXT_REDIRECT:/");

    expect(writeActiveWorkspaceCookie).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();
    const payload = consoleError.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(payload.stage).toBe("membership-verification");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// switchWorkspaceAction
// ─────────────────────────────────────────────────────────────────────────────

describe("switchWorkspaceAction", () => {
  it("refuses a workspace outside the verified membership list", async () => {
    createClient.mockResolvedValue(fakeSupabase());
    listMyWorkspaces.mockResolvedValue([OWNER]);

    const result = await switchWorkspaceAction("org-foreign");

    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
    expect(writeActiveWorkspaceCookie).not.toHaveBeenCalled();
  });

  it("switches to a verified membership and refreshes the shell", async () => {
    createClient.mockResolvedValue(fakeSupabase());
    const second: WorkspaceSummary = { id: "org-2", name: "Globex", role: "member" };
    listMyWorkspaces.mockResolvedValue([OWNER, second]);

    const result = await switchWorkspaceAction("org-2");

    expect(result.ok).toBe(true);
    expect(writeActiveWorkspaceCookie).toHaveBeenCalledWith("org-2");
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// inviteMemberAction
// ─────────────────────────────────────────────────────────────────────────────

describe("inviteMemberAction", () => {
  it("rejects an invalid email without touching the database", async () => {
    createClient.mockResolvedValue(fakeSupabase());

    const state = await inviteMemberAction(
      INITIAL,
      formData({ inviteEmail: "not-an-email", inviteRole: "member" })
    );

    expect(state.errors.inviteEmail).toBeDefined();
    expect(state.values?.inviteEmail).toBe("not-an-email");
    expect(requireUser).not.toHaveBeenCalled();
  });

  it("fails honestly when Resend is not configured", async () => {
    createClient.mockResolvedValue(fakeSupabase());
    isResendConfigured.mockReturnValue(false);

    const state = await inviteMemberAction(
      INITIAL,
      formData({ inviteEmail: "teammate@company.com", inviteRole: "member" })
    );

    expect(state.formError).toContain("not configured");
    expect(state.formError).toContain("was not sent");
    expect(createClient).not.toHaveBeenCalled();
  });

  it("denies invitations to non-managers before any write", async () => {
    createClient.mockResolvedValue(fakeSupabase());
    getWorkspaceContext.mockResolvedValue({ workspaces: [MEMBER], active: MEMBER });

    const state = await inviteMemberAction(
      INITIAL,
      formData({ inviteEmail: "teammate@company.com", inviteRole: "member" })
    );

    expect(state.formError).toContain("do not have permission");
    expect(state.success).toBeUndefined();
  });

  it("surfaces an existing pending invitation instead of duplicating it", async () => {
    const supabase = fakeSupabase({
      select: { data: { id: "inv-1" }, error: null },
    });
    createClient.mockResolvedValue(supabase);

    const state = await inviteMemberAction(
      INITIAL,
      formData({ inviteEmail: "teammate@company.com", inviteRole: "member" })
    );

    expect(state.formError).toContain("already exists");
    // No insert chain was configured — and none may run.
    expect(state.success).toBeUndefined();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("maps an insert failure with a diagnostic reference and preserved input", async () => {
    const supabase = fakeSupabase({
      select: { data: null, error: null },
      insert: { data: null, error: { code: "42501", message: "policy violation" } },
    });
    createClient.mockResolvedValue(supabase);

    const state = await inviteMemberAction(
      INITIAL,
      formData({ inviteEmail: "teammate@company.com", inviteRole: "member" })
    );

    expect(state.formError).toContain("do not have permission");
    expect(state.formError).toMatch(/\(ref: [0-9a-f]{8}\)/);
    expect(state.values?.inviteEmail).toBe("teammate@company.com");
    expect(JSON.stringify(state)).not.toMatch(RAW_TOKEN_PATTERN);
  });

  it("reports a delivery failure honestly and keeps the invitation resendable", async () => {
    const supabase = fakeSupabase({
      select: { data: null, error: null },
      insert: { data: { id: "inv-9" }, error: null },
    });
    createClient.mockResolvedValue(supabase);
    createEmailSender.mockReturnValue({
      sendInvitation: vi.fn(async () => ({ delivered: false, reason: "send-failed" })),
    });

    const state = await inviteMemberAction(
      INITIAL,
      formData({ inviteEmail: "teammate@company.com", inviteRole: "member" })
    );

    expect(state.formError).toContain("could not be delivered");
    expect(state.formError).toContain("resending");
    expect(state.success).toBeUndefined();
    expect(revalidatePath).toHaveBeenCalledWith("/settings/team", "page");
    expect(JSON.stringify(state)).not.toMatch(RAW_TOKEN_PATTERN);
  });

  it("succeeds end to end without ever exposing the raw token", async () => {
    const sendInvitation = vi.fn<
      (model: Record<string, unknown>) => Promise<{ delivered: boolean }>
    >(async () => ({ delivered: true }));
    const supabase = fakeSupabase({
      select: { data: null, error: null },
      insert: { data: { id: "inv-9" }, error: null },
    });
    createClient.mockResolvedValue(supabase);
    createEmailSender.mockReturnValue({ sendInvitation });

    const state = await inviteMemberAction(
      INITIAL,
      formData({ inviteEmail: "Teammate@Company.com", inviteRole: "member" })
    );

    expect(state.success?.title).toContain("teammate@company.com");
    expect(sendInvitation).toHaveBeenCalledTimes(1);
    const model = sendInvitation.mock.calls[0]?.[0] as {
      to: string;
      acceptUrl: string;
    };
    // Normalized recipient; acceptance link points back to this origin.
    expect(model.to).toBe("teammate@company.com");
    expect(model.acceptUrl).toMatch(/^https:\/\/crm\.example\.com\/accept-invitation\?token=/);
    expect(revalidatePath).toHaveBeenCalledWith("/settings/team", "page");
    expect(JSON.stringify(state)).not.toMatch(RAW_TOKEN_PATTERN);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// resendInvitationAction / acceptInvitationAction
// ─────────────────────────────────────────────────────────────────────────────

describe("resendInvitationAction", () => {
  it("reports a delivery failure honestly after rotating the token", async () => {
    const supabase = fakeSupabase({
      select: {
        data: { id: "inv-1", invited_email: "teammate@company.com", role: "member", status: "pending" },
        error: null,
      },
      update: { data: { id: "inv-1" }, error: null },
    });
    createClient.mockResolvedValue(supabase);
    createEmailSender.mockReturnValue({
      sendInvitation: vi.fn(async () => ({ delivered: false, reason: "send-failed" })),
    });

    const state = await resendInvitationAction(
      INITIAL,
      formData({ invitationId: "inv-1" })
    );

    expect(state.formError).toContain("could not be delivered");
    expect(state.success).toBeUndefined();
    expect(revalidatePath).toHaveBeenCalledWith("/settings/team", "page");
    expect(JSON.stringify(state)).not.toMatch(RAW_TOKEN_PATTERN);
  });
});

describe("acceptInvitationAction", () => {
  const TOKEN = "a".repeat(43);

  it("rejects malformed tokens before any database round trip", async () => {
    const supabase = fakeSupabase();
    createClient.mockResolvedValue(supabase);

    const state = await acceptInvitationAction(
      INITIAL,
      formData({ token: "short" })
    );

    expect(state.formError).toContain("invalid, has expired, or was already used");
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("maps an RPC rejection with a diagnostic reference", async () => {
    const supabase = fakeSupabase({
      rpc: {
        data: null,
        error: { code: "22023", message: "invitation not found, expired, or already used" },
      },
    });
    createClient.mockResolvedValue(supabase);

    const state = await acceptInvitationAction(INITIAL, formData({ token: TOKEN }));

    expect(state.formError).toContain("invalid, has expired, or was already used");
    expect(state.formError).toMatch(/\(ref: [0-9a-f]{8}\)/);
    expect(writeActiveWorkspaceCookie).not.toHaveBeenCalled();
  });

  it("activates the joined workspace and enters the app on success", async () => {
    const supabase = fakeSupabase({ rpc: { data: "org-1", error: null } });
    createClient.mockResolvedValue(supabase);

    await expect(
      acceptInvitationAction(INITIAL, formData({ token: TOKEN }))
    ).rejects.toThrow("NEXT_REDIRECT:/");

    expect(supabase.rpc).toHaveBeenCalledWith("accept_organization_invitation", {
      p_token: TOKEN,
    });
    expect(writeActiveWorkspaceCookie).toHaveBeenCalledWith("org-1");
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});
