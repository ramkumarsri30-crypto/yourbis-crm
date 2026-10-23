import { describe, expect, it } from "vitest";

import {
  cn,
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatInitials,
  formatNumber,
  formatShortDate,
  formatSignedPercent,
  formatTime,
} from "@/lib/utils";

describe("cn", () => {
  it("merges conditional class names", () => {
    expect(cn("a", false && "b", "c")).toBe("a c");
  });

  it("lets later utilities win over conflicting earlier ones", () => {
    expect(cn("p-5", "p-2")).toBe("p-2");
  });
});

describe("formatCurrency", () => {
  it("formats whole USD amounts without decimals", () => {
    expect(formatCurrency(1484000)).toBe("$1,484,000");
  });

  it("rounds fractional amounts to whole dollars", () => {
    expect(formatCurrency(589575.4)).toBe("$589,575");
  });
});

describe("formatCompactCurrency", () => {
  it("compacts thousands", () => {
    expect(formatCompactCurrency(372000)).toBe("$372K");
  });

  it("keeps one decimal for compacted values that need it", () => {
    expect(formatCompactCurrency(468500)).toBe("$468.5K");
  });

  it("compacts millions with one decimal", () => {
    expect(formatCompactCurrency(1484000)).toBe("$1.5M");
  });
});

describe("formatNumber", () => {
  it("groups thousands with en-US separators", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
  });
});

describe("formatSignedPercent", () => {
  it("prefixes positive values with a plus", () => {
    expect(formatSignedPercent(7.4)).toBe("+7.4%");
  });

  it("prefixes negative values with a minus", () => {
    expect(formatSignedPercent(-2)).toBe("-2.0%");
  });

  it("renders zero without a sign", () => {
    expect(formatSignedPercent(0)).toBe("0.0%");
  });
});

describe("formatDate", () => {
  it("formats an ISO timestamp as a short UTC date", () => {
    expect(formatDate("2026-10-22T09:42:00Z")).toBe("Oct 22, 2026");
  });
});

describe("formatShortDate", () => {
  it("omits the year", () => {
    expect(formatShortDate("2026-10-22T09:42:00Z")).toBe("Oct 22");
  });
});

describe("formatDateTime", () => {
  it("renders date and 12-hour time in UTC", () => {
    expect(formatDateTime("2026-10-22T16:20:00Z")).toBe("Oct 22, 4:20 PM");
  });
});

describe("formatTime", () => {
  it("renders 12-hour time in UTC", () => {
    expect(formatTime("2026-10-23T14:00:00Z")).toBe("2:00 PM");
  });
});

describe("formatInitials", () => {
  it("takes the first two words' initials", () => {
    expect(formatInitials("Amara Osei")).toBe("AO");
  });

  it("uppercases lowercase names", () => {
    expect(formatInitials("demo user")).toBe("DU");
  });

  it("handles a single word", () => {
    expect(formatInitials("Cher")).toBe("C");
  });

  it("ignores extra whitespace and additional words", () => {
    expect(formatInitials("  Grace Kim  Junior ")).toBe("GK");
  });
});
