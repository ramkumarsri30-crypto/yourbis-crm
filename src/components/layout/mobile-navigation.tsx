"use client";

import * as React from "react";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { ProfileView } from "@/lib/auth/profile";

import { SidebarFooter } from "./sidebar-footer";
import { SidebarNav } from "./sidebar-nav";

/**
 * Mobile navigation drawer. Replaces the desktop sidebar below the `lg`
 * breakpoint. The sheet is a Radix dialog: focus is trapped while open,
 * Escape closes it, and focus returns to the toggle on close.
 *
 * Receives the signed-in user's view from the server shell — identity is
 * rendered from props, never re-derived on the client.
 */
export function MobileNavigation({ user }: { user: ProfileView }) {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="gap-0 border-sidebar-border bg-sidebar p-0"
      >
        <SheetHeader className="border-b border-sidebar-border px-5 py-4">
          <SheetTitle className="text-sm font-semibold tracking-tight">
            CRM Workspace
          </SheetTitle>
          <SheetDescription className="sr-only">
            Primary application navigation
          </SheetDescription>
        </SheetHeader>
        <div className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
          <SidebarNav onNavigate={() => setOpen(false)} />
        </div>
        <SidebarFooter user={user} />
      </SheetContent>
    </Sheet>
  );
}
