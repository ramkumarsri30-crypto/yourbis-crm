import { AppShell } from "@/components/layout/app-shell";

/**
 * Layout for all CRM module routes. Route groups do not affect the URL,
 * so the Overview dashboard is served at `/` — the application home —
 * while future modules (leads, contacts, deals, …) will live alongside
 * it under this same shell.
 */
export default function CrmLayout({ children }: LayoutProps<"/">) {
  return <AppShell>{children}</AppShell>;
}
