import { Building2 } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { ProfileView } from "@/lib/auth/profile";
import { DEMO_WORKSPACE } from "@/lib/demo-data";

/**
 * Bottom section of the navigation column: workspace card and user
 * identity. The workspace is still a demonstration placeholder — real
 * workspaces arrive with organizations in Phase 3 (out of scope here).
 * The user block renders the signed-in identity from the server shell.
 */
export function SidebarFooter({ user }: { user: ProfileView }) {
  const displayName = user.displayName ?? user.email;

  return (
    <div className="shrink-0 border-t border-sidebar-border p-3">
      <div className="flex items-center gap-2.5 rounded-md border border-border bg-card p-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary">
          <Building2 aria-hidden="true" className="size-4 text-muted-foreground" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-foreground">
            {DEMO_WORKSPACE.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {DEMO_WORKSPACE.plan}
          </p>
        </div>
      </div>
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
