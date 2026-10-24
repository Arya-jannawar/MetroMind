import { describe, expect, it } from "vitest";
import { planRoutes } from "@/lib/routing";
import { crowdPenaltyMin } from "@/lib/crowd";
import type { Constraints, CrowdSpike } from "@/lib/types";

const BASE: Constraints = { nowMin: 480, nowMs: 1_753_382_400_000 }; // 08:00, fixed epoch

const ctx = { reports: [], spikes: [], disruptions: [] };

describe("routing engine", () => {
  it("keeps the fastest plan on a single line with zero transfers", () => {
    const { plans } = planRoutes("ramwadi", "vanaz", BASE, ctx);
    expect(plans.length).toBeGreaterThan(0);
    const top = plans[0];
    expect(top.legIds).toEqual(["aqua"]);
    expect(top.transfers).toBe(0);
    expect(top.hops).toBe(15);
  });

  it("routes cross-line trips through the District Court interchange", () => {
    const { plans } = planRoutes("vanaz", "swargate", BASE, ctx);
    expect(plans.length).toBeGreaterThan(0);
    const top = plans[0];
    expect(top.transfers).toBe(1);
    expect(top.legIds).toEqual(["aqua", "purple"]);
    expect(top.stationIds).toContain("district-court");
  });

  it("respects the arrive-by constraint (every offered plan arrives on time)", () => {
    const { plans } = planRoutes(
      "ramwadi",
      "deccan-gymkhana",
      { ...BASE, arriveByMin: 9 * 60 },
      ctx,
    );
    expect(plans.length).toBeGreaterThan(0);
    for (const p of plans) {
      expect(p.arriveMin).toBeLessThanOrEqual(540);
      expect(p.departMin).toBeGreaterThanOrEqual(480);
      expect(p.arriveMin - p.departMin).toBeCloseTo(p.totalMin, 5);
      expect(p.slackMin).toBeGreaterThanOrEqual(0);
    }
  });

  it("offers a just-in-time plan that departs later and arrives on the deadline", () => {
    const { plans } = planRoutes(
      "ramwadi",
      "deccan-gymkhana",
      { ...BASE, arriveByMin: 9 * 60 },
      ctx,
    );
    const punctual = plans.find((p) => p.strategy === "punctual");
    expect(punctual).toBeTruthy();
    expect(punctual!.arriveMin).toBe(540);
    expect(punctual!.departMin).toBeGreaterThan(480);
  });

  it("respects the budget constraint and demotes over-fare plans", () => {
    // vanaz→swargate = 11 stops ⇒ estimated fare ₹32
    const long = planRoutes("vanaz", "swargate", { ...BASE, budget: 20 }, ctx);
    expect(long.plans).toHaveLength(0);
    expect(long.rejected.length).toBeGreaterThan(0);
    expect(long.rejected[0].fare).toBe(32);

    // ramwadi→kalyani-nagar = 1 stop ⇒ ₹12 fits a ₹12 budget
    const short = planRoutes("ramwadi", "kalyani-nagar", { ...BASE, budget: 12 }, ctx);
    expect(short.plans.length).toBeGreaterThan(0);
    expect(short.plans[0].fare).toBeLessThanOrEqual(12);
  });

  it("returns at least two distinct plans for the killer query", () => {
    const { plans } = planRoutes(
      "ramwadi",
      "deccan-gymkhana",
      { ...BASE, arriveByMin: 540, budget: 50, avoidCrowds: true },
      ctx,
    );
    const sigs = new Set(plans.map((p) => p.signature));
    expect(plans.length).toBeGreaterThanOrEqual(2);
    expect(sigs.size).toBe(plans.length);
  });

  it("reflects an injected crowd spike in the plan's peak crowd", () => {
    const spike: CrowdSpike[] = [
      { id: "t1", stationId: "deccan-gymkhana", boost: 100, until: BASE.nowMs + 3_600_000 },
    ];
    const calm = planRoutes("ramwadi", "deccan-gymkhana", BASE, ctx).plans[0];
    const busy = planRoutes("ramwadi", "deccan-gymkhana", BASE, { ...ctx, spikes: spike }).plans[0];
    expect(busy.peakCrowd).toBeGreaterThan(calm.peakCrowd);
  });

  it("adds an injected line delay once into the route time", () => {
    const delayed = planRoutes("ramwadi", "deccan-gymkhana", BASE, {
      ...ctx,
      disruptions: [{ id: "d1", lineId: "aqua", kind: "delay", minutes: 15, createdAt: 0 }],
    }).plans[0];
    const calm = planRoutes("ramwadi", "deccan-gymkhana", BASE, ctx).plans[0];
    expect(delayed.totalMin).toBeCloseTo(calm.totalMin + 15, 5);
    expect(delayed.notes.join(" ")).toMatch(/delay/i);
  });

  it("computes a quadratic crowd penalty (14 min at score 100, weight 1)", () => {
    expect(crowdPenaltyMin(100, 1)).toBeCloseTo(14, 5);
    expect(crowdPenaltyMin(50, 1)).toBeCloseTo(3.5, 5);
    expect(crowdPenaltyMin(0, 1)).toBe(0);
  });
});
