"use client";

import Link from "next/link";
import { LINE_COLORS, LINES, STATIONS } from "@/lib/data";
import { BAND_META, bandOf } from "@/lib/crowd";
import type { RoutePlan } from "@/lib/types";

// Hand-drawn schematic of the Pune Metro network (line-diagram style, not
// geographic). Coordinates live in data/pune-metro.json (mapX/mapY).

const W = 1000;
const H = 620;

const LABEL_OFFSET: Record<string, { dx: number; dy: number; anchor: "start" | "middle" | "end" }> = {
  n: { dx: 0, dy: -11, anchor: "middle" },
  s: { dx: 0, dy: 17, anchor: "middle" },
  e: { dx: 10, dy: 3.5, anchor: "start" },
  w: { dx: -10, dy: 3.5, anchor: "end" },
  ne: { dx: 7, dy: -7, anchor: "start" },
  nw: { dx: -7, dy: -7, anchor: "end" },
  se: { dx: 7, dy: 11, anchor: "start" },
  sw: { dx: -7, dy: 11, anchor: "end" },
};

function polyline(ids: string[], pos: Record<string, { x: number; y: number }>): string {
  return ids.map((id) => `${pos[id].x},${pos[id].y}`).join(" ");
}

export interface MetroMapProps {
  crowd?: Record<string, number>;
  highlight?: RoutePlan | null;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  delayedLines?: string[];
  className?: string;
}

export default function MetroMap({
  crowd,
  highlight,
  selectedId,
  onSelect,
  delayedLines = [],
  className = "",
}: MetroMapProps) {
  const pos: Record<string, { x: number; y: number }> = {};
  for (const s of STATIONS) pos[s.id] = { x: s.mapX, y: s.mapY };

  const highlightIds = highlight?.stationIds ?? null;

  return (
    <div className={`relative overflow-hidden rounded-card border border-line bg-[#0b0f14] dotted-bg ${className}`}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Schematic map of the Pune Metro network: Aqua Line Vanaz to Ramwadi, Purple Line PCMC Bhavan to Swargate, interchange at District Court."
      >
        {/* river, decorative */}
        <path
          d="M -10,368 C 150,336 320,362 460,398 C 560,422 720,384 1010,312"
          fill="none"
          stroke="#131b25"
          strokeWidth={16}
          strokeLinecap="round"
        />
        <text x={30} y={352} className="font-mono" fontSize={9} fill="#2c3947" letterSpacing="2">
          MULA–MUTHA (SCHEMATIC)
        </text>

        {/* line traces */}
        {LINES.map((l) => {
          const delayed = delayedLines.includes(l.id);
          return (
            <g key={l.id}>
              <polyline
                points={polyline(l.stationIds, pos)}
                fill="none"
                stroke={l.color}
                strokeWidth={4.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={0.92}
              />
              {delayed && (
                <polyline
                  points={polyline(l.stationIds, pos)}
                  fill="none"
                  stroke="var(--danger)"
                  strokeWidth={4.5}
                  strokeLinejoin="round"
                  strokeDasharray="3 9"
                  className="animate-dash-flow"
                  opacity={0.85}
                />
              )}
            </g>
          );
        })}

        {/* highlighted route */}
        {highlight && highlightIds && (
          <>
            <polyline
              points={polyline(highlightIds, pos)}
              fill="none"
              stroke="#eef3f7"
              strokeWidth={2}
              strokeDasharray="6 8"
              className="animate-dash-flow"
              strokeLinejoin="round"
            />
            <circle cx={pos[highlightIds[0]].x} cy={pos[highlightIds[0]].y} r={8} fill="none" stroke="#eef3f7" strokeWidth={2} />
            <circle
              cx={pos[highlightIds[highlightIds.length - 1]].x}
              cy={pos[highlightIds[highlightIds.length - 1]].y}
              r={8}
              fill="none"
              stroke="#eef3f7"
              strokeWidth={2}
            />
          </>
        )}

        {/* stations */}
        {STATIONS.map((s) => {
          const lbl = LABEL_OFFSET[s.labelPos] ?? LABEL_OFFSET.s;
          const score = crowd?.[s.id];
          const band = score !== undefined ? bandOf(score) : null;
          const isSelected = selectedId === s.id;
          const isStart = highlightIds?.[0] === s.id;
          const isEnd = highlightIds?.[highlightIds.length - 1] === s.id;
          const stationColor =
            s.lines.length > 1 ? "#eef3f7" : LINE_COLORS[s.lines[0]];

          const inner = (
            <>
              {band && <circle cx={s.mapX} cy={s.mapY} r={13} fill={BAND_META[band].bg} />}
              <circle
                cx={s.mapX}
                cy={s.mapY}
                r={s.interchange ? 6.5 : 4.5}
                fill="#0b0f14"
                stroke={stationColor}
                strokeWidth={s.interchange ? 3 : 2.4}
              />
              {s.interchange && (
                <circle cx={s.mapX} cy={s.mapY} r={10.5} fill="none" stroke="#eef3f7" strokeWidth={1} opacity={0.75} />
              )}
              {(isSelected || isStart || isEnd) && (
                <circle cx={s.mapX} cy={s.mapY} r={14} fill="none" stroke="#eef3f7" strokeWidth={1.6} />
              )}
              <text
                x={s.mapX + lbl.dx}
                y={s.mapY + lbl.dy}
                textAnchor={lbl.anchor}
                fontSize={s.interchange ? 11.5 : 10}
                className="font-mono"
                fill={s.interchange ? "#cdd6df" : "#8b95a2"}
                style={{ paintOrder: "stroke", stroke: "#0b0f14", strokeWidth: 3 }}
              >
                {s.name}
              </text>
            </>
          );

          return onSelect ? (
            <g
              key={s.id}
              onClick={() => onSelect(s.id)}
              tabIndex={0}
              role="button"
              aria-label={`Station ${s.name}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelect(s.id);
              }}
              className="cursor-pointer"
              style={{ transition: "opacity 150ms" }}
            >
              <circle cx={s.mapX} cy={s.mapY} r={16} fill="transparent" />
              {inner}
            </g>
          ) : (
            <Link key={s.id} href={`/station/${s.id}`} aria-label={`Station page: ${s.name}`}>
              <g className="cursor-pointer">
                <circle cx={s.mapX} cy={s.mapY} r={16} fill="transparent" />
                {inner}
              </g>
            </Link>
          );
        })}

        {/* legend */}
        <g transform="translate(24, 560)">
          <rect x={0} y={0} width={330} height={44} rx={8} fill="#10151b" stroke="#232c37" />
          <circle cx={18} cy={16} r={4.5} fill="#0b0f14" stroke={LINE_COLORS.aqua} strokeWidth={2.4} />
          <text x={30} y={20} fontSize={10} className="font-mono" fill="#8b95a2">
            Aqua — Vanaz ↔ Ramwadi
          </text>
          <circle cx={18} cy={33} r={4.5} fill="#0b0f14" stroke={LINE_COLORS.purple} strokeWidth={2.4} />
          <text x={30} y={37} fontSize={10} className="font-mono" fill="#8b95a2">
            Purple — PCMC ↔ Swargate
          </text>
          <circle cx={216} cy={16} r={6.5} fill="#0b0f14" stroke="#eef3f7" strokeWidth={3} />
          <circle cx={216} cy={16} r={10.5} fill="none" stroke="#eef3f7" strokeWidth={1} opacity={0.75} />
          <text x={234} y={20} fontSize={10} className="font-mono" fill="#8b95a2">
            Interchange
          </text>
          <text x={216} y={37} fontSize={10} className="font-mono" fill="#8b95a2">
            halo = live crowding
          </text>
        </g>
      </svg>
    </div>
  );
}
