"use client";

import { useState, useTransition } from "react";
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { WorkspaceSummary } from "@/lib/workspace/context";
import { workspaceRoleLabel } from "@/lib/workspace/roles";
import { switchWorkspaceAction } from "@/lib/workspace/actions";

/**
 * Workspace switcher (sidebar footer + mobile drawer).
 *
 * Options come from the server's verified membership list — the client
 * never derives or invents them. Switching calls a server action that
 * re-validates membership before writing the cookie; the cookie is a
 * preference, never an authorization.
 *
 * Feedback: the trigger shows a spinner immediately (useTransition),
 * the label switches optimistically to the chosen workspace, and any
 * failure rolls the label back and surfaces the error under the
 * control. No full-page reload.
 */
export function WorkspaceSwitcher({
  workspaces,
  activeId,
  userCanCreate = true,
}: {
  workspaces: WorkspaceSummary[];
  activeId: string | null;
  userCanCreate?: boolean;
}) {
  const [optimisticId, setOptimisticId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const active =
    workspaces.find((ws) => ws.id === (optimisticId ?? activeId)) ??
    workspaces.find((ws) => ws.id === activeId) ??
    null;

  async function handleSwitch(nextId: string) {
    if (nextId === activeId || isPending) {
      return;
    }
    setError(null);
    setOptimisticId(nextId);
    startTransition(async () => {
      const result = await switchWorkspaceAction(nextId);
      if (!result.ok) {
        // Roll the optimistic label back; show the safe error.
        setOptimisticId(null);
        setError(result.error ?? "Unable to switch workspaces.");
      } else {
        setOptimisticId(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            aria-label="Switch workspace"
            aria-busy={isPending || undefined}
            disabled={isPending || workspaces.length === 0}
            className="h-auto w-full justify-between gap-2 px-2.5 py-2 font-normal"
          >
            {isPending ? (
              <Loader2 aria-hidden="true" className="size-4 shrink-0 animate-spin text-muted-foreground" />
            ) : null}
            <span className="flex min-w-0 flex-1 flex-col items-start text-left">
              <span className="w-full truncate text-xs font-medium text-foreground">
                {active?.name ?? "No workspace"}
              </span>
              <span className="w-full truncate text-[11px] text-muted-foreground">
                {active ? workspaceRoleLabel(active.role) : "Create one to start"}
              </span>
            </span>
            <ChevronsUpDown aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Workspaces
          </DropdownMenuLabel>
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              onSelect={() => {
                void handleSwitch(workspace.id);
              }}
              className="gap-2"
            >
              <Check
                aria-hidden="true"
                className={`size-4 shrink-0 ${workspace.id === activeId ? "opacity-100" : "opacity-0"}`}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{workspace.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {workspaceRoleLabel(workspace.role)}
                </span>
              </span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          {userCanCreate ? (
            <DropdownMenuItem asChild>
              <Link href="/onboarding/workspace" className="gap-2">
                <Plus aria-hidden="true" className="size-4 shrink-0" />
                <span className="text-sm">New workspace</span>
              </Link>
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {error ? (
        <p role="alert" className="px-1 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
