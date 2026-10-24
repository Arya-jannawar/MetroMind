import metro from "@/data/pune-metro.json";
import type { LineId, MetroData, MetroLine, Station } from "./types";

// JSON import is typed loosely; validate the minimal shape we rely on.
const data = metro as unknown as MetroData;

export const META = data.$meta;
export const PARAMS = data.params;

export const STATIONS: Station[] = data.stations;
export const LINES: MetroLine[] = data.lines;
export const SORTED_STATIONS: Station[] = [...STATIONS].sort((a, b) =>
  a.name.localeCompare(b.name),
);

const byId = new Map<string, Station>(STATIONS.map((s) => [s.id, s]));

export function station(id: string): Station {
  const s = byId.get(id);
  if (!s) throw new Error(`Unknown station: ${id}`);
  return s;
}

export function stationName(id: string): string {
  return byId.get(id)?.name ?? id;
}

export function hasStation(id: string): boolean {
  return byId.has(id);
}

export function allStationIds(): string[] {
  return STATIONS.map((s) => s.id);
}

export function line(id: LineId): MetroLine {
  const l = LINES.find((x) => x.id === id);
  if (!l) throw new Error(`Unknown line: ${id}`);
  return l;
}

export const LINE_COLORS: Record<LineId, string> = {
  aqua: line("aqua").color,
  purple: line("purple").color,
};

/** Ordered station ids of a line. */
export function lineStationIds(lineId: LineId): string[] {
  return line(lineId).stationIds;
}

/** Position index of a station on a line, or -1. */
export function indexOn(lineId: LineId, stationId: string): number {
  return lineStationIds(lineId).indexOf(stationId);
}

/** Lines that serve a station. */
export function linesOf(stationId: string): LineId[] {
  return station(stationId).lines;
}

/** True when both stations sit on the same line (any order). */
export function sameLine(a: string, b: string): LineId | null {
  for (const l of linesOf(a)) {
    if (linesOf(b).includes(l)) return l;
  }
  return null;
}

/** Number of stops between two stations on the same line. */
export function hopsOn(lineId: LineId, a: string, b: string): number {
  const ia = indexOn(lineId, a);
  const ib = indexOn(lineId, b);
  if (ia < 0 || ib < 0) return 0;
  return Math.abs(ib - ia);
}

/**
 * Stations between a and b inclusive on a line, in travel order.
 */
export function segmentOn(lineId: LineId, a: string, b: string): string[] {
  const ids = lineStationIds(lineId);
  const ia = ids.indexOf(a);
  const ib = ids.indexOf(b);
  if (ia < 0 || ib < 0) return [];
  const [from, to] = ia <= ib ? [ia, ib] : [ib, ia];
  const seg = ids.slice(from, to + 1);
  return ia <= ib ? seg : seg.reverse();
}

export const INTERCHANGE_IDS = STATIONS.filter((s) => s.interchange).map((s) => s.id);
