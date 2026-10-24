import { describe, expect, it } from "vitest";
import { crowdToBoost, feedToLiveState, matchStation, normalizeLiveFeed } from "@/lib/livefeed";

describe("live feed integration", () => {
  it("matches stations by id, name, slug and punctuation-free variants", () => {
    expect(matchStation("shivaji-nagar")).toBe("shivaji-nagar");
    expect(matchStation("Shivaji Nagar")).toBe("shivaji-nagar");
    expect(matchStation("SHIVAJI NAGAR")).toBe("shivaji-nagar");
    expect(matchStation("R.T.O. Pune")).toBe("rto-pune");
    expect(matchStation("Deccan Gymkhana")).toBe("deccan-gymkhana");
    expect(matchStation("Nowhere Station")).toBeNull();
    expect(matchStation(42)).toBeNull();
  });

  it("normalizes a valid feed, skipping unknown lines and bad rows", () => {
    const r = normalizeLiveFeed({
      updatedAt: "2026-10-24T09:00:00+05:30",
      lines: [
        { id: "aqua", status: "delay", delayMin: 999 },
        { id: "Purple Line", delayMin: 0 },
        { id: "green", status: "delay" },
      ],
      stations: [
        { id: "shivaji-nagar", crowd: 0.72 },
        { name: "Deccan Gymkhana", crowd: 62 },
        { name: "Nowhere", crowd: 0.5 },
        { id: "ramwadi", crowd: 5 },
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.feed.lines).toHaveLength(2);
    expect(r.feed.lines[0]).toEqual({ lineId: "aqua", status: "delay", delayMin: 90 });
    expect(r.feed.lines[1]).toEqual({ lineId: "purple", status: "normal", delayMin: 0 });
    expect(r.feed.matched).toBe(3); // deccan (62 → 62%) + ramwadi (5 → 5%)
    expect(r.feed.unmatched).toBe(1); // "Nowhere" — skipped, never guessed
    const deccan = r.feed.stations.find((s) => s.stationId === "deccan-gymkhana");
    expect(deccan?.crowd).toBeCloseTo(0.62);
  });

  it("derives line status from the delay when status is absent", () => {
    const r = normalizeLiveFeed({ lines: [{ id: "aqua", delayMin: 12 }] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.feed.lines[0]).toEqual({ lineId: "aqua", status: "delay", delayMin: 12 });
  });

  it("rejects garbage without throwing", () => {
    expect(normalizeLiveFeed(null).ok).toBe(false);
    expect(normalizeLiveFeed([1, 2]).ok).toBe(false);
    expect(normalizeLiveFeed({ hello: "world" }).ok).toBe(false);
    expect(
      normalizeLiveFeed({ lines: [{ id: "blue" }], stations: [{ name: "?" }] }).ok,
    ).toBe(false);
  });

  it("maps crowd to boosts on the same scale as Demo Control spikes", () => {
    expect(crowdToBoost(0)).toBe(0);
    expect(crowdToBoost(0.33)).toBe(0);
    expect(crowdToBoost(1)).toBe(60);
    expect(crowdToBoost(0.5)).toBeGreaterThan(0);
    expect(crowdToBoost(0.5)).toBeLessThan(30);
  });

  it("converts a normalized feed into live-state pushes", () => {
    const r = normalizeLiveFeed({
      lines: [
        { id: "aqua", status: "delay", delayMin: 15 },
        { id: "purple", status: "normal" },
      ],
      stations: [
        { id: "shivaji-nagar", crowd: 0.9 },
        { id: "vanaz", crowd: 0.1 },
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const { delays, boosts } = feedToLiveState(r.feed);
    expect(delays).toEqual([{ lineId: "aqua", delayMin: 15 }]);
    expect(boosts).toEqual([{ stationId: "shivaji-nagar", boost: 51 }]);
  });
});
