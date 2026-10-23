import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/shared/section-header";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DEMO_KPIS, DEMO_LEADS } from "@/lib/demo-data";
import { cn, formatShortDate } from "@/lib/utils";

/**
 * Compact table of the most recent demonstration leads.
 *
 * Responsive strategy: lower-priority columns (company, source, owner)
 * are progressively hidden on smaller viewports and the built-in
 * container scrolls horizontally only as a last resort, so the page
 * itself never overflows.
 */

const totalLeads = DEMO_KPIS.find((kpi) => kpi.id === "total-leads")?.value ?? 0;

export function RecentLeadsTable({ className }: { className?: string }) {
  return (
    <Card className={cn("gap-4 p-5", className)}>
      <SectionHeader
        id="recent-leads-heading"
        title="Recent leads"
        description="Latest demonstration records"
        action={
          <Button variant="outline" size="sm" disabled>
            View all leads
            <span className="text-xs font-normal text-muted-foreground">
              · Phase 5
            </span>
          </Button>
        }
      />

      <Table>
        <TableCaption className="sr-only">
          Recent demonstration leads with status, source, owner, and creation
          date
        </TableCaption>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-0">Name</TableHead>
            <TableHead className="hidden md:table-cell">Company</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden lg:table-cell">Source</TableHead>
            <TableHead className="hidden lg:table-cell">Owner</TableHead>
            <TableHead className="pr-0 text-right">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {DEMO_LEADS.map((lead) => (
            <TableRow key={lead.id}>
              <TableCell className="py-2.5 pl-0">
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">
                    {lead.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {lead.email}
                  </span>
                </div>
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">
                {lead.company}
              </TableCell>
              <TableCell>
                <StatusBadge status={lead.status} />
              </TableCell>
              <TableCell className="hidden text-muted-foreground lg:table-cell">
                {lead.source}
              </TableCell>
              <TableCell className="hidden text-muted-foreground lg:table-cell">
                {lead.owner}
              </TableCell>
              <TableCell className="pr-0 text-right text-muted-foreground tabular-nums">
                <time dateTime={lead.createdAt}>
                  {formatShortDate(lead.createdAt)}
                </time>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <p className="text-xs text-muted-foreground">
        Showing {DEMO_LEADS.length} of {totalLeads.toLocaleString("en-US")}{" "}
        demonstration leads.
      </p>
    </Card>
  );
}
