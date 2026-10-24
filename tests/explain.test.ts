import { describe, expect, it } from "vitest";
import { explainPlan, explainHazards, explainBuilderMatch } from "@/lib/explain";
import { planRoutes } from "@/lib/routing";
import { dict } from "@/lib/i18n";

const NOW_MS = 1_753_382_400_000;

describe("explainability", () => {
  const { plans } = planRoutes(
    "ramwadi",
    "deccan-gymkhana",
    { nowMin: 480, nowMs: NOW_MS, arriveByMin: 540, budget: 50, avoidCrowds: true },
    { reports: [], spikes: [], disruptions: [] },
  );

  it("renders a complete 'why' with no API key and no template artifacts", () => {
    expect(plans.length).toBeGreaterThan(0);
    for (const p of plans) {
      const why = explainPlan(p, "deccan-gymkhana");
      expect(why).not.toMatch(/undefined|NaN|null/);
      expect(why).toMatch(/\d/); // cites a concrete time or number
      expect(why.length).toBeGreaterThan(30);
    }
  });

  it("strategy cards explain their distinct trade-offs", () => {
    const fastest = explainPlan(plans[0], "deccan-gymkhana");
    expect(fastest).toMatch(/Leaves now/i);
  });

  it("summarises hazards without fabricating", () => {
    const out = explainHazards([
      { type: "pothole", severity: 4, nearStationId: "yerwada", location: "service lane" },
      { type: "pothole", severity: 2, nearStationId: "vanaz", location: "access road" },
      { type: "lighting", severity: 3, nearStationId: "bund-garden", location: "under flyover" },
    ]);
    expect(out).toMatch(/3 reports/);
    expect(out).toMatch(/pothole/);
    expect(out).toMatch(/Yerwada/);
    expect(out).not.toMatch(/undefined/);
  });

  it("scores builder matches by complementary skills", () => {
    const { score, why } = explainBuilderMatch(
      { lookingFor: ["python", "ml"] },
      { nickname: "Nikhil", skills: ["python", "ml", "data"], idea: "crowd prediction" },
    );
    expect(score).toBe(100);
    expect(why).toMatch(/Nikhil/);
  });
});

describe("i18n dictionaries", () => {
  it("ships 5 guide steps and ≥5 phrases for every language", () => {
    for (const lang of ["en", "hi", "mr"] as const) {
      const d = dict(lang);
      expect(d.steps).toHaveLength(5);
      expect(d.phrases.length).toBeGreaterThanOrEqual(5);
      for (const s of d.steps) {
        expect(s.title.length).toBeGreaterThan(0);
        expect(s.body.length).toBeGreaterThan(0);
      }
    }
  });
});
