import { describe, expect, it } from "vitest";

import { NAV_GROUPS } from "@/lib/navigation";

describe("navigation configuration", () => {
  const allItems = NAV_GROUPS.flatMap((group) => group.items);

  it("every available item has a route and every upcoming item is phased", () => {
    for (const item of allItems) {
      if (item.status === "available") {
        expect(item.href, `${item.label} must have an href`).toMatch(/^\//);
      } else {
        expect(item.phase, `${item.label} must declare its phase`).toBeGreaterThan(0);
      }
    }
  });

  it("exposes exactly one Settings entry pointing at the settings hub", () => {
    const settingsItems = allItems.filter((item) => item.label === "Settings");
    expect(settingsItems).toHaveLength(1);
    expect(settingsItems[0].status).toBe("available");
    expect(settingsItems[0].href).toBe("/settings");
  });

  it("the dashboard is the only top-level available route outside settings", () => {
    const available = allItems.filter((item) => item.status === "available");
    expect(available.map((item) => item.href).sort()).toEqual([
      "/",
      "/settings",
    ]);
  });

  it("upcoming CRM modules never link to a route (no broken navigation)", () => {
    for (const item of allItems) {
      if (item.status === "upcoming") {
        expect(item.href).toBeUndefined();
      }
    }
  });
});
