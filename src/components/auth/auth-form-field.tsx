import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";

/**
 * Accessible form field: label, control, optional hint, and error
 * message wired with `aria-describedby` + `aria-invalid` so screen
 * readers announce validation errors.
 *
 * The control receives the a11y attributes through a render prop — this
 * works for plain inputs and for composite controls like the password
 * field with its visibility toggle.
 *
 * Presentational only (no hooks): usable in server and client trees.
 */
export interface AuthFieldControlProps {
  id: string;
  "aria-invalid": true | undefined;
  "aria-describedby": string | undefined;
}

export interface AuthFormFieldProps {
  id: string;
  label: string;
  /** Optional persistent hint (e.g. password requirements). */
  hint?: ReactNode;
  /** Validation message; when present the control is marked invalid. */
  error?: string;
  children: (controlProps: AuthFieldControlProps) => ReactNode;
}

export function AuthFormField({
  id,
  label,
  hint,
  error,
  children,
}: AuthFormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })}
      {hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="text-xs font-medium text-destructive"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
