import { PARAMS, indexOn, lineStationIds, linesOf, segmentOn, station } from "./data";
import { bandOf, clamp, crowdPenaltyMin, crowdAt } from "./crowd";
import { fareForHops } from "./fare";
import type {
  Constraints,
  CrowdReport,
  CrowdSpike,
  Disruption,
  LineId,
  RouteLeg,
  RoutePlan,
  Strategy,
} from "./types";

interface Ctx {
  reports: CrowdReport[];
  spikes: CrowdSpike[];
  disruptions: Disruption[];
}

interface NodeKey {
  stationId: string;
  lineId: LineId;
}

const key = (n: NodeKey) => `${n.stationId}|${n.lineId}`;

const STRATEGY_TUNING: Record<Strategy, { crowdWeight: number }> = {
  fastest: { crowdWeight: 0 },
  calm: { crowdWeight: 1.4 },
  punctual: { crowdWeight: 0 },
};

interface Path {
  stationIds: string[];
  legLines: LineId[]; // line of the edge leaving stationIds[i]; length = n−1
}

/**
 * Dijkstra over (station, line) states. Edge cost = ride + dwell + optional
 * crowd penalty; changing lines costs transferMin. In this Phase-1 network
 * the two lines form a tree, so the physical path between two stations is
 * unique — strategies differ in *when* you travel, not where.
 */
function shortestPath(
  originId: string,
  destId: string,
  strategy: Strategy,
  constraints: Constraints,
  ctx: Ctx,
): Path | null {
  if (originId === destId) return null;
  const tuning = STRATEGY_TUNING[strategy];

  const dist = new Map<string, number>();
  const prev = new Map<string, NodeKey>();
  const visited = new Set<string>();
  const queue = new Map<string, { node: NodeKey; d: number }>();

  for (const lineId of linesOf(originId)) {
    const n: NodeKey = { stationId: originId, lineId };
    dist.set(key(n), 0);
    queue.set(key(n), { node: n, d: 0 });
  }

  function relax(toStation: string, toLine: LineId, from: NodeKey, d: number) {
    const to: NodeKey = { stationId: toStation, lineId: toLine };
    const k = key(to);
    if (visited.has(k)) return;
    const cur = dist.get(k);
    if (cur === undefined || d < cur) {
      dist.set(k, d);
      prev.set(k, from);
      queue.set(k, { node: to, d });
    }
  }

  while (queue.size > 0) {
    // linear scan — 29 stations, no heap needed
    let bestK = "";
    let bestD = Infinity;
    let bestNode: NodeKey | null = null;
    for (const [k, v] of queue) {
      if (v.d < bestD) {
        bestD = v.d;
        bestK = k;
        bestNode = v.node;
      }
    }
    if (!bestNode) break;
    queue.delete(bestK);
    visited.add(bestK);
    if (bestNode.stationId === destId) break;

    const departAt = constraints.nowMin + bestD;

    for (const lineId of linesOf(bestNode.stationId)) {
      const idx = indexOn(lineId, bestNode.stationId);
      if (idx < 0) continue;
      const ids = lineStationIds(lineId);
      for (const j of [idx - 1, idx + 1]) {
        if (j < 0 || j >= ids.length) continue;
        const nextId = ids[j];
        let crowd = 0;
        if (tuning.crowdWeight > 0) {
          const score = crowdAt(nextId, departAt, constraints.nowMs, ctx.reports, ctx.spikes);
          crowd = crowdPenaltyMin(score, tuning.crowdWeight);
        }
        relax(nextId, lineId, bestNode, bestD + PARAMS.edgeTimeMin + PARAMS.dwellMin + crowd);
      }
    }

    // line change at an interchange (never on the origin row)
    if (bestNode.stationId !== originId && station(bestNode.stationId).interchange) {
      for (const lineId of linesOf(bestNode.stationId)) {
        if (lineId === bestNode.lineId) continue;
        relax(
          bestNode.stationId,
          lineId,
          bestNode,
          bestD + PARAMS.transferMin,
        );
      }
    }
  }

  const destKeys = linesOf(destId).map((lineId) => key({ stationId: destId, lineId }));
  const reachable = destKeys.filter((k) => dist.has(k));
  if (reachable.length === 0) return null;
  let bestK = reachable[0];
  for (const k of reachable) {
    if ((dist.get(k) ?? Infinity) < (dist.get(bestK) ?? Infinity)) bestK = k;
  }

  const chain: NodeKey[] = [];
  let cursor = bestK;
  while (true) {
    chain.unshift({ stationId: cursor.split("|")[0], lineId: cursor.split("|")[1] as LineId });
    const p = prev.get(cursor);
    if (!p) break;
    cursor = key(p);
  }

  const stationIds: string[] = [];
  const legLines: LineId[] = [];
  for (const n of chain) {
    if (stationIds[stationIds.length - 1] !== n.stationId) {
      if (stationIds.length > 0) legLines.push(n.lineId);
      stationIds.push(n.stationId);
    }
  }
  return { stationIds, legLines };
}

/** Build timed legs for a fixed path departing at departMin (station-entry time). */
function buildLegs(
  path: Path,
  departMin: number,
  nowMs: number,
  ctx: Ctx,
): RouteLeg[] {
  const { stationIds, legLines } = path;
  const legs: RouteLeg[] = [];
  let t = departMin + PARAMS.entryMin; // first boarding happens after entry + security
  let i = 0;
  while (i < legLines.length) {
    const lineId = legLines[i];
    let j = i;
    while (j + 1 < legLines.length && legLines[j + 1] === lineId) j++;
    const from = stationIds[i];
    const to = stationIds[j + 1];
    const seg = segmentOn(lineId, from, to);
    const hops = seg.length - 1;
    const ride = hops * (PARAMS.edgeTimeMin + PARAMS.dwellMin);
    const delayMin = ctx.disruptions
      .filter((d) => d.lineId === lineId)
      .reduce((acc, d) => acc + d.minutes, 0);
    let peak = 0;
    for (const sid of seg) {
      const s = crowdAt(sid, t, nowMs, ctx.reports, ctx.spikes);
      if (s > peak) peak = s;
    }
    legs.push({
      lineId,
      fromId: seg[0],
      toId: seg[seg.length - 1],
      stationIds: seg,
      hops,
      boardMin: t,
      alightMin: t + ride + delayMin,
      crowd: Math.round(peak),
      delayMin,
    });
    t += ride + delayMin;
    i = j + 1;
    if (i < legLines.length) t += PARAMS.transferMin;
  }
  return legs;
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

function assemble(
  strategy: Strategy,
  path: Path,
  departMin: number,
  shiftNote: string | null,
  constraints: Constraints,
  ctx: Ctx,
): RoutePlan {
  const legs = buildLegs(path, departMin, constraints.nowMs, ctx);
  const hops = path.stationIds.length - 1;
  const transfers = path.legLines.filter((l, i) => i > 0 && l !== path.legLines[i - 1]).length;
  const rideMin = legs[legs.length - 1].alightMin - departMin; // includes the entry buffer
  const totalMin = rideMin + PARAMS.exitMin;
  const arriveMin = departMin + totalMin;
  const fare = fareForHops(hops);
  const peakCrowd = Math.max(...legs.map((l) => l.crowd), 0);
  const stepFree = path.stationIds.every((id) => station(id).accessibility.stepFree);

  const notes: string[] = [];
  if (shiftNote) notes.push(shiftNote);
  const delayedLegs = legs.filter((l) => l.delayMin > 0);
  if (delayedLegs.length > 0) {
    notes.push(
      `includes +${Math.max(...delayedLegs.map((l) => l.delayMin))} min live delay on ${delayedLegs
        .map((l) => l.lineId)
        .join(" & ")} line`,
    );
  }
  if (!stepFree) notes.push("not fully step-free");

  const slackMin =
    constraints.arriveByMin !== undefined ? Math.round(constraints.arriveByMin - arriveMin) : 0;

  return {
    id: `${strategy}-${path.stationIds[0]}-${path.stationIds[path.stationIds.length - 1]}-${Math.round(departMin)}`,
    strategy,
    legIds: [...new Set(path.legLines)],
    legs,
    stationIds: path.stationIds,
    totalMin: round1(totalMin),
    rideMin: round1(rideMin),
    departMin: Math.round(departMin),
    arriveMin: Math.round(arriveMin),
    slackMin,
    fare,
    transfers,
    hops,
    peakCrowd,
    stepFree,
    notes,
    signature: `${path.stationIds.join(">")}#${Math.round(departMin)}`,
    feasible:
      (constraints.arriveByMin === undefined || arriveMin <= constraints.arriveByMin + 0.01) &&
      (constraints.budget === undefined || fare <= constraints.budget),
  };
}

export interface PlanResult {
  plans: RoutePlan[]; // distinct, constraint-satisfying
  rejected: RoutePlan[]; // over budget / late — dimmed alternatives
}

/**
 * Plan up to three distinct routes. The Phase-1 network is a tree, so the
 * meaningful trade-off axis is *departure timing*, not path choice:
 *  - fastest:  leave now, arrive as early as possible
 *  - calm:     shift departure (≤ 2 headways) to ride the lightest crowd
 *  - punctual: leave so as to arrive exactly at the deadline (or next train
 *              when no deadline is set)
 * Constraint-violating candidates are returned separately as dimmed cards.
 */
export function planRoutes(
  originId: string,
  destId: string,
  constraints: Constraints,
  ctx: Ctx,
): PlanResult {
  if (originId === destId) return { plans: [], rejected: [] };

  const baseDepart = Math.max(constraints.nowMin, PARAMS.firstTrainMin);
  const base = shortestPath(originId, destId, "fastest", constraints, ctx);
  if (!base) return { plans: [], rejected: [] };

  // duration is independent of departure time (headway waits not modelled)
  const probe = buildLegs(base, baseDepart, constraints.nowMs, ctx);
  const duration = probe[probe.length - 1].alightMin - baseDepart + PARAMS.exitMin;

  const candidates: { strategy: Strategy; depart: number; note: string | null }[] = [];
  const headway = PARAMS.headwayMin;

  // fastest — leave now
  candidates.push({ strategy: "fastest", depart: baseDepart, note: null });

  // calm — try up to two headways later, keep the lightest crowd
  let calmBest: { depart: number; peak: number } | null = null;
  for (const k of [1, 2]) {
    const depart = baseDepart + k * headway;
    if (constraints.arriveByMin !== undefined && depart + duration > constraints.arriveByMin + 0.01) continue;
    const legs = buildLegs(base, depart, constraints.nowMs, ctx);
    const peak = Math.max(...legs.map((l) => l.crowd), 0);
    if (!calmBest || peak < calmBest.peak) calmBest = { depart, peak };
  }
  if (calmBest) {
    candidates.push({
      strategy: "calm",
      depart: calmBest.depart,
      note: `waits ${Math.round(calmBest.depart - baseDepart)} min for a calmer ride`,
    });
  }

  // punctual — hit the deadline exactly, or take the next train
  if (constraints.arriveByMin !== undefined) {
    const depart = constraints.arriveByMin - duration;
    if (depart >= baseDepart && depart >= PARAMS.firstTrainMin) {
      candidates.push({ strategy: "punctual", depart, note: "arrives just as the deadline hits" });
    }
  } else {
    candidates.push({
      strategy: "punctual",
      depart: baseDepart + headway,
      note: "takes the next train instead",
    });
  }

  const bySignature = new Map<string, RoutePlan>();
  const order: RoutePlan[] = [];
  for (const c of candidates) {
    const plan = assemble(c.strategy, base, c.depart, c.note, constraints, ctx);
    if (bySignature.has(plan.signature)) continue;
    bySignature.set(plan.signature, plan);
    order.push(plan);
  }

  const plans: RoutePlan[] = [];
  const rejected: RoutePlan[] = [];
  for (const p of order) {
    if (p.feasible && (p.stepFree || !constraints.accessible)) plans.push(p);
    else rejected.push(p);
  }
  plans.sort((a, b) => a.arriveMin - b.arriveMin);
  rejected.sort((a, b) => a.arriveMin - b.arriveMin);
  return { plans: plans.slice(0, 3), rejected: rejected.slice(0, 2) };
}

/** Crowd band of the busiest leg — used for badges. */
export function worstBand(plan: RoutePlan): string {
  return bandOf(plan.peakCrowd);
}

export { bandOf, clamp };
