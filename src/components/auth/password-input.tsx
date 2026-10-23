"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Password input with a visibility toggle. The toggle is a real labeled
 * button (not color-only state) and is excluded from tab-order-flattening
 * edge cases by keeping standard focus behavior.
 */
export interface PasswordInputProps
  extends Omit<React.ComponentProps<"input">, "type"> {
  /** Override the default "Show password" label for a11y. */
  toggleLabel?: string;
}

export function PasswordInput({ toggleLabel, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className="h-10 pr-11"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setVisible((current) => !current)}
        aria-label={toggleLabel ?? (visible ? "Hide password" : "Show password")}
        aria-pressed={visible}
        className="absolute right-1 top-1/2 size-8 -translate-y-1/2 rounded-md text-muted-foreground hover:text-foreground"
        tabIndex={-1}
      >
        {visible ? (
          <EyeOff aria-hidden="true" className="size-4" />
        ) : (
          <Eye aria-hidden="true" className="size-4" />
        )}
      </Button>
    </div>
  );
}
