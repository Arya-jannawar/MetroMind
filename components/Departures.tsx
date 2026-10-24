"use client";

import { PARAMS, LINES, station } from "@/lib/data";
import { minToHHMM } from "@/lib/time";

// Demo timetable: uniform headway from service open to close. Clearly
// labelled as an assumption — no official timetable is claimed.

export default function Departures({ stationId, nowMin }: { stationId: string; nowMin: number }) {
  const st = station(stationId);
  const { headwayMin, firstTrainMin, lastTrainMin } = PARAMS;

  const rows = LINES.filter((l) => l.stationIds.includes(stationId)).flatMap((l) => {
    const idx = l.stationIds.indexOf(stationId);
    const atTerminus = idx === 0 || idx === l.stationIds.length - 1;
    const dirs = atTerminus
      ? [idx === 0 ? { to: l.stationIds[l.stationIds.length - 1], label: "toward " + l.stationIds[l.stationIds.length - 1] } : { to: l.stationIds[0], label: "toward " + l.stationIds[0] }]
      : [
          { to: l.stationIds[l.stationIds.length - 1], label: "toward " + l.stationIds[l.stationIds.length - 1] },
          { to: l.stationIds[0], label: "toward " + l.stationIds[0] },
        ];
    return dirs.map((d) => {
      const k = Math.max(0, Math.ceil((nowMin - firstTrainMin) / headwayMin));
      const times = [0, 1, 2]
        .map((j) => firstTrainMin + (k + j) * headwayMin)
        .filter((t) => t <= lastTrainMin);
      return { line: l, dir: d.label, times, color: l.color };
    });
  });

  return (
    <div>
      <table className="w-full text-[13px]">
        <caption className="sr-only">Next departures (demo timetable)</caption>
        <tbody className="divide-y divide-line-soft">
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="py-2 pr-2">
                <span className="inline-flex items-center gap-2">
                  <span className="dot" style={{ background: r.color }} />
                  <span className="text-dim">{r.dir}</span>
                </span>
              </td>
              <td className="py-2 text-right">
                <span className="num text-ink">
                  {r.times.length > 0
                    ? r.times.map((t) => minToHHMM(t)).join("   ·   ")
                    : "service ended for the day"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 font-mono text-[10px] leading-relaxed text-muted">
        DEMO TIMETABLE — uniform {headwayMin} min headway assumed, service {minToHHMM(firstTrainMin)}–
        {minToHHMM(lastTrainMin)}. Verify against official Maha-Metro timings.
      </p>
    </div>
  );
}
