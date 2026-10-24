// ---------------------------------------------------------------------------
// MetroMind core types. Pure TypeScript, no framework imports — the engine in
// /lib is testable without Next.js and the UI is a thin skin over it.
// ---------------------------------------------------------------------------

export type LineId = "aqua" | "purple";

export type CrowdProfile =
  | "transit-hub"
  | "office"
  | "retail"
  | "residential"
  | "tourist";

export type CrowdLevel = "empty" | "moderate" | "packed";

export interface Accessibility {
  lift: boolean;
  ramp: boolean;
  tactile: boolean;
  stepFree: boolean;
}

export interface Station {
  id: string;
  name: string;
  lines: LineId[];
  lat: number;
  lng: number;
  mapX: number;
  mapY: number;
  labelPos: "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
  interchange: boolean;
  elevation: "elevated" | "underground";
  crowdProfile: CrowdProfile;
  amenities: string[];
  accessibility: Accessibility;
  exits: number;
  parking: "none" | "small" | "large";
  firstMile: string[];
  lastMile: string[];
  note?: string;
}

export interface MetroLine {
  id: LineId;
  name: string;
  color: string;
  corridor: string;
  note: string;
  stationIds: string[];
}

export interface EngineParams {
  baseFare: number;
  perStationFare: number;
  fareCap: number;
  headwayMin: number;
  dwellMin: number;
  transferMin: number;
  entryMin: number;
  exitMin: number;
  edgeTimeMin: number;
  firstTrainMin: number;
  lastTrainMin: number;
}

export interface MetroData {
  $meta: { label: string; sources: string[]; compiled: string; coordinatesNote: string };
  params: EngineParams;
  lines: MetroLine[];
  stations: Station[];
}

export interface Disruption {
  id: string;
  lineId: LineId;
  kind: "delay";
  minutes: number;
  createdAt: number; // epoch ms
}

export interface CrowdSpike {
  id: string;
  stationId: string;
  boost: number; // 0-100 added to the model score
  until: number; // epoch ms
}

export interface CrowdReport {
  id: string;
  stationId: string;
  level: CrowdLevel;
  at: number; // epoch ms
  source: "seed" | "user";
}

export type IncidentType =
  | "medical"
  | "harassment"
  | "hazard"
  | "lost-child"
  | "unsafe-area";

export type IncidentStatus = "open" | "assigned" | "resolved";

export interface Incident {
  id: string;
  type: IncidentType;
  stationId: string;
  note: string;
  peopleAffected: number;
  at: number; // epoch ms
  status: IncidentStatus;
  source: "seed" | "user";
}

export type HazardType = "pothole" | "lighting" | "crossing" | "near-miss" | "encroachment";

export interface Hazard {
  id: string;
  type: HazardType;
  nearStationId: string;
  location: string;
  note?: string;
  severity: 1 | 2 | 3 | 4 | 5;
  at: number; // epoch ms
  source: "seed" | "user";
}

export interface LostFoundPost {
  id: string;
  kind: "lost" | "found";
  item: string;
  stationId: string;
  detail: string;
  nickname: string;
  at: number;
  status: "open" | "reunited";
}

export interface BuddyRequest {
  id: string;
  nickname: string;
  stationId: string;
  direction: string;
  timeMin: number; // minutes-of-day preferred departure
  windowMin: number;
  note: string;
  at: number;
}

export interface CommunityEvent {
  id: string;
  title: string;
  stationId: string;
  whenLabel: string;
  detail: string;
  at: number;
}

export interface BuilderProfile {
  nickname: string;
  track: string;
  skills: string[];
  lookingFor: string[];
  idea: string;
  at: number;
}

// --- routing ---------------------------------------------------------------

export type Strategy = "fastest" | "calm" | "punctual";

export interface Constraints {
  nowMin: number; // minutes of day, simulated clock
  nowMs: number; // simulated epoch ms (for report ages)
  arriveByMin?: number;
  budget?: number;
  avoidCrowds?: boolean;
  accessible?: boolean;
}

export interface RouteLeg {
  lineId: LineId;
  fromId: string;
  toId: string;
  stationIds: string[];
  hops: number;
  boardMin: number;
  alightMin: number;
  crowd: number; // peak crowd score along the leg (0-100)
  delayMin: number;
}

export interface RoutePlan {
  id: string;
  strategy: Strategy;
  legIds: LineId[]; // lines used, in order
  legs: RouteLeg[];
  stationIds: string[];
  totalMin: number; // includes entry + exit buffers
  rideMin: number;
  departMin: number;
  arriveMin: number;
  slackMin: number; // minutes before arriveBy (or vs "now")
  fare: number;
  transfers: number;
  hops: number;
  peakCrowd: number;
  stepFree: boolean;
  notes: string[];
  signature: string;
  feasible: boolean;
}

export interface PlanContext {
  constraints: Constraints;
  disruptions: Disruption[];
  spikes: CrowdSpike[];
  reports: CrowdReport[];
}
