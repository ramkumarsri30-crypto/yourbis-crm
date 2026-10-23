export { cn } from "cn";

/**
 * Formatting helpers shared across the CRM.
 *
 * All date/time helpers render in UTC so that output is deterministic:
 * server-rendered markup never depends on the machine or viewer timezone,
 * which keeps static rendering and snapshots stable. Demonstration data is
 * explicitly labeled as such at the presentation layer; these helpers never
 * imply live business data.
 */

const UTC = "UTC" as const;

/** "$1,484,000" — full USD currency with no decimals. */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

/** "$1.5M" / "$372K" — compact USD currency for dense surfaces. */
export function formatCompactCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/** "1,484,000" — plain grouped number. */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

/** "+7.4%" — signed percentage for trend indicators. */
export function formatSignedPercent(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(value).toFixed(1)}%`;
}

/** "Oct 22, 2026" — short date. */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: UTC,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

/** "Oct 22" — date without year, for compact lists. */
export function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: UTC,
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

/** "Oct 22, 4:05 PM" — date with time. */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: UTC,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** "4:05 PM" — time only. */
export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: UTC,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** "AO" — initials for avatar fallbacks. */
export function formatInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}
