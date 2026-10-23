import { SidebarFooter } from "./sidebar-footer";
import { SidebarNav } from "./sidebar-nav";

/**
 * Desktop navigation column. Hidden below the `lg` breakpoint; small
 * screens use the accessible drawer in `MobileNavigation` instead of a
 * squeezed layout. Sticks to the viewport and scrolls independently when
 * the navigation outgrows the available height.
 */
export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-(--app-sidebar-width) shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-(--app-topbar-height) shrink-0 items-center border-b border-sidebar-border px-5">
        {/* Placeholder brand. A final product name and mark are undecided. */}
        <span className="text-sm font-semibold tracking-tight text-foreground">
          CRM Workspace
        </span>
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
        <SidebarNav />
      </div>
      <SidebarFooter />
    </aside>
  );
}
