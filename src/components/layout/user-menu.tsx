"use client";

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
 * Sign out is a real form POST to /auth/sign-out (works without JS; the
 * route enforces same-origin and revokes the session server-side).
 * Profile editing and preferences remain visibly disabled until their
 * phases arrive — no fake-working controls.
 */
export function UserMenu({ user }: { user: ProfileView }) {
  const displayName = user.displayName ?? user.email;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-9 gap-2 rounded-full pr-2.5 pl-1.5"
          aria-label="Open account menu"
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
      <DropdownMenuContent align="end" className="w-60">
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
