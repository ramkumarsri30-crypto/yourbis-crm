"use client";

import { useCallback, useState } from "react";

import type { FieldErrors } from "@/lib/auth/validation";

/**
 * Merges instant, client-side field validation with server-side errors
 * from the action state. `errorFor(field)` prefers the local (fresher)
 * message; `validate` runs a validator on blur/change and records its
 * result. The server action re-validates everything regardless — this
 * hook only improves feedback latency, it is not a security boundary.
 */
export function useFormErrors(serverErrors: FieldErrors) {
  const [localErrors, setLocalErrors] = useState<FieldErrors>({});

  const validate = useCallback(
    (field: keyof FieldErrors, value: string | undefined, validator: (value: string) => string | undefined) => {
      const message = validator(value ?? "");
      setLocalErrors((current) => ({ ...current, [field]: message }));
      return message;
    },
    []
  );

  const errorFor = useCallback(
    (field: keyof FieldErrors): string | undefined =>
      localErrors[field] ?? serverErrors[field],
    [localErrors, serverErrors]
  );

  return { validate, errorFor };
}
