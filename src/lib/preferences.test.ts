import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ACCENT_KEYS, dashboardLayoutSchema, homePath, readPreferences, resolveDashboardLayout } from "./preferences";

const ids = (layout: { id: string }[]) => layout.map((b) => b.id);

describe("resolveDashboardLayout", () => {
  it("uses the default order when nothing was customized", () => {
    expect(ids(resolveDashboardLayout([], []))).toEqual(["summary", "goal", "focus", "neglected", "subjects"]);
  });

  it("keeps the saved order and hidden flags", () => {
    const layout = resolveDashboardLayout(["subjects", "focus", "summary", "goal", "neglected"], ["goal"]);
    expect(ids(layout)).toEqual(["subjects", "focus", "summary", "goal", "neglected"]);
    expect(layout.find((b) => b.id === "goal")?.visible).toBe(false);
  });

  it("slots a block the user never saw back in after its default predecessor", () => {
    // Saved before "goal" existed.
    expect(ids(resolveDashboardLayout(["focus", "summary", "neglected", "subjects"], []))).toEqual([
      "focus",
      "summary",
      "goal",
      "neglected",
      "subjects",
    ]);
  });

  it("drops unknown and duplicated ids", () => {
    // Only "focus" survives; the rest come back at their default spots.
    expect(ids(resolveDashboardLayout(["bogus", "focus", "focus"], []))).toEqual([
      "summary",
      "goal",
      "focus",
      "neglected",
      "subjects",
    ]);
  });
});

describe("readPreferences", () => {
  it("falls back to defaults for values it doesn't recognize", () => {
    const prefs = readPreferences({
      themeMode: "neon",
      accentColor: "chartreuse",
      homePage: "/etc/passwd",
      monthlyGoalMinutes: null,
      dashboardOrder: [],
      dashboardHidden: [],
      backgroundStyle: "photo",
      backgroundImageId: null,
    });
    expect(prefs).toMatchObject({
      themeMode: "system",
      accentColor: "indigo",
      homePage: "dashboard",
      backgroundStyle: "plain", // "photo" with no photo saved
    });
    expect(homePath("/etc/passwd")).toBe("/dashboard");
    expect(homePath("review")).toBe("/review");
  });
});

describe("dashboardLayoutSchema", () => {
  it("refuses hiding every block", () => {
    expect(dashboardLayoutSchema.safeParse([{ id: "focus", visible: false }]).success).toBe(false);
  });
});

describe("accents.css", () => {
  it("has a light and both dark rules for every non-default accent", () => {
    const css = readFileSync(join(__dirname, "../app/accents.css"), "utf8");
    for (const key of ACCENT_KEYS.filter((k) => k !== "indigo")) {
      expect(css).toContain(`:root[data-accent="${key}"]`);
      expect(css).toContain(`:root:not([data-theme="light"])[data-accent="${key}"]`);
      expect(css).toContain(`:root[data-theme="dark"][data-accent="${key}"]`);
    }
  });
});
