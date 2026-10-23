import { Bell, ChevronRight, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DEMO_WORKSPACE } from "@/lib/demo-data";

import { MobileNavigation } from "./mobile-navigation";
import { UserMenu } from "./user-menu";

/** Decorative vertical rule used between top bar controls. */
function TopbarDivider({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`h-6 w-px shrink-0 self-center bg-border ${className ?? ""}`}
    />
  );
}

/**
 * Top application bar: navigation entry point for small screens, page
 * context, and global controls. Search and notifications are visibly
 * disabled future capabilities — they perform no action and imply no
 * live data.
 */
export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-(--app-topbar-height) shrink-0 items-center gap-2 border-b border-border bg-card px-4 sm:gap-3 sm:px-6 lg:px-8">
      <MobileNavigation />
      <TopbarDivider className="lg:hidden" />

      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex min-w-0 items-center gap-1.5">
          <li className="hidden items-center gap-1.5 md:flex">
            <span className="max-w-48 truncate text-sm text-muted-foreground">
              {DEMO_WORKSPACE.name}
            </span>
            <ChevronRight
              aria-hidden="true"
              className="size-3.5 shrink-0 text-muted-foreground/60"
            />
          </li>
          <li>
            <span
              aria-current="page"
              className="truncate text-sm font-medium text-foreground"
            >
              Overview
            </span>
          </li>
        </ol>
      </nav>

      <button
        type="button"
        disabled
        aria-label="Search records — coming in a future phase"
        className="flex h-9 w-9 cursor-not-allowed items-center justify-center gap-2 rounded-md border border-input bg-card text-muted-foreground opacity-60 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 md:w-60 md:justify-start md:px-2.5"
      >
        <Search aria-hidden="true" className="size-4 shrink-0" />
        <span className="hidden text-sm md:inline">Search</span>
        <span
          aria-hidden="true"
          className="ml-auto hidden rounded-full border border-border bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground md:inline"
        >
          Soon
        </span>
      </button>

      <Button
        variant="ghost"
        size="icon"
        disabled
        aria-label="Notifications — coming in a future phase"
      >
        <Bell className="size-4.5" />
      </Button>

      <TopbarDivider className="hidden sm:block" />

      <UserMenu />
    </header>
  );
}
