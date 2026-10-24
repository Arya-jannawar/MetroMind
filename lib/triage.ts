import { station } from "./data";
import type { Incident, IncidentType } from "./types";

const SEVERITY_BASE: Record<IncidentType, number> = {
  "lost-child": 88,
  medical: 82,
  harassment: 74,
  hazard: 46,
  "unsafe-area": 36,
};

const FOOTFALL_BONUS: Record<string, number> = {
  "transit-hub": 10,
  office: 6,
  retail: 5,
  tourist: 3,
  residential: 2,
};

const RECOMMENDED_ACTION: Record<IncidentType, string> = {
  medical:
    "Dispatch first-aid response + call 108. Keep one gate lane clear for the ambulance handover.",
  harassment:
    "Send two staff (at least one woman constable) to the platform zone. Notify police helpline 1091 and record CCTV clip.",
  "lost-child":
    "Freeze exits for 10 min, announce description on PA, review platform CCTV, staff both lift lobbies.",
  hazard: "Cordon the area, place a warning sign, dispatch housekeeping. Recheck after 15 min.",
  "unsafe-area":
    "Increase patrol frequency, verify lighting, log for the daily safety review meeting.",
};

export interface TriageResult {
  score: number;
  action: string;
  why: string;
  components: { label: string; points: number }[];
}

/**
 * Triage score (0-100) = type severity + people affected + station footfall
 * + recency. Open incidents only; assigned/resolved sink in the queue.
 */
export function triage(incident: Incident, nowMs: number): TriageResult {
  const st = station(incident.stationId);
  const components: { label: string; points: number }[] = [];

  const base = SEVERITY_BASE[incident.type] ?? 40;
  components.push({ label: `type · ${incident.type.replace("-", " ")}`, points: base });

  const people = Math.min(20, incident.peopleAffected * 5);
  if (people > 0) components.push({ label: `${incident.peopleAffected} people affected`, points: people });

  const footfall = FOOTFALL_BONUS[st.crowdProfile] ?? 2;
  components.push({ label: `${st.name} is a high-footfall ${st.crowdProfile}`, points: footfall });

  const ageMin = (nowMs - incident.at) / 60000;
  const recency = ageMin < 10 ? 8 : ageMin < 30 ? 4 : 0;
  if (recency > 0) components.push({ label: "reported just now", points: recency });

  const statusPenalty = incident.status === "open" ? 0 : incident.status === "assigned" ? -15 : -60;
  if (statusPenalty !== 0)
    components.push({ label: `status · ${incident.status}`, points: statusPenalty });

  const score = Math.max(
    0,
    Math.min(100, components.reduce((acc, c) => acc + c.points, 0)),
  );

  return {
    score,
    action: RECOMMENDED_ACTION[incident.type] ?? "Send station staff to assess.",
    why: components.map((c) => `${c.label} (+${c.points})`).join(", "),
    components,
  };
}

/** Sorted control-room queue: open first, then by score desc. */
export function rankedQueue(incidents: Incident[], nowMs: number): { incident: Incident; triage: TriageResult }[] {
  return incidents
    .filter((i) => i.status !== "resolved")
    .map((incident) => ({ incident, triage: triage(incident, nowMs) }))
    .sort((a, b) => {
      if (a.incident.status !== b.incident.status) {
        return a.incident.status === "open" ? -1 : 1;
      }
      return b.triage.score - a.triage.score;
    });
}
