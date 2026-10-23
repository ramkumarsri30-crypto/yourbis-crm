"use client";

import { usePathname } from "next/navigation";

/**
 * Top-bar page label, derived from the current pathname. Pure display —
 * no data fetching, no identity. Keeps the layout free of per-route
 * props while every route still gets a correct breadcrumb label.
 */
const LABELS: ReadonlyArray<readonly [prefix: string, label: string]> = [
  ["/settings/team", "Team"],
  ["/settings/workspace", "Workspace settings"],
  ["/settings", "Settings"],
];

export function TopbarPageTitle() {
  const pathname = usePathname() ?? "/";

  const match = LABELS.find(
    ([prefix]) =>
      pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  const label = match?.[1] ?? "Overview";

  return (
    <span aria-current="page" className="truncate text-sm font-medium text-foreground">
      {label}
    </span>
  );
}
