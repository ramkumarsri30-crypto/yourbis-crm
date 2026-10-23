import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Shared layout for the authentication screens: centered card on the
 * application background, brand mark, and the page's form/content.
 * Visual language matches the CRM shell (tokens, radius, typography).
 */
export interface AuthPanelProps {
  title: string;
  description: string;
  children: ReactNode;
  /** Optional footer (links to other auth pages). */
  footer?: ReactNode;
}

export function AuthPanel({ title, description, children, footer }: AuthPanelProps) {
  return (
    <main
      id="main-content"
      className="flex min-h-screen w-full flex-col items-center justify-center bg-background px-4 py-10 sm:px-6"
    >
      {/* Brand block — placeholder brand, same wording as the sidebar. */}
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
          CW
        </span>
        <span className="text-lg font-semibold tracking-tight text-foreground">
          CRM Workspace
        </span>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader className="gap-1.5">
          <CardTitle className="text-xl tracking-tight">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>

      {footer ? (
        <div className="mt-6 w-full max-w-sm text-center text-sm text-muted-foreground">
          {footer}
        </div>
      ) : null}
    </main>
  );
}
