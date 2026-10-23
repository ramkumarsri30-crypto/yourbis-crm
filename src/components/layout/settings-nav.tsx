"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import type { WorkspaceSummary } from "@/lib/workspace/context";
import { workspaceRoleLabel } from "@/lib/workspace/roles";

/**
 * Settings section navigation (Phase 3 hotfix). Renders the visible
 * destinations of the settings area — Workspace and Team & invitations —
 * as an accessible tab list, on desktop AND mobile (it lives in the
 * settings layout's content area, so both shells show it identically).
 *
 * The workspace context line shows which workspace the settings apply
 * to (the server-verified active workspace and the caller's role in
 * it). Route-level authorization stays server-side: these links merely
 * navigate; each settings page and every action re-verifies membership
 * and role under RLS regardless of what this component renders.
 */

const SETTINGS_TABS = [
  { href: "/settings/workspace", label: "Workspace" },
  { href: "/settings/team", label: "Team" },
] as const;

export function SettingsNav({
  activeWorkspace,
}: {
  activeWorkspace: WorkspaceSummary | null;
}) {
  const pathname = usePathname() ?? "/";

  return (
    <div className="space-y-3">
      <nav aria-label="Settings sections" className="space-y-3">
        <ul className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-muted/40 p-1">
          {SETTINGS_TABS.map((tab) => {
            const isActive =
              pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <li key={tab.href} className="min-w-0 flex-1">
                <Link
                  href={tab.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/60",
                    isActive
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {activeWorkspace ? (
        <p className="text-xs text-muted-foreground">
          Settings apply to{" "}
          <span className="font-medium text-foreground">
            {activeWorkspace.name}
          </span>{" "}
          — your role: {workspaceRoleLabel(activeWorkspace.role)}. Use the
          workspace switcher to manage another workspace.
        </p>
      ) : null}
    </div>
  );
}
