"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Wand2, Zap } from "lucide-react";
import MetroMap from "@/components/MetroMap";
import RouteCard from "@/components/RouteCard";
import { PageHeader, DemoNote, EmptyState } from "@/components/ui";
import { crowdAt } from "@/lib/crowd";
import { planRoutes } from "@/lib/routing";
import { explainPlan, explainChange } from "@/lib/explain";
import { STATIONS, station } from "@/lib/data";
import { hhmmToMin } from "@/lib/time";
import { useCrowdStore } from "@/store/crowd";
import { useLiveStore, nowMinOf } from "@/store/live";
import { usePrefsStore } from "@/store/prefs";
import type { RoutePlan, Strategy } from "@/lib/types";

const SORTED = [...STATIONS].sort((a, b) => a.name.localeCompare(b.name));

function StationSelect({
  value,
  onChange,
  label,
  exclude,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  exclude?: string;
}) {
  return (
    <label className="block">
      <span className="kicker mb-1.5 block">{label}</span>
      <select className="field" value={value} onChange={(e) => onChange(e.target.value)}>
        {SORTED.filter((s) => s.id !== exclude).map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
            {s.lines.length > 1 ? " · both lines" : ` · ${s.lines[0]} line`}
          </option>
        ))}
      </select>
    </label>
  );
}

interface AiWhy {
  why: string;
  source: "ai" | "template";
}

const strategyWord = (s: Strategy) =>
  s === "fastest" ? "fastest" : s === "calm" ? "calm" : "just-in-time";

function CopilotInner() {
  const params = useSearchParams();
  const simNow = useLiveStore((s) => s.simNow);
  const nowMin = nowMinOf(simNow);
  const disruptions = useLiveStore((s) => s.disruptions);
  const spikes = useLiveStore((s) => s.spikes);
  const aiOffline = useLiveStore((s) => s.aiOffline);
  const setPreset = useLiveStore((s) => s.setPreset);
  const reports = useCrowdStore((s) => s.reports);
  const accessibleOnly = usePrefsStore((s) => s.accessibleOnly);
  const setAccessibleOnly = usePrefsStore((s) => s.setAccessibleOnly);

  const [from, setFrom] = useState("ramwadi");
  const [to, setTo] = useState("deccan-gymkhana");
  const [arrive, setArrive] = useState("09:00");
  const [budget, setBudget] = useState("50");
  const [avoidCrowds, setAvoidCrowds] = useState(true);
  const [whys, setWhys] = useState<Record<string, AiWhy>>({});
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [rerouteNote, setRerouteNote] = useState("");
  const prevTop = useRef<RoutePlan | null>(null);

  useEffect(() => {
    const f = params.get("from");
    const t = params.get("to");
    const a = params.get("arrive");
    const b = params.get("budget");
    const c = params.get("crowds");
    if (f && STATIONS.some((s) => s.id === f)) setFrom(f);
    if (t && STATIONS.some((s) => s.id === t)) setTo(t);
    if (a) {
      setArrive(a);
      // a deadline that has already passed on the simulated clock is useless —
      // jump the demo clock to the morning peak so the query is answerable
      if (hhmmToMin(a) < nowMin + 15) setPreset("morning-peak");
    }
    if (b) setBudget(b);
    if (c) setAvoidCrowds(c === "1");
  }, [params, nowMin, setPreset]);

  const constraints = useMemo(
    () => ({
      nowMin,
      nowMs: Date.now(), // report ages always run on the real wall clock
      arriveByMin: hhmmToMin(arrive),
      budget: budget ? Number(budget) : undefined,
      avoidCrowds,
      accessible: accessibleOnly,
    }),
    [nowMin, arrive, budget, avoidCrowds, accessibleOnly],
  );

  const { plans, rejected } = useMemo(
    () => planRoutes(from, to, constraints, { reports, spikes, disruptions }),
    [from, to, constraints, reports, spikes, disruptions],
  );

  const selected = plans[selectedIdx] ?? plans[0] ?? null;

  // live-reroute detection: react only to disruption changes, never to the
  // simulated clock drifting (plans recompute every minute otherwise)
  const plansRef = useRef<RoutePlan[]>([]);
  useEffect(() => {
    plansRef.current = plans;
  }, [plans]);
  useEffect(() => {
    const top = plansRef.current[0];
    const injected = disruptions[0]?.lineId ?? null;
    if (!top || !injected) {
      if (disruptions.length === 0) setRerouteNote("");
      prevTop.current = top ?? null;
      return;
    }
    if (prevTop.current) {
      setRerouteNote(explainChange(prevTop.current, top, injected));
    }
    prevTop.current = top;
  }, [disruptions]);

  // template explanations render instantly…
  useEffect(() => {
    setWhys(() => {
      const next: Record<string, AiWhy> = {};
      for (const p of [...plans, ...rejected]) {
        next[p.id] = { why: explainPlan(p, to), source: "template" };
      }
      return next;
    });
  }, [plans, rejected, to]);

  // …then the GLM upgrade replaces them when the key is configured
  const aiSig = useRef("");
  useEffect(() => {
    if (plans.length === 0 || aiOffline) return;
    const sig = plans.map((p) => p.signature).join("|");
    if (sig === aiSig.current) return;
    aiSig.current = sig;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    fetch("/api/copilot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        origin: station(from).name,
        destination: station(to).name,
        arriveBy: arrive,
        budget: budget ? Number(budget) : null,
        avoidCrowds,
        plans: plans.map((p) => ({
          id: p.id,
          strategy: p.strategy,
          totalMin: p.totalMin,
          fare: p.fare,
          transfers: p.transfers,
          departMin: p.departMin,
          arriveMin: p.arriveMin,
          peakCrowd: p.peakCrowd,
        })),
      }),
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { source: "ai" | "template"; plans: Record<string, { why: string }> }) => {
        setWhys((cur) => {
          const merged = { ...cur };
          for (const [id, w] of Object.entries(data.plans ?? {})) {
            if (merged[id] && w?.why) merged[id] = { why: w.why, source: data.source };
          }
          return merged;
        });
      })
      .catch(() => {
        /* offline AI mode is the designed fallback — template stays */
      })
      .finally(() => clearTimeout(timer));
  }, [plans, aiOffline, from, to, arrive, budget, avoidCrowds]);

  const delayedLines = disruptions.map((d) => d.lineId);

  const crowdMap: Record<string, number> = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of STATIONS) {
      map[s.id] = crowdAt(s.id, nowMin, Date.now(), reports, spikes);
    }
    return map;
  }, [nowMin, reports, spikes]);

  function loadKiller() {
    setFrom("ramwadi");
    setTo("deccan-gymkhana");
    // 09:30 gives the 08:30 demo clock ~60 min of feasible runway (a 10-stop
    // ride is ~36 min); 09:00 is already unreachable the moment the demo starts
    setArrive("09:30");
    setBudget("50");
    setAvoidCrowds(true);
    setRerouteNote("");
    // the canonical killer query is a morning-peak question — move the demo
    // clock there so the answer is live regardless of when the demo runs
    setPreset("morning-peak");
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        kicker="M1 · Commute copilot"
        title="State the goal. Read the reasoning."
        lede="Routes are computed on-device from the demo network graph, then explained: what each one optimises, what it costs, where it gets crowded."
        aside={
          <button onClick={loadKiller} className="btn-grape h-9 text-[13px]">
            <Wand2 size={14} /> run the killer query
          </button>
        }
      />

      <div className="card mb-5 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StationSelect label="From" value={from} onChange={setFrom} exclude={to} />
          <StationSelect label="To" value={to} onChange={setTo} exclude={from} />
          <label className="block">
            <span className="kicker mb-1.5 block">Arrive by</span>
            <input
              type="time"
              className="field num"
              value={arrive}
              onChange={(e) => setArrive(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="kicker mb-1.5 block">Budget ₹</span>
            <input
              type="number"
              min={10}
              max={200}
              step={5}
              className="field num"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="50"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setAvoidCrowds((v) => !v)}
            aria-pressed={avoidCrowds}
            className={avoidCrowds ? "chip-on" : "chip"}
          >
            avoid crowds
          </button>
          <button
            onClick={() => setAccessibleOnly(!accessibleOnly)}
            aria-pressed={accessibleOnly}
            className={accessibleOnly ? "chip-on" : "chip"}
          >
            prefer step-free
          </button>
          <span className="ml-auto num text-[11px] text-muted">
            planning from simulated clock · demo network
          </span>
        </div>
      </div>

      {rerouteNote && (
        <div className="anim-rise mb-4 flex items-start gap-2.5 rounded-card border border-warn/40 bg-warn/[0.07] px-4 py-3">
          <Zap size={15} className="mt-0.5 shrink-0 text-warn" />
          <p className="text-[13px] leading-relaxed text-dim">
            <span className="mr-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-warn">
              Updated
            </span>
            {rerouteNote}
          </p>
        </div>
      )}

      {from === to ? (
        <EmptyState
          title="Pick two different stations"
          body="Origin and destination are the same — choose a destination to see route cards."
        />
      ) : plans.length === 0 && rejected.length > 0 && disruptions.length > 0 ? (
        <>
          <div className="anim-rise mb-4 flex items-start gap-2.5 rounded-card border border-danger/40 bg-danger/[0.06] px-4 py-3">
            <Zap size={15} className="mt-0.5 shrink-0 text-danger" />
            <p className="text-[13px] leading-relaxed text-dim">
              <span className="mr-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-danger">
                Deadline broken
              </span>
              The live delay on the {disruptions.map((d) => d.lineId).join(" & ")} line pushes every
              option past your {arrive} deadline — earliest arrival is now{" "}
              <span className="num text-ink">{String(Math.floor((rejected[0]?.arriveMin ?? 0) / 60)).padStart(2, "0")}:{String((rejected[0]?.arriveMin ?? 0) % 60).padStart(2, "0")}</span>.
              The engine won&apos;t pretend otherwise. Push the deadline later and it re-plans
              instantly.
            </p>
          </div>
          {rejected.map((p) => (
            <div key={p.id} className="mb-3.5">
              <RouteCard
                plan={p}
                destId={to}
                why={whys[p.id]?.why ?? ""}
                aiSource={whys[p.id]?.source}
                dimmed
                dimReason={p.fare > (constraints.budget ?? Infinity) ? "over budget" : "misses deadline"}
              />
            </div>
          ))}
        </>
      ) : plans.length === 0 ? (
        <EmptyState
          title="No plan fits those constraints"
          body="Try relaxing the budget or the arrival time. The rejected alternatives below show the closest options and why they missed."
        />
      ) : (
        <div className="grid min-w-0 gap-6 lg:grid-cols-[1fr_380px]">
          <div className="min-w-0 space-y-3.5">
            {plans.map((p, i) => (
              <div key={p.id} onClick={() => setSelectedIdx(i)}>
                <RouteCard
                  plan={p}
                  destId={to}
                  why={whys[p.id]?.why ?? ""}
                  aiSource={whys[p.id]?.source}
                />
              </div>
            ))}
            {rejected.map((p) => (
              <RouteCard
                key={p.id}
                plan={p}
                destId={to}
                why={whys[p.id]?.why ?? ""}
                aiSource={whys[p.id]?.source}
                dimmed
                dimReason={p.fare > (constraints.budget ?? Infinity) ? "over budget" : "late arrival"}
              />
            ))}
            <DemoNote>
              Engine: Dijkstra over (station·line) states · three strategies (time / crowds / fewest
              changes) · fare ₹10 + ₹2/stop capped ₹35 (ESTIMATE) · 10-min headway (DEMO ASSUMPTION).
            </DemoNote>
          </div>
          <div className="min-w-0 lg:sticky lg:top-6 lg:self-start">
            <p className="kicker mb-2">Selected route on the network</p>
            <MetroMap highlight={selected} delayedLines={delayedLines} className="mb-4" />
            <div className="card p-4">
              <p className="kicker mb-2">Trade-off compare</p>
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="kicker border-b border-line-soft text-left font-normal">
                    <th className="pb-1.5">plan</th>
                    <th className="pb-1.5 text-right">time</th>
                    <th className="pb-1.5 text-right">fare</th>
                    <th className="pb-1.5 text-right">changes</th>
                    <th className="pb-1.5 text-right">crowd</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {plans.map((p, i) => (
                    <tr key={p.id} className={i === selectedIdx ? "text-ink" : "text-dim"}>
                      <td className="py-1.5">{strategyWord(p.strategy)}</td>
                      <td className="num py-1.5 text-right">{Math.round(p.totalMin)}′</td>
                      <td className="num py-1.5 text-right">₹{p.fare}</td>
                      <td className="num py-1.5 text-right">{p.transfers}</td>
                      <td className="num py-1.5 text-right">{p.peakCrowd}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CopilotPage() {
  return (
    <Suspense fallback={<div className="h-40" />}>
      <CopilotInner />
    </Suspense>
  );
}
