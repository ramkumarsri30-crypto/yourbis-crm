import type { ReactNode } from "react";

import type { ProfileView } from "@/lib/auth/profile";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

/**
 * Application shell: fixed-width sidebar (desktop), sticky top bar, and
 * the main content region. All dimensions come from CSS variables defined
 * in globals.css so the layout can be tuned centrally.
 *
 * The `user` view comes from the server layout (verified session +
 * profile row) and is threaded down to the identity surfaces (user menu,
 * sidebar footer). Client components receive it as plain props — identity
 * is never re-derived on the client.
 */
export interface AppShellProps {
  user: ProfileView;
  children: ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-md focus:outline-none"
      >
        Skip to main content
      </a>
      <Sidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 px-4 py-6 focus-visible:outline-none sm:px-6 lg:px-8 lg:py-8"
        >
          <div className="mx-auto w-full max-w-(--app-content-max-width)">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
