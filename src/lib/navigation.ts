import {
  BookUser,
  Building2,
  CalendarCheck,
  ChartColumn,
  Handshake,
  LayoutDashboard,
  Plug,
  Settings,
  UserPlus,
  Workflow,
  type LucideIcon,
} from "lucide-react";

/**
 * Primary navigation configuration.
 *
 * Single source of truth shared by the desktop sidebar and the mobile
 * navigation drawer. Items marked `upcoming` are rendered as visibly
 * disabled controls with their target phase — they never navigate, so no
 * route can be broken by them.
 */

export interface NavItem {
  label: string;
  icon: LucideIcon;
  /** `available` renders a real link; `upcoming` renders a disabled control. */
  status: "available" | "upcoming";
  /** Route for available items. Only "/" exists in Phase 1. */
  href?: string;
  /** Roadmap phase in which an upcoming item is planned. */
  phase?: number;
}

export interface NavGroup {
  /** Optional group label rendered as small caps text. `null` for the ungrouped top section. */
  label: string | null;
  items: NavItem[];
}

export const NAV_GROUPS: readonly NavGroup[] = [
  {
    label: null,
    items: [
      {
        label: "Overview",
        icon: LayoutDashboard,
        status: "available",
        href: "/",
      },
    ],
  },
  {
    label: "Pipeline",
    items: [
      { label: "Leads", icon: UserPlus, status: "upcoming", phase: 5 },
      { label: "Contacts", icon: BookUser, status: "upcoming", phase: 5 },
      { label: "Accounts", icon: Building2, status: "upcoming", phase: 4 },
      { label: "Deals", icon: Handshake, status: "upcoming", phase: 5 },
    ],
  },
  {
    label: "Productivity",
    items: [
      { label: "Activities", icon: CalendarCheck, status: "upcoming", phase: 6 },
      { label: "Reports", icon: ChartColumn, status: "upcoming", phase: 7 },
      { label: "Automations", icon: Workflow, status: "upcoming", phase: 8 },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Integrations", icon: Plug, status: "upcoming", phase: 9 },
      {
        label: "Settings",
        icon: Settings,
        status: "available",
        href: "/settings/workspace",
      },
    ],
  },
] as const;
