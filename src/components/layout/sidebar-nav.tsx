"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

import { NAV_GROUPS } from "@/lib/navigation";
import { cn } from "@/lib/utils";

interface SidebarNavProps {
  /**
   * Invoked when an available navigation item is activated. Used by the
   * mobile drawer to close itself after navigation.
   */
  onNavigate?: () => void;
}

const itemBaseClasses =
  "flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar";

/**
 * Primary navigation, rendered from the shared configuration in
 * `src/lib/navigation.ts`. Used by both the desktop sidebar and the
 * mobile navigation drawer so the two can never drift apart.
 *
 * The active route is derived from the real pathname (client hook), so
 * every available item highlights correctly, including nested settings
 * routes (`/settings/...` marks the Settings entry active).
 *
 * Upcoming items render as genuinely disabled buttons with a visible
 * "Soon" chip — they never link to a route that does not exist.
 */
export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const pathname = usePathname() ?? "/";

  return (
    <nav aria-label="Primary">
      <ul className="flex flex-col gap-5">
        {NAV_GROUPS.map((group) => (
          <li key={group.label ?? "main"} className="flex flex-col gap-1">
            {group.label ? (
              <p className="px-2.5 pb-1 text-xs font-medium tracking-wide text-sidebar-muted-foreground uppercase">
                {group.label}
              </p>
            ) : null}
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const isActive =
                  item.status === "available" &&
                  item.href !== undefined &&
                  (item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href ||
                      pathname.startsWith(`${item.href}/`));

                if (item.status === "available" && item.href) {
                  return (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          itemBaseClasses,
                          "text-sidebar-foreground hover:bg-sidebar-item-hover hover:text-foreground",
                          isActive &&
                            "bg-sidebar-accent font-medium text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <item.icon aria-hidden="true" className="size-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                }

                return (
                  <li key={item.label}>
                    <button
                      type="button"
                      disabled
                      aria-label={`${item.label} — planned for Phase ${item.phase}`}
                      className={cn(
                        itemBaseClasses,
                        "cursor-not-allowed text-sidebar-foreground/60"
                      )}
                    >
                      <item.icon aria-hidden="true" className="size-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                      <span
                        aria-hidden="true"
                        className="ml-auto rounded-full border border-border bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground"
                      >
                        Soon
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}
