"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import Heatmap from "@/components/Heatmap";
import MetroMap from "@/components/MetroMap";
import { CrowdBadge } from "@/components/Badges";
import { DemoNote, PageHeader, Segmented } from "@/components/ui";
import { bandOf, blendScore, confidenceOf, freshnessLine, BAND_META } from "@/lib/crowd";
import { LINES, allStationIds, station, stationName } from "@/lib/data";
import { useCrowdStore } from "@/store/crowd";
import { useLiveStore, nowMinOf } from "@/store/live";
import type { CrowdLevel } from "@/lib/types";

type Filter = "mine" | "aqua" | "purple";

const MY_STATIONS = [
  "vanaz",
  "deccan-gymkhana",
  "pmc-bhavan",
  "district-court",
  "shivaji-nagar",
  "pune-railway-station",
  "kalyani-nagar",
  "ramwadi",
  "pcmc-bhavan",
  "swargate",
];

const REPORT_LEVELS: { level: CrowdLevel; label: string; hint: string }[] = [
  { level: "empty", label: "Empty", hint: "seats available" },
  { level: "moderate", label: "Moderate", hint: "standing room" },
  { level: "packed", label: "Packed", hint: "wait for the next one" },
];

export default function CrowdPage() {
  const simNow = useLiveStore((s) => s.simNow);
  const nowMin = nowMinOf(simNow);
  const reports = useCrowdStore((s) => s.reports);
  const addReport = useCrowdStore((s) => s.addReport);
  const spikes = useLiveStore((s) => s.spikes);

  const [filter, setFilter] = useState<Filter>("mine");
  const [selected, setSelected] = useState<string | null>("district-court");
  const [flash, setFlash] = useState<string | null>(null);

  const rows = useMemo(() => {
    if (filter === "mine") return MY_STATIONS;
    return LINES.find((l) => l.id === filter)!.stationIds;
  }, [filter]);

  const crowdMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const id of allStationIds()) {
      map[id] = blendScore(station(id).crowdProfile, id, nowMin, reports, Date.now(), 0);
    }
    return map;
  }, [nowMin, reports]);

  const selScore = selected ? crowdMap[selected] ?? 0 : 0;

  function report(level: CrowdLevel) {
    if (!selected) return;
    addReport(selected, level, Date.now());
    setFlash(
      `${level} reported at ${stationName(selected)} — heatmap and Copilot badges updated across the app.`,
    );
    setTimeout(() => setFlash(null), 4200);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        kicker="M2 · CrowdCast"
        title="How crowded is the platform right now?"
        lede="Anonymous one-tap reports blend with a time-of-day model. Reports decay with a 15-minute half-life, so stale input fades and fresh observations lead."
      />

      <div className="grid min-w-0 gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <div className="card mb-5 min-w-0 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <Segmented
                label="Station filter"
                value={filter}
                onChange={setFilter}
                options={[
                  { value: "mine", label: "My stations" },
                  { value: "aqua", label: "Aqua line" },
                  { value: "purple", label: "Purple line" },
                ]}
              />
              <span className="num text-[11px] text-muted">
                15-min bands · now ± 45 min · {reports.length} reports stored
              </span>
            </div>
            <Heatmap
              rows={rows}
              nowMin={nowMin}
              nowMs={Date.now()}
              reports={reports}
              spikes={spikes}
              onSelectStation={setSelected}
              selectedStation={selected}
            />
          </div>

          <div className="card p-4">
            <p className="kicker mb-2">Report what you see — anonymous, no account</p>
            <p className="mb-3 text-[13px] text-dim">
              Reporting for{" "}
              <select
                className="field !inline-block !w-auto !px-2 !py-1 num text-[12px]"
                value={selected ?? ""}
                onChange={(e) => setSelected(e.target.value)}
                aria-label="Station to report for"
              >
                {allStationIds().map((id) => (
                  <option key={id} value={id}>
                    {stationName(id)}
                  </option>
                ))}
              </select>
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              {REPORT_LEVELS.map((r) => {
                const meta = BAND_META[bandOf(r.level === "empty" ? 14 : r.level === "moderate" ? 55 : 90)];
                return (
                  <button
                    key={r.level}
                    onClick={() => report(r.level)}
                    className="rounded-card border px-3 py-4 text-center transition-transform hover:scale-[1.02]"
                    style={{ borderColor: `${meta.color}44`, background: meta.bg }}
                  >
                    <span className="block text-[14px] font-semibold" style={{ color: meta.color }}>
                      {r.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted">{r.hint}</span>
                  </button>
                );
              })}
            </div>
            {flash && (
              <p className="anim-rise mt-3 rounded-md border border-ok/30 bg-ok/[0.08] px-3 py-2 text-[12.5px] text-ok">
                {flash}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-4">
            <p className="kicker mb-2">Selected station</p>
            {selected ? (
              <>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-[15px] font-semibold text-ink">{stationName(selected)}</h3>
                  <CrowdBadge score={selScore} />
                </div>
                <dl className="space-y-1.5 text-[12.5px]">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">freshness</dt>
                    <dd className="num text-right text-dim">
                      {freshnessLine(reports, selected, Date.now())}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">confidence</dt>
                    <dd className="num text-dim">
                      {Math.round(confidenceOf(reports, selected, Date.now()) * 100)}%
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">score now</dt>
                    <dd className="num text-dim">{Math.round(selScore)}/100</dd>
                  </div>
                </dl>
                <Link href="/copilot" className="btn-ghost mt-3 w-full text-[12.5px]">
                  see it change route advice <ArrowRight size={13} />
                </Link>
              </>
            ) : (
              <p className="text-[13px] text-muted">Tap a station on the heatmap or the map.</p>
            )}
          </div>

          <div>
            <p className="kicker mb-2">Network halos</p>
            <MetroMap crowd={crowdMap} selectedId={selected} onSelect={setSelected} />
          </div>

          <DemoNote>
            DEMO DATA — seeded sample reports are labelled in the activity feed; user reports are
            stored only in this browser. Never presented as a real Maha-Metro feed.
          </DemoNote>
        </div>
      </div>
    </div>
  );
}
