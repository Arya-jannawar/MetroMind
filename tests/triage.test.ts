import { describe, expect, it } from "vitest";
import { rankedQueue } from "@/lib/triage";
import seedJson from "@/data/seed-incidents.json";
import type { Incident, IncidentStatus, IncidentType } from "@/lib/types";

const NOW = 1_753_382_400_000;

const rows = (seedJson as { incidents: { type: IncidentType; stationId: string; note: string; peopleAffected: number; minutesAgo: number; status: IncidentStatus }[] }).incidents;

const seeded: Incident[] = rows.map((r, i) => ({
  id: `t-${i}`,
  type: r.type,
  stationId: r.stationId,
  note: r.note,
  peopleAffected: r.peopleAffected,
  at: NOW - r.minutesAgo * 60_000,
  status: r.status,
  source: "seed",
}));

describe("rescue triage", () => {
  it("ranks the seeded queue with time-critical people events first", () => {
    const queue = rankedQueue(seeded, NOW);
    expect(queue.length).toBe(4);
    // lost-child (fresh, 2 affected) must outrank the older low-severity hazard
    expect(queue[0].incident.type).toBe("lost-child");
    // the assigned harassment report sinks to the bottom until reassigned
    expect(queue.at(-1)!.incident.type).toBe("harassment");
    expect(queue.at(-1)!.incident.status).toBe("assigned");
  });

  it("explains every rank with score components", () => {
    const queue = rankedQueue(seeded, NOW);
    for (const { incident, triage: t } of queue) {
      expect(t.score).toBeGreaterThan(0);
      expect(t.score).toBeLessThanOrEqual(100);
      expect(t.why).not.toMatch(/undefined|NaN/);
      expect(t.why.length).toBeGreaterThan(10);
      expect(t.action.length).toBeGreaterThan(10);
      void incident;
    }
  });

  it("demotes assigned incidents below equally-severe open ones", () => {
    const a: Incident = { id: "a", type: "medical", stationId: "vanaz", note: "", peopleAffected: 1, at: NOW - 60_000, status: "open", source: "user" };
    const b: Incident = { ...a, id: "b", status: "assigned" };
    const queue = rankedQueue([b, a], NOW);
    expect(queue[0].incident.id).toBe("a");
    expect(queue[0].triage.score).toBeGreaterThan(queue[1].triage.score);
  });
});
