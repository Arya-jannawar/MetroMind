/**
 * Live-feed integration layer.
 *
 * MetroMind ships with a deterministic demo dataset, but the whole app reads
 * network conditions through a narrow seam (line delays + station crowd), so a
 * real feed can be dropped in without touching any UI. This module is the
 * contract for that feed: tolerant normalization, station matching and the
 * crowd→boost mapping. Pure TypeScript, no framework imports, unit-tested.
 *
 * Expected upstream JSON (any provider that can emit this shape works —
 * a GTFS-RT converter, an authority gateway, or a local gateway script):
 *
 * {
 *   "updatedAt": "2026-10-24T09:00:00+05:30",
 *   "lines": [
 *     { "id": "aqua",   "status": "delay", "delayMin": 12 },
 *     { "id": "purple", "status": "normal" }
 *   ],
 *   "stations": [
 *     { "id": "shivaji-nagar", "crowd": 0.72 },
 *     { "name": "Deccan Gymkhana", "crowd": 0.31 }
 *   ]
 * }
 *
 * `crowd` is a 0–1 estimate (values >1 are treated as percentages). Station
 * entries match our dataset by id or name, slugified, so "Shivaji Nagar",
 * "shivaji-nagar" and "SHIVAJI NAGAR" all resolve. Unmatched entries are
 * counted and skipped — never guessed.
 */

import { STATIONS } from "./data";

export type LiveLineStatus = "normal" | "delay" | "disrupted";

export interface LiveLineState {
  lineId: "aqua" | "purple";
  status: LiveLineStatus;
  delayMin: number;
}

export interface LiveStationState {
  stationId: string;
  crowd: number; // 0..1
}

export interface NormalizedFeed {
  fetchedAt: number;
  sourceUpdatedAt: number | null;
  lines: LiveLineState[];
  stations: LiveStationState[];
  matched: number;
  unmatched: number;
}

export type FeedResult = { ok: true; feed: NormalizedFeed } | { ok: false; error: string };

export function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function compact(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Every key a station can be addressed by: its id, its name, and the
// punctuation-free variants of both (so "R.T.O. Pune" matches "rto-pune").
const STATION_LOOKUP: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const s of STATIONS) {
    for (const key of [s.id, s.name, slug(s.id), slug(s.name), compact(s.id), compact(s.name)]) {
      if (!m.has(key)) m.set(key, s.id);
    }
  }
  return m;
})();

export function matchStation(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  return STATION_LOOKUP.get(raw.trim()) ?? STATION_LOOKUP.get(slug(raw)) ?? null;
}

function matchLine(raw: unknown): "aqua" | "purple" | null {
  if (typeof raw !== "string") return null;
  const s = slug(raw);
  if (s.includes("aqua")) return "aqua";
  if (s.includes("purple")) return "purple";
  return null;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** Crowd 0..1 → additive boost on the same scale as Demo Control spikes. */
export function crowdToBoost(crowd: number): number {
  if (crowd <= 0.33) return 0;
  return Math.round(clamp((crowd - 0.33) / 0.67, 0, 1) * 60);
}

function parseCrowd(raw: unknown): number | null {
  if (typeof raw !== "number" || Number.isNaN(raw)) return null;
  const c = raw > 1 && raw <= 100 ? raw / 100 : raw; // accept percentages
  if (c < 0 || c > 1) return null;
  return c;
}

function parseUpdatedAt(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const t = Date.parse(raw);
    if (Number.isFinite(t)) return t;
  }
  return null;
}

interface RawLine {
  id?: unknown;
  line?: unknown;
  status?: unknown;
  delayMin?: unknown;
  delay?: unknown;
}
interface RawStation {
  id?: unknown;
  stationId?: unknown;
  station?: unknown;
  name?: unknown;
  crowd?: unknown;
  level?: unknown;
}

/** Tolerant normalization — never throws, reports what it could not use. */
export function normalizeLiveFeed(raw: unknown): FeedResult {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "feed root must be a JSON object" };
  }
  const root = raw as Record<string, unknown>;

  const lines: LiveLineState[] = [];
  if (Array.isArray(root.lines)) {
    for (const item of root.lines as RawLine[]) {
      if (!item || typeof item !== "object") continue;
      const lineId = matchLine(item.id ?? item.line);
      if (!lineId) continue;
      const rawDelay =
        typeof item.delayMin === "number"
          ? item.delayMin
          : typeof item.delay === "number"
            ? item.delay
            : 0;
      const status: LiveLineStatus =
        item.status === "delay" || item.status === "disrupted" || item.status === "normal"
          ? item.status
          : rawDelay > 0
            ? "delay"
            : "normal";
      const delayMin =
        status === "normal" ? 0 : clamp(rawDelay > 0 ? rawDelay : status === "disrupted" ? 20 : 10, 0, 90);
      lines.push({ lineId, status, delayMin });
    }
  }

  const stations: LiveStationState[] = [];
  let unmatched = 0;
  if (Array.isArray(root.stations)) {
    for (const item of root.stations as RawStation[]) {
      if (!item || typeof item !== "object") continue;
      const stationId = matchStation(item.id ?? item.stationId ?? item.station ?? item.name);
      const crowd = parseCrowd(item.crowd ?? item.level);
      if (!stationId || crowd === null) {
        unmatched += 1;
        continue;
      }
      stations.push({ stationId, crowd });
    }
  }

  if (lines.length === 0 && stations.length === 0) {
    return { ok: false, error: "no recognizable line or station entries in feed" };
  }

  return {
    ok: true,
    feed: {
      fetchedAt: Date.now(),
      sourceUpdatedAt: parseUpdatedAt(root.updatedAt ?? root.generated_at ?? root.timestamp),
      lines,
      stations,
      matched: stations.length,
      unmatched,
    },
  };
}

/** Derived pushes for the live-state store: line delays + crowd boosts. */
export function feedToLiveState(feed: NormalizedFeed): {
  delays: Array<{ lineId: "aqua" | "purple"; delayMin: number }>;
  boosts: Array<{ stationId: string; boost: number }>;
} {
  return {
    delays: feed.lines
      .filter((l) => l.delayMin > 0)
      .map((l) => ({ lineId: l.lineId, delayMin: l.delayMin })),
    boosts: feed.stations
      .map((s) => ({ stationId: s.stationId, boost: crowdToBoost(s.crowd) }))
      .filter((b) => b.boost > 0),
  };
}
