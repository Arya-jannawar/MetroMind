"use client";

import Link from "next/link";
import { Compass, HandHeart, MapPin, Route, Sparkles } from "lucide-react";
import ActivityFeed from "@/components/ActivityFeed";
import MetroMap from "@/components/MetroMap";
import StatusStrip from "@/components/StatusStrip";
import { Section } from "@/components/ui";
import ClientOnly from "@/components/ClientOnly";
import { blendScore } from "@/lib/crowd";
import { META, PARAMS, allStationIds, station } from "@/lib/data";
import { greetingFor, minToHHMM } from "@/lib/time";
import { useCrowdStore } from "@/store/crowd";
import { useLiveStore, nowMinOf } from "@/store/live";
import { usePrefsStore } from "@/store/prefs";

const QUICK_ACTIONS = [
  {
    href: "/copilot?from=ramwadi&to=deccan-gymkhana&arrive=09:30&budget=50&crowds=1",
    icon: Route,
    label: "Plan a trip",
    detail: "constraints + why it works",
  },
  { href: "/crowd", icon: Compass, label: "CrowdCast", detail: "how busy is my station" },
  { href: "/safety", icon: HandHeart, label: "Report something", detail: "station or street" },
  { href: "/guide", icon: MapPin, label: "First-time rider", detail: "5 steps · EN/हिं/मर" },
];

function HomeInner() {
  const simNow = useLiveStore((s) => s.simNow);
  const nowMin = nowMinOf(simNow);
  const reports = useCrowdStore((s) => s.reports);
  const spikes = useLiveStore((s) => s.spikes);
  const recentTrips = usePrefsStore((s) => s.recentTrips);

  const crowdMap: Record<string, number> = {};
  for (const id of allStationIds()) {
    const st = station(id);
    const boost = spikes
      .filter((s) => s.stationId === id && s.until > Date.now())
      .reduce((a, s) => a + s.boost, 0);
    crowdMap[id] = blendScore(st.crowdProfile, id, nowMin, reports, Date.now(), boost);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker mb-1.5">Mission control · {minToHHMM(nowMin)} IST (simulated)</p>
          <h1 className="text-2xl font-semibold tracking-tight text-ink lg:text-[30px]">
            {greetingFor(nowMin)}. The network is yours.
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-dim">
            One copilot for the Pune Metro — constraint-aware routes, community crowd intelligence,
            safety triage and plain-language reasoning for every recommendation.
          </p>
        </div>
        <div className="hidden lg:block">
          <StatusStrip />
        </div>
      </div>

      {/* quick actions */}
      <div className="mb-6 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {QUICK_ACTIONS.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="card group flex items-start gap-3 p-3.5 transition-colors hover:border-aqua/40"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-aqua/10 text-aqua">
              <a.icon size={16} />
            </span>
            <span>
              <span className="block text-[13.5px] font-medium text-ink">{a.label}</span>
              <span className="block text-[11.5px] text-muted">{a.detail}</span>
            </span>
          </Link>
        ))}
      </div>

      {/* map */}
      <div className="mb-6">
        <Section
          kicker="Network · schematic"
          title="Live network"
          aside={
            <span className="chip">
              <Sparkles size={11} className="text-warn" />
              tap any station for its guide
            </span>
          }
        >
          <ClientOnly>
            <MetroMap crowd={crowdMap} />
          </ClientOnly>
        </Section>
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <Section kicker="Community signal" title="Recent activity" className="min-w-0">
          <div className="card min-w-0 overflow-hidden px-4 py-1.5">
            <ClientOnly fallback={<div className="h-40" />}>
              <ActivityFeed />
            </ClientOnly>
          </div>
        </Section>

        <div className="min-w-0 space-y-6">
          {recentTrips.length > 0 && (
            <Section kicker="Saved in this browser" title="Recent trips">
              <div className="card divide-y divide-line-soft px-4">
                {recentTrips.map((t) => (
                  <Link
                    key={t.id}
                    href={`/copilot?from=${t.fromId}&to=${t.toId}`}
                    className="flex items-center justify-between py-2.5 text-[13px] text-dim hover:text-ink"
                  >
                    <span>
                      {station(t.fromId).name} → {station(t.toId).name}
                    </span>
                    <span className="num text-[11.5px] text-muted">
                      arr {minToHHMM(t.arriveMin)} · ₹{t.fare}
                    </span>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          <Section kicker="How the reasoning works" title="Why it recommends what it does">
            <div className="card space-y-2.5 p-4 text-[13px] leading-relaxed text-dim">
              <p>
                Routes are searched over the metro graph with three goals at once — time, crowd
                exposure and line changes. Each card states its goal, its trade-off, and the crowd
                it expects at your boarding time.
              </p>
              <p>
                Crowd levels blend a time-of-day model with anonymous one-tap reports (15-minute
                half-life). Fares are estimated at ₹{PARAMS.baseFare} + ₹{PARAMS.perStationFare}
                /stop, capped at ₹{PARAMS.fareCap}.
              </p>
              <p className="font-mono text-[10.5px] text-muted">
                {META.label}
              </p>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <ClientOnly fallback={<div className="h-screen" />}>
      <HomeInner />
    </ClientOnly>
  );
}
