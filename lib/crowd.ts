import { PARAMS, hopsOn, linesOf, sameLine, station } from "./data";
import type { CrowdReport, CrowdSpike, Disruption, LineId } from "./types";

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** Small deterministic pseudo-noise from a string + hour, stable per build. */
export function hashNoise(seed: string, hour: number): number {
  let h = 2166136261;
  const s = `${seed}:${Math.floor(hour)}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000; // 0..1
}

function gauss(x: number, mean: number, sd: number): number {
  return Math.exp(-((x - mean) ** 2) / (2 * sd * sd));
}

const PROFILE_FACTOR: Record<string, number> = {
  "transit-hub": 1.22,
  office: 1.12,
  retail: 1.08,
  tourist: 1.0,
  residential: 0.82,
};

const PROFILE_BASE: Record<string, number> = {
  "transit-hub": 30,
  office: 26,
  retail: 24,
  tourist: 20,
  residential: 16,
};

/**
 * Deterministic model score (0-100) for a station at a minute-of-day.
 * Two commuter peaks (morning ~09:00, evening ~18:30) + station character.
 */
export function modelScore(profile: string, stationId: string, minOfDay: number): number {
  const h = minOfDay / 60;
  const morning = 46 * gauss(h, 9, 1.4);
  const evening = 52 * gauss(h, 18.5, 1.7);
  const midday = 10 * gauss(h, 13, 2.6);
  const base = PROFILE_BASE[profile] ?? 20;
  const factor = PROFILE_FACTOR[profile] ?? 1;
  const noise = (hashNoise(stationId, h) - 0.5) * 12;
  return clamp((base + morning + evening + midday) * factor + noise, 0, 100);
}

/** Time-decay weight: 15-minute half-life. */
export function decayWeight(ageMin: number): number {
  return Math.pow(0.5, ageMin / 15);
}

export const REPORT_LEVEL_SCORE: Record<string, number> = {
  empty: 14,
  moderate: 55,
  packed: 90,
};

/**
 * Blend the deterministic model with fresh anonymous reports.
 * Reports dominate as their count and freshness grow; stale ones vanish.
 */
export function blendScore(
  profile: string,
  stationId: string,
  nowMin: number,
  reports: CrowdReport[],
  nowMs: number,
  spikeBoost = 0,
): number {
  const model = modelScore(profile, stationId, nowMin);
  const fresh = reports.filter((r) => {
    const age = (nowMs - r.at) / 60000;
    return age >= 0 && age <= 45;
  });
  let blended = model;
  if (fresh.length > 0) {
    let wSum = 0;
    let vSum = 0;
    for (const r of fresh) {
      const age = (nowMs - r.at) / 60000;
      const w = decayWeight(age);
      wSum += w;
      vSum += w * (REPORT_LEVEL_SCORE[r.level] ?? 50);
    }
    const reportScore = vSum / wSum;
    const reportShare = clamp(0.3 + fresh.length * 0.08, 0.3, 0.7);
    blended = (1 - reportShare) * model + reportShare * reportScore;
  }
  return clamp(blended + spikeBoost, 0, 100);
}

export type CrowdBand = "light" | "moderate" | "busy" | "packed";

export const BAND_META: Record<CrowdBand, { label: string; color: string; bg: string }> = {
  light: { label: "Light", color: "#4ad6a5", bg: "rgba(38,166,110,0.16)" },
  moderate: { label: "Moderate", color: "#e8c34a", bg: "rgba(214,168,52,0.16)" },
  busy: { label: "Busy", color: "#f0904a", bg: "rgba(224,122,52,0.18)" },
  packed: { label: "Packed", color: "#f26d6d", bg: "rgba(226,80,80,0.2)" },
};

export function bandOf(score: number): CrowdBand {
  if (score < 32) return "light";
  if (score < 58) return "moderate";
  if (score < 78) return "busy";
  return "packed";
}

/** Aggregate delay currently injected on a line. */
export function lineDelayMin(disruptions: Disruption[], lineId: LineId): number {
  return disruptions
    .filter((d) => d.lineId === lineId)
    .reduce((acc, d) => acc + d.minutes, 0);
}

/** Service status for the home strip. */
export function serviceStatus(
  disruptions: Disruption[],
  lineId: LineId,
): { state: "normal" | "delayed" | "disrupted"; minutes: number } {
  const m = lineDelayMin(disruptions, lineId);
  if (m === 0) return { state: "normal", minutes: 0 };
  if (m <= 10) return { state: "delayed", minutes: m };
  return { state: "disrupted", minutes: m };
}

export function activeSpikeBoost(spikes: CrowdSpike[], stationId: string, nowMs: number): number {
  let boost = 0;
  for (const s of spikes) {
    if (s.stationId === stationId && s.until > nowMs) boost += s.boost;
  }
  return boost;
}

/** Crowding penalty (extra minutes) applied to an edge when avoiding crowds. */
export function crowdPenaltyMin(score: number, weight: number): number {
  const f = clamp(score, 0, 100) / 100;
  return weight * f * f * 14;
}

/** Reports at a station newer than 45 min, newest first (for freshness lines). */
export function freshReports(reports: CrowdReport[], stationId: string, nowMs: number): CrowdReport[] {
  return reports
    .filter((r) => r.stationId === stationId && nowMs - r.at >= 0 && nowMs - r.at <= 45 * 60000)
    .sort((a, b) => b.at - a.at);
}

/** Human freshness string, e.g. "3 reports in the last 10 min". */
export function freshnessLine(reports: CrowdReport[], stationId: string, nowMs: number): string {
  const fresh = freshReports(reports, stationId, nowMs);
  if (fresh.length === 0) return "no live reports — model estimate";
  const last10 = fresh.filter((r) => nowMs - r.at <= 10 * 60000).length;
  if (last10 > 0) return `${last10} report${last10 === 1 ? "" : "s"} in the last 10 min`;
  const mins = Math.round((nowMs - fresh[0].at) / 60000);
  return `last report ${mins} min ago`;
}

/** Confidence 0-1 from report volume + freshness. */
export function confidenceOf(reports: CrowdReport[], stationId: string, nowMs: number): number {
  const fresh = freshReports(reports, stationId, nowMs);
  const w = fresh.reduce((acc, r) => acc + decayWeight((nowMs - r.at) / 60000), 0);
  return clamp(w / 3, 0, 1);
}

// Convenience used by routing: crowd score for a station at sim time.
export function crowdAt(
  stationId: string,
  nowMin: number,
  nowMs: number,
  reports: CrowdReport[],
  spikes: CrowdSpike[],
): number {
  const st = station(stationId);
  return blendScore(
    st.crowdProfile,
    stationId,
    nowMin,
    reports,
    nowMs,
    activeSpikeBoost(spikes, stationId, nowMs),
  );
}

export { PARAMS, hopsOn, linesOf, sameLine };
