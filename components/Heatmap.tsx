"use client";

import { useMemo, useState } from "react";
import { BAND_META, bandOf, blendScore, confidenceOf, freshnessLine } from "@/lib/crowd";
import { station, stationName } from "@/lib/data";
import { minToHHMM } from "@/lib/time";
import type { CrowdReport, CrowdSpike } from "@/lib/types";

const BANDS = 8; // 15-min bands: -45 min ... +75 min around sim-now
const BAND_STEP = 15;

export default function Heatmap({
  rows,
  nowMin,
  nowMs,
  reports,
  spikes,
  onSelectStation,
  selectedStation,
}: {
  rows: string[];
  nowMin: number;
  nowMs: number;
  reports: CrowdReport[];
  spikes: CrowdSpike[];
  onSelectStation?: (id: string) => void;
  selectedStation?: string | null;
}) {
  const [cell, setCell] = useState<{ stationId: string; bandIdx: number } | null>(null);

  const grid = useMemo(() => {
    return rows.map((stationId) => {
      const profile = station(stationId).crowdProfile;
      return {
        stationId,
        cells: Array.from({ length: BANDS }, (_, i) => {
          const bandStart = nowMin + (i - 3) * BAND_STEP;
          const bandNowMs = nowMs + (i - 3) * BAND_STEP * 60000;
          const spikeBoost = spikes
            .filter((s) => s.stationId === stationId && s.until > bandNowMs)
            .reduce((acc, s) => acc + s.boost, 0);
          return {
            bandStart,
            score: blendScore(profile, stationId, bandStart, reports, bandNowMs, spikeBoost),
          };
        }),
      };
    });
  }, [rows, nowMin, nowMs, reports, spikes]);

  const detail = (() => {
    if (!cell) return null;
    const row = grid.find((r) => r.stationId === cell.stationId);
    const c = row?.cells[cell.bandIdx];
    if (!c) return null;
    const band = BAND_META[bandOf(c.score)];
    return (
      <p className="num text-[11.5px] text-dim">
        {stationName(cell.stationId)} @ {minToHHMM(c.bandStart)} ·{" "}
        <span style={{ color: band.color }}>{band.label.toLowerCase()}</span> (score{" "}
        {Math.round(c.score)}) · {freshnessLine(reports, cell.stationId, nowMs)} · confidence{" "}
        {Math.round(confidenceOf(reports, cell.stationId, nowMs) * 100)}%
      </p>
    );
  })();

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-separate border-spacing-[3px]">
          <caption className="sr-only">Crowding by station and 15-minute time band</caption>
          <thead>
            <tr>
              <th className="kicker w-[130px] pb-1 text-left font-normal">Station</th>
              {Array.from({ length: BANDS }, (_, i) => {
                const t = nowMin + (i - 3) * BAND_STEP;
                const isNow = i === 3;
                return (
                  <th key={i} className="pb-1">
                    <span
                      className={`num text-[9.5px] ${isNow ? "rounded bg-aqua/15 px-1 py-0.5 text-aqua" : "text-muted"}`}
                    >
                      {minToHHMM(t)}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {grid.map((row) => (
              <tr key={row.stationId}>
                <td className="pr-2 text-right">
                  <button
                    onClick={() => onSelectStation?.(row.stationId)}
                    className={`text-[12px] transition-colors hover:text-aqua ${
                      selectedStation === row.stationId ? "text-aqua" : "text-dim"
                    }`}
                  >
                    {stationName(row.stationId)}
                  </button>
                </td>
                {row.cells.map((c, i) => {
                  const band = bandOf(c.score);
                  const meta = BAND_META[band];
                  const isSel = cell?.stationId === row.stationId && cell?.bandIdx === i;
                  return (
                    <td key={i}>
                      <button
                        onClick={() => setCell({ stationId: row.stationId, bandIdx: i })}
                        aria-label={`${stationName(row.stationId)} at ${minToHHMM(c.bandStart)}: ${meta.label}`}
                        className={`h-7 w-full min-w-[34px] rounded-[4px] transition-transform ${
                          isSel ? "ring-1 ring-ink" : "hover:scale-[1.06]"
                        }`}
                        style={{ background: meta.bg, border: `1px solid ${meta.color}22` }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {(Object.keys(BAND_META) as (keyof typeof BAND_META)[]).map((b) => (
            <span
              key={b}
              className="inline-flex items-center gap-1.5 font-mono text-[10px] text-muted"
            >
              <span
                className="h-2.5 w-2.5 rounded-[3px]"
                style={{
                  background: BAND_META[b].bg,
                  border: `1px solid ${BAND_META[b].color}44`,
                }}
              />
              {BAND_META[b].label}
            </span>
          ))}
        </div>
        {detail}
      </div>
    </div>
  );
}
