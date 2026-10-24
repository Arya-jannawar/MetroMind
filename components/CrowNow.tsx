"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CrowdBadge } from "./Badges";
import { confidenceOf, crowdAt, freshnessLine } from "@/lib/crowd";
import { useCrowdStore } from "@/store/crowd";
import { useLiveStore, nowMinOf } from "@/store/live";

/** "How crowded is this platform right now" island for station pages. */
export default function CrowNow({ stationId }: { stationId: string }) {
  const simNow = useLiveStore((s) => s.simNow);
  const nowMin = nowMinOf(simNow);
  const reports = useCrowdStore((s) => s.reports);
  const spikes = useLiveStore((s) => s.spikes);

  const score = crowdAt(stationId, nowMin, Date.now(), reports, spikes);

  return (
    <div className="card flex flex-col p-4">
      <p className="kicker mb-2">Crowding right now</p>
      <div className="mb-3 flex items-center justify-between gap-3">
        <CrowdBadge score={score} />
        <span className="num text-[11px] text-muted">{Math.round(score)}/100</span>
      </div>
      <p className="num text-[11.5px] text-dim">{freshnessLine(reports, stationId, Date.now())}</p>
      <p className="num mt-0.5 text-[11.5px] text-muted">
        confidence {Math.round(confidenceOf(reports, stationId, Date.now()) * 100)}%
      </p>
      <Link href="/crowd" className="btn-ghost mt-auto pt-3 text-[12.5px]">
        report what you see <ArrowRight size={13} />
      </Link>
    </div>
  );
}
