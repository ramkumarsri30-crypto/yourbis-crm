import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { ProfileView } from "@/lib/auth/profile";
import type { WorkspaceSummary } from "@/lib/workspace/context";

import { WorkspaceSwitcher } from "./workspace-switcher";

/**
 * Bottom section of the navigation column: workspace switcher and user
 * identity. The switcher renders the server-verified membership list
 * and the membership-validated active workspace (Phase 3) — the
 * demonstration placeholder is gone. The user block renders the
 * signed-in identity from the server shell.
 */
export function SidebarFooter({
  user,
  workspaces,
  activeWorkspaceId,
}: {
  user: ProfileView;
  workspaces: WorkspaceSummary[];
  activeWorkspaceId: string | null;
}) {
  const displayName = user.displayName ?? user.email;

  return (
    <div className="shrink-0 border-t border-sidebar-border p-3">
      <WorkspaceSwitcher workspaces={workspaces} activeId={activeWorkspaceId} />
      <div className="mt-2 flex items-center gap-2.5 rounded-md px-2.5 py-2">
        <Avatar className="size-8">
          <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
            {user.initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-foreground">
            {displayName}
          </p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
      </div>
    </div>
  );
}
