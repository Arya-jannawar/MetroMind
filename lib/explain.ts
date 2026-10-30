import { PARAMS, stationName } from "./data";
import { BAND_META, bandOf } from "./crowd";
import type { RoutePlan } from "./types";
import { minToHHMM } from "./time";

// ---------------------------------------------------------------------------
// Deterministic template explanations. AI (/api/copilot) can upgrade these,
// but the demo must be complete with the key absent — so these are written
// to stand on their own.
// ---------------------------------------------------------------------------

const STRATEGY_LABEL: Record<RoutePlan["strategy"], string> = {
  fastest: "Fastest",
  calm: "Calmer ride",
  punctual: "Just-in-time",
};

export function strategyLabel(s: RoutePlan["strategy"]): string {
  return STRATEGY_LABEL[s];
}

/** One-sentence "why this route" for a plan. */
export function explainPlan(plan: RoutePlan, destId: string): string {
  const dest = stationName(destId);
  const arrive = minToHHMM(plan.arriveMin);
  const depart = minToHHMM(plan.departMin);
  const busiestLeg = [...plan.legs].sort((a, b) => b.crowd - a.crowd)[0];
  const band = BAND_META[bandOf(busiestLeg?.crowd ?? 0)];

  switch (plan.strategy) {
    case "fastest": {
      const slack =
        plan.slackMin > 0 ? ` — ${plan.slackMin} min buffer before your deadline` : "";
      const crowd =
        band.label === "Light"
          ? "All legs look light right now."
          : `Busiest stretch is ${stationName(busiestLeg.fromId)}→${stationName(busiestLeg.toId)} (${band.label.toLowerCase()}).`;
      return `Leaves now: board at ${depart}, reach ${dest} by ${arrive}${slack}. ${crowd}`;
    }
    case "calm": {
      return `Chosen for lighter platforms: peak crowd is only “${band.label}” versus the crush later, at the cost of departing ${depart} instead of straight away.`;
    }
    case "punctual": {
      return `Leaves at ${depart} so you reach ${dest} right at ${arrive} — no waiting around at the far end, but you ride the ${band.label.toLowerCase()} window.`;
    }
  }
}

/** Reroute banner text when a disruption changes the recommended plan. */
export function explainChange(
  before: RoutePlan | undefined,
  after: RoutePlan,
  injectedLine: string | null,
): string {
  if (!before) return "";
  if (before.signature === after.signature) {
    if (!injectedLine) return "";
    if (!after.legIds.includes(injectedLine as RoutePlan["legIds"][number])) {
      return `${cap(injectedLine)} line is delayed — your route doesn't use it, so your plan is unchanged.`;
    }
    const delta = after.arriveMin - before.arriveMin;
    return `${cap(injectedLine)} line delay absorbed: your trip now arrives ${minToHHMM(
      after.arriveMin,
    )} (${Math.round(delta)} min later). Phase 1 has a single corridor for this trip, so the delay is priced in honestly.`;
  }
  const oldLines = before.legIds.join(" → ");
  const newLines = after.legIds.join(" → ");
  const delta = after.totalMin - before.totalMin;
  const deltaBit =
    delta > 0.05
      ? `${Math.round(delta)} min slower`
      : delta < -0.05
        ? `${Math.round(-delta)} min faster`
        : "same duration";
  return `Replanned: ${cap(injectedLine ?? "a")} line delay detected. Switched from ${oldLines} to ${newLines} — ${deltaBit}, arriving ${minToHHMM(after.arriveMin)}.`;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Buddy match explanation. */
export function explainBuddyMatch(
  a: { nickname: string; timeMin: number; windowMin: number },
  b: { nickname: string; timeMin: number; windowMin: number },
  overlap: number,
): string {
  return `Both depart around ${minToHHMM(a.timeMin)} (±${a.windowMin} min) — about ${overlap} min of shared window, same platform direction.`;
}

/** Builder (ConnectIQ) match explanation. */
export function explainBuilderMatch(
  me: { lookingFor: string[] },
  them: { nickname: string; skills: string[]; idea: string },
): { score: number; why: string } {
  const hits = me.lookingFor.filter((s) => them.skills.includes(s));
  const score = me.lookingFor.length === 0 ? 0 : Math.round((hits.length / me.lookingFor.length) * 100);
  const why =
    hits.length > 0
      ? `${them.nickname} has the skills you're missing: ${hits.join(", ")}. Building: ${them.idea}.`
      : `${them.nickname} is on a different stack, but is also looking — their idea: ${them.idea}.`;
  return { score, why };
}

/** SafeStreets AI summary (template version; GLM may upgrade via /api/copilot). */
export function explainHazards(
  hazards: { type: string; severity: number; nearStationId: string; location: string }[],
): string {
  if (hazards.length === 0) return "No hazards reported yet — the city map fills in as commuters report.";
  const byType = new Map<string, number>();
  for (const h of hazards) byType.set(h.type, (byType.get(h.type) ?? 0) + 1);
  const topType = [...byType.entries()].sort((a, b) => b[1] - a[1])[0];
  const worst = [...hazards].sort((a, b) => b.severity - a.severity)[0];
  return `${hazards.length} report${hazards.length === 1 ? "" : "s"} on file. Most common: ${topType[0]} (${topType[1]}). Highest-severity: ${worst.type} near ${stationName(worst.nearStationId)} — ${worst.location}. Suggested for inspection first.`;
}

export { PARAMS };
