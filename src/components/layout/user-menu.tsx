"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ProfileView } from "@/lib/auth/profile";

import { SignOutMenuItem } from "./sign-out-menu-item";

/**
 * User identity menu for the signed-in user. Name, email, and initials
 * come from the server layout (verified session + profile row) — never
 * re-derived on the client.
 *
 * Opening behavior adapts to the input device:
 *   - Hover-capable pointers (mouse/trackpad desktop): the menu opens
 *     when the pointer enters the trigger or the menu itself, and
 *     closes when it leaves both — a short grace period bridges the
 *     gap between trigger and (portaled) content.
 *   - Touch (phones/tablets): tap the trigger to open; tapping
 *     anywhere outside (or Escape, or a menu action) closes — Radix's
 *     native behavior, kept intact through the controlled `open` state.
 *   - Keyboard: ArrowDown/Enter/Space on the trigger and Escape to
 *     close remain fully functional (Radix), untouched by hover logic.
 *
 * Sign out is a real form POST to /auth/sign-out (works without JS; the
 * route enforces same-origin and revokes the session server-side).
 * Profile editing and preferences remain visibly disabled until their
 * phases arrive — no fake-working controls.
 */

/** Grace period between leaving the trigger and closing the menu. */
const HOVER_CLOSE_DELAY_MS = 150;

export function UserMenu({ user }: { user: ProfileView }) {
  const displayName = user.displayName ?? user.email;

  const [open, setOpen] = useState(false);
  const [hoverCapable, setHoverCapable] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Device capability, not screen size: only devices with a true hover
  // pointer get hover-to-open. Touch devices tap instead (their
  // synthesized mouseenter events would otherwise fight the click).
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setHoverCapable(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current !== null) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  useEffect(() => clearCloseTimer, [clearCloseTimer]);

  const openFromHover = useCallback(() => {
    if (!hoverCapable) {
      return;
    }
    clearCloseTimer();
    setOpen(true);
  }, [clearCloseTimer, hoverCapable]);

  const closeFromHover = useCallback(() => {
    if (!hoverCapable) {
      return;
    }
    clearCloseTimer();
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      setOpen(false);
    }, HOVER_CLOSE_DELAY_MS);
  }, [clearCloseTimer, hoverCapable]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-9 gap-2 rounded-full pr-2.5 pl-1.5"
          aria-label="Open account menu"
          onMouseEnter={openFromHover}
          onMouseLeave={closeFromHover}
        >
          <Avatar className="size-7">
            <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
              {user.initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-40 truncate text-sm font-medium md:inline">
            {displayName}
          </span>
          <ChevronDown
            aria-hidden="true"
            className="hidden size-3.5 text-muted-foreground md:inline"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-60"
        onMouseEnter={openFromHover}
        onMouseLeave={closeFromHover}
      >
        <DropdownMenuLabel>
          <div className="flex items-center gap-2.5 py-0.5">
            <Avatar className="size-9">
              <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                {user.initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {displayName}
              </p>
              <p className="truncate text-xs font-normal text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          Profile
          <DropdownMenuShortcut>Phase 5</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          Preferences
          <DropdownMenuShortcut>Phase 10</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {""}
        {/*
         * Plain HTML form → POST /auth/sign-out. No JS required; the route
         * handler validates same-origin, revokes the session on the auth
         * server, clears cookies, and redirects to the sign-in page. The
         * submit item flips into an immediate pending state while the
         * server round trip runs (see SignOutMenuItem).
         */}
        <form action="/auth/sign-out" method="post">
          <SignOutMenuItem />
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
