import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";

/**
 * Layout for all CRM module routes. Route groups do not affect the URL,
 * so the Overview dashboard is served at `/` — the application home —
 * while future modules (leads, contacts, deals, …) will live alongside
 * it under this same shell.
 */
// Explicit prop typing (instead of the global `LayoutProps` helper) keeps
// `tsc --noEmit` working in fresh clones/CI, where next-env.d.ts has not
// been generated yet. See AGENTS.md rule on reproducible typechecks.
export default function CrmLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
