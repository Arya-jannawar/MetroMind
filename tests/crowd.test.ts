import { describe, expect, it } from "vitest";
import { decayWeight, blendScore, freshnessLine, confidenceOf, bandOf } from "@/lib/crowd";
import { fareForHops } from "@/lib/fare";
import type { CrowdReport } from "@/lib/types";

const NOW = 1_753_382_400_000;

describe("fare model (ESTIMATE)", () => {
  it("charges base + per stop and applies the ₹35 cap", () => {
    expect(fareForHops(0)).toBe(0);
    expect(fareForHops(1)).toBe(12);
    expect(fareForHops(5)).toBe(20);
    expect(fareForHops(13)).toBe(35); // 10 + 26 → capped
    expect(fareForHops(40)).toBe(35);
  });
});

describe("crowd decay + blending", () => {
  it("decays with a 15-minute half-life", () => {
    expect(decayWeight(0)).toBe(1);
    expect(decayWeight(15)).toBeCloseTo(0.5, 5);
    expect(decayWeight(30)).toBeCloseTo(0.25, 5);
  });

  it("lets a fresh report override the quiet-hour model", () => {
    const reports: CrowdReport[] = [
      { id: "r1", stationId: "deccan-gymkhana", level: "packed", at: NOW - 4 * 60_000, source: "seed" },
    ];
    // 14:10 — retail model would be calm; the fresh "packed" report must dominate
    const score = blendScore("retail", "deccan-gymkhana", 14 * 60 + 10, reports, NOW, 0);
    expect(score).toBeGreaterThan(55);
    expect(["busy", "packed"]).toContain(bandOf(score));
  });

  it("forgets stale reports entirely", () => {
    const reports: CrowdReport[] = [
      { id: "r1", stationId: "deccan-gymkhana", level: "packed", at: NOW - 50 * 60_000, source: "seed" },
    ];
    const score = blendScore("retail", "deccan-gymkhana", 14 * 60 + 10, reports, NOW, 0);
    const noReports = blendScore("retail", "deccan-gymkhana", 14 * 60 + 10, [], NOW, 0);
    expect(score).toBeCloseTo(noReports, 0);
  });

  it("reports freshness and confidence honestly", () => {
    const reports: CrowdReport[] = [
      { id: "r1", stationId: "vanaz", level: "moderate", at: NOW - 3 * 60_000, source: "user" },
      { id: "r2", stationId: "vanaz", level: "moderate", at: NOW - 6 * 60_000, source: "user" },
    ];
    expect(freshnessLine(reports, "vanaz", NOW)).toBe("2 reports in the last 10 min");
    expect(confidenceOf(reports, "vanaz", NOW)).toBeGreaterThan(0);
    expect(confidenceOf([], "vanaz", NOW)).toBe(0);
    expect(freshnessLine([], "vanaz", NOW)).toBe("no live reports — model estimate");
  });
});
