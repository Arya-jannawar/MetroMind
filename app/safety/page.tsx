"use client";

import { useMemo, useState } from "react";
import { PhoneCall, ShieldAlert } from "lucide-react";
import { CrowdBadge } from "@/components/Badges";
import { DemoNote, EmptyState, PageHeader, Segmented } from "@/components/ui";
import { STATIONS, stationName } from "@/lib/data";
import { rankedQueue } from "@/lib/triage";

const SORTED_STATIONS = [...STATIONS].sort((a, b) => a.name.localeCompare(b.name));
import { explainHazards } from "@/lib/explain";
import { relTime } from "@/lib/time";
import { useLiveStore } from "@/store/live";
import { useRescueStore } from "@/store/rescue";
import { useSafeStore } from "@/store/safe";
import type { HazardType, IncidentType } from "@/lib/types";

const INCIDENT_TYPES: { value: IncidentType; label: string }[] = [
  { value: "medical", label: "Medical" },
  { value: "harassment", label: "Harassment" },
  { value: "hazard", label: "Hazard (spill / obstacle)" },
  { value: "lost-child", label: "Lost child" },
  { value: "unsafe-area", label: "Unsafe area" },
];

const HAZARD_TYPES: { value: HazardType; label: string }[] = [
  { value: "pothole", label: "Pothole" },
  { value: "lighting", label: "Poor lighting" },
  { value: "crossing", label: "Dangerous crossing" },
  { value: "near-miss", label: "Near miss" },
  { value: "encroachment", label: "Blocked footpath" },
];

const TYPE_COLOR: Record<string, string> = {
  medical: "var(--danger)",
  harassment: "var(--grape)",
  "lost-child": "var(--warn)",
  hazard: "var(--aqua)",
  "unsafe-area": "var(--muted)",
};

function RescueGrid() {
  const incidents = useRescueStore((s) => s.incidents);
  const addIncident = useRescueStore((s) => s.addIncident);
  const setStatus = useRescueStore((s) => s.setStatus);

  const [type, setType] = useState<IncidentType>("medical");
  const [stationId, setStationId] = useState("district-court");
  const [note, setNote] = useState("");
  const [people, setPeople] = useState(1);
  const [flash, setFlash] = useState(false);

  const queue = useMemo(() => rankedQueue(incidents, Date.now()), [incidents]);
  const resolved = incidents.filter((i) => i.status === "resolved");

  function submit() {
    addIncident({ type, stationId, note: note.trim() || "(no description given)", peopleAffected: people }, Date.now());
    setNote("");
    setFlash(true);
    setTimeout(() => setFlash(false), 3500);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      {/* report form */}
      <div className="space-y-4">
        <div className="card p-4">
          <p className="kicker mb-3">Report an incident</p>
          <div className="space-y-3">
            <label className="block">
              <span className="kicker mb-1.5 block">Type</span>
              <select className="field" value={type} onChange={(e) => setType(e.target.value as IncidentType)}>
                {INCIDENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="kicker mb-1.5 block">Station</span>
              <select className="field" value={stationId} onChange={(e) => setStationId(e.target.value)}>
                {SORTED_STATIONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="kicker mb-1.5 block">One-line description</span>
              <textarea
                className="field min-h-[64px] resize-y"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What is happening, where exactly?"
              />
            </label>
            <label className="block">
              <span className="kicker mb-1.5 block">People affected</span>
              <input
                type="number"
                min={0}
                max={50}
                className="field num"
                value={people}
                onChange={(e) => setPeople(Math.max(0, Number(e.target.value)))}
              />
            </label>
            <button onClick={submit} className="btn-primary w-full">
              send to control room
            </button>
            {flash && (
              <p className="anim-rise text-[12px] text-ok">
                Logged — the queue below re-ranked with your report.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-card border border-danger/35 bg-danger/[0.06] p-4">
          <p className="flex items-start gap-2 text-[12.5px] leading-relaxed text-dim">
            <PhoneCall size={14} className="mt-0.5 shrink-0 text-danger" />
            <span>
              <strong className="text-ink">Prototype only — this does NOT dispatch real help.</strong>{" "}
              For real emergencies call 112, or speak to station staff. The control-room view below
              demonstrates triage ranking on demo data.
            </span>
          </p>
        </div>
      </div>

      {/* control-room queue */}
      <div>
        <div className="card">
          <div className="flex items-center justify-between border-b border-line-soft px-4 py-3">
            <div>
              <p className="kicker">Mock control room · station staff view</p>
              <h2 className="text-[15px] font-semibold text-ink">Triage queue</h2>
            </div>
            <span className="num text-[11px] text-muted">
              {queue.length} open · ranked by score
            </span>
          </div>
          {queue.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="Queue clear"
                body="No open incidents. Reports from riders and staff would appear here, ranked by severity, footfall and recency."
              />
            </div>
          ) : (
            <ol className="divide-y divide-line-soft">
              {queue.map(({ incident, triage: t }, idx) => (
                <li key={incident.id} className="anim-rise px-4 py-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="num text-[11px] text-muted">#{idx + 1}</span>
                    <span
                      className="rounded px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-wider"
                      style={{ background: `${TYPE_COLOR[incident.type]}1a`, color: TYPE_COLOR[incident.type] }}
                    >
                      {incident.type.replace("-", " ")}
                    </span>
                    <span className="text-[13.5px] font-medium text-ink">
                      {stationName(incident.stationId)}
                    </span>
                    <span className="num ml-auto text-[11px] text-muted">
                      {relTime(incident.at)} · {incident.source === "seed" ? "sample" : "user"}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[13px] text-dim">{incident.note}</p>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface2">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${t.score}%`,
                        background:
                          t.score > 74 ? "var(--danger)" : t.score > 50 ? "var(--warn)" : "var(--aqua)",
                      }}
                    />
                  </div>
                  <p className="num mt-1.5 text-[11px] text-muted">
                    score {t.score}/100 — why: {t.why}
                  </p>
                  <p className="mt-2 rounded-md border border-aqua/20 bg-aqua/[0.06] px-3 py-2 text-[12.5px] leading-relaxed text-dim">
                    <span className="mr-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-aqua">
                      Recommended
                    </span>
                    {t.action}
                  </p>
                  <div className="mt-2.5 flex gap-2">
                    <button
                      onClick={() => setStatus(incident.id, "assigned")}
                      disabled={incident.status !== "open"}
                      className="btn-ghost h-8 px-3 text-[12px]"
                    >
                      assign team
                    </button>
                    <button
                      onClick={() => setStatus(incident.id, "resolved")}
                      className="btn-quiet h-8 border border-ok/40 px-3 text-[12px] text-ok hover:bg-ok/10"
                    >
                      resolve
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
        {resolved.length > 0 && (
          <p className="num mt-2 text-[11px] text-muted">
            {resolved.length} resolved this session · state persists in this browser (localStorage)
          </p>
        )}
        <div className="mt-4">
          <DemoNote>
            DEMO DATA — four seeded incidents ship with the app; the queue re-ranks live from
            severity + people affected + station footfall + recency.
          </DemoNote>
        </div>
      </div>
    </div>
  );
}

function RiskMap({ hazards }: { hazards: ReturnType<typeof useSafeStore.getState>["hazards"] }) {
  // schematic geo projection of the two corridors
  const project = (lat: number, lng: number, seed: string) => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 997;
    const jx = ((h % 10) - 4.5) * 3.4;
    const jy = (((h * 7) % 10) - 4.5) * 3.4;
    const x = ((lng - 73.785) / (73.925 - 73.785)) * 940 + 20;
    const y = ((18.635 - lat) / (18.635 - 18.495)) * 420 + 20;
    return { x: x + jx, y: y + jy };
  };
  const lines = [
    { color: "var(--aqua)", ids: STATIONS.filter((s) => s.lines.includes("aqua")).map((s) => s.id) },
    { color: "var(--grape)", ids: STATIONS.filter((s) => s.lines.includes("purple")).map((s) => s.id) },
  ];
  return (
    <svg viewBox="0 0 980 460" className="h-auto w-full rounded-card border border-line bg-[#0b0f14] dotted-bg" role="img" aria-label="Schematic risk map of reported hazards near metro stations">
      {lines.map((l, i) => (
        <polyline
          key={i}
          points={l.ids
            .map((id) => {
              const s = STATIONS.find((x) => x.id === id)!;
              return `${project(s.lat, s.lng, s.id).x},${project(s.lat, s.lng, s.id).y}`;
            })
            .join(" ")}
          fill="none"
          stroke={l.color}
          strokeWidth={3}
          opacity={0.4}
        />
      ))}
      {STATIONS.map((s) => {
        const p = project(s.lat, s.lng, s.id);
        return <circle key={s.id} cx={p.x} cy={p.y} r={3} fill="#3a4756" />;
      })}
      {hazards.map((h) => {
        const st = STATIONS.find((s) => s.id === h.nearStationId);
        if (!st) return null;
        const p = project(st.lat, st.lng, h.id);
        const color = h.severity >= 4 ? "var(--danger)" : h.severity === 3 ? "var(--warn)" : "var(--ok)";
        return (
          <g key={h.id}>
            <circle cx={p.x} cy={p.y} r={6 + h.severity * 2} fill={color} opacity={0.18} />
            <circle cx={p.x} cy={p.y} r={3 + h.severity * 0.8} fill={color} opacity={0.95} />
          </g>
        );
      })}
      <text x={20} y={440} fontSize={10} className="font-mono" fill="#5a6775">
        SCHEMATIC GEO PROJECTION · DEMO DATA
      </text>
    </svg>
  );
}

function SafeStreets() {
  const hazards = useSafeStore((s) => s.hazards);
  const addHazard = useSafeStore((s) => s.addHazard);

  const [type, setType] = useState<HazardType>("pothole");
  const [near, setNear] = useState("pune-railway-station");
  const [location, setLocation] = useState("");
  const [severity, setSeverity] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [flash, setFlash] = useState(false);

  const sorted = useMemo(
    () =>
      [...hazards].sort(
        (a, b) => b.severity * 1e9 + (Date.now() - b.at) - (a.severity * 1e9 + (Date.now() - a.at)),
      ),
    [hazards],
  );

  const summary = useMemo(() => explainHazards(hazards), [hazards]);

  function submit() {
    addHazard(
      {
        type,
        nearStationId: near,
        location: location.trim() || "(location not given)",
        severity,
      },
      Date.now(),
    );
    setLocation("");
    setFlash(true);
    setTimeout(() => setFlash(false), 3500);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-4">
          <div className="card p-4">
            <p className="kicker mb-3">Report a street hazard</p>
            <div className="space-y-3">
              <label className="block">
                <span className="kicker mb-1.5 block">Type</span>
                <select className="field" value={type} onChange={(e) => setType(e.target.value as HazardType)}>
                  {HAZARD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="kicker mb-1.5 block">Nearest metro station</span>
                <select className="field" value={near} onChange={(e) => setNear(e.target.value)}>
                  {SORTED_STATIONS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="kicker mb-1.5 block">Where exactly</span>
                <input
                  className="field"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. service lane near exit 2"
                />
              </label>
              <label className="block">
                <span className="kicker mb-1.5 block">Severity · {severity}/5</span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={severity}
                  onChange={(e) => setSeverity(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
                  className="w-full accent-[var(--aqua)]"
                />
              </label>
              <button onClick={submit} className="btn-primary w-full">
                pin it on the risk map
              </button>
              {flash && <p className="anim-rise text-[12px] text-ok">Added to the map below.</p>}
            </div>
          </div>
          <div className="rounded-card border border-line bg-surface p-4">
            <p className="flex items-start gap-2 text-[12.5px] leading-relaxed text-dim">
              <ShieldAlert size={14} className="mt-0.5 shrink-0 text-warn" />
              <span>
                <strong className="text-ink">Community layer, not an authority channel.</strong>{" "}
                Reports are aggregated and labelled DEMO DATA; a real deployment would route to the
                ward engineer / PMC with photo verification.
              </span>
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <p className="kicker mb-2">City risk map (station-anchored)</p>
            <RiskMap hazards={hazards} />
          </div>
          <div className="card p-4">
            <p className="kicker mb-1.5">AI summary of the queue</p>
            <p className="text-[13.5px] leading-relaxed text-dim">{summary}</p>
            <p className="mt-2 font-mono text-[10px] text-muted">
              rule-based summary · deterministic template, no external AI required
            </p>
          </div>
        </div>
      </div>

      <div>
        <p className="kicker mb-2">Hazard queue · severity first</p>
        {sorted.length === 0 ? (
          <EmptyState title="No hazards reported" body="Be the first — pin a pothole or a dark stretch near your station." />
        ) : (
          <ul className="grid gap-2.5 md:grid-cols-2">
            {sorted.map((h) => (
              <li key={h.id} className="card flex items-start gap-3 p-3.5">
                <span
                  className="num flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[13px] font-semibold"
                  style={{
                    background: h.severity >= 4 ? "rgba(226,80,80,0.14)" : h.severity === 3 ? "rgba(214,168,52,0.14)" : "rgba(38,166,110,0.14)",
                    color: h.severity >= 4 ? "var(--danger)" : h.severity === 3 ? "var(--warn)" : "var(--ok)",
                  }}
                >
                  {h.severity}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium capitalize text-ink">
                    {h.type} · {stationName(h.nearStationId)}
                  </p>
                  <p className="truncate text-[12px] text-muted">{h.location}</p>
                  <p className="num mt-0.5 text-[10.5px] text-muted">{relTime(h.at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function SafetyPage() {
  const [tab, setTab] = useState<"rescue" | "streets">("rescue");
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        kicker="M3 + SafeStreets · Safety"
        title="Help gets ranked, not just logged."
        lede="Two community layers: a station incident triage grid for the mock control room, and a street hazard map for the walk to and from the station."
        aside={
          <Segmented
            label="Safety view"
            value={tab}
            onChange={setTab}
            options={[
              { value: "rescue", label: "Station rescue grid" },
              { value: "streets", label: "Street hazards" },
            ]}
          />
        }
      />
      {tab === "rescue" ? <RescueGrid /> : <SafeStreets />}
    </div>
  );
}
