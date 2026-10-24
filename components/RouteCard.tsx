"use client";

import Link from "next/link";
import { ArrowRight, Check, Star } from "lucide-react";
import { LINE_COLORS, LINES, stationName } from "@/lib/data";
import { CrowdBadge } from "./Badges";
import { strategyLabel } from "@/lib/explain";
import { inr } from "@/lib/fare";
import { minToHHMM } from "@/lib/time";
import { usePrefsStore } from "@/store/prefs";
import type { RoutePlan } from "@/lib/types";

export default function RouteCard({
  plan,
  destId,
  why,
  aiSource,
  dimmed = false,
  dimReason,
}: {
  plan: RoutePlan;
  destId: string;
  why: string;
  aiSource?: "glm" | "template";
  dimmed?: boolean;
  dimReason?: string;
}) {
  const saveTrip = usePrefsStore((s) => s.saveTrip);
  const saved = usePrefsStore((s) =>
    s.recentTrips.some(
      (t) => t.fromId === plan.stationIds[0] && t.toId === destId && t.strategy === plan.strategy,
    ),
  );

  return (
    <article
      className={`card anim-rise relative overflow-hidden ${dimmed ? "opacity-50" : ""}`}
      aria-label={`${strategyLabel(plan.strategy)} route, ${Math.round(plan.totalMin)} minutes, fare ${plan.fare}`}
    >
      <div
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{
          background:
            plan.legIds.length > 1
              ? `linear-gradient(180deg, ${LINE_COLORS[plan.legIds[0]]} 0 50%, ${LINE_COLORS[plan.legIds[plan.legIds.length - 1]]} 50% 100%)`
              : LINE_COLORS[plan.legIds[0]],
        }}
      />
      <div className="p-4 pl-5">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h3 className="font-semibold text-ink">{strategyLabel(plan.strategy)}</h3>
            {plan.slackMin > 0 && !dimmed && (
              <span className="chip chip-on !py-0.5">{plan.slackMin}′ early</span>
            )}
            {dimmed && dimReason && (
              <span className="chip !py-0.5 border-danger/40 text-danger">{dimReason}</span>
            )}
            {plan.notes.map((n) => (
              <span key={n} className="chip !py-0.5 border-warn/40 text-warn">
                {n}
              </span>
            ))}
          </div>
          <div className="text-right">
            <span className="num text-xl font-semibold text-ink">{Math.round(plan.totalMin)}′</span>
            <span className="num ml-2 text-sm text-dim">{inr(plan.fare)}</span>
          </div>
        </div>

        {/* legs timeline */}
        <div className="space-y-0">
          {plan.legs.map((leg, i) => {
            const l = LINES.find((x) => x.id === leg.lineId)!;
            return (
              <div key={i}>
                {i > 0 && (
                  <div className="flex items-center gap-2 py-1 pl-[7px]">
                    <span className="h-4 w-px bg-line" />
                    <span className="font-mono text-[10.5px] text-muted">
                      change at {stationName(leg.fromId)} · ~4 min
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2.5">
                  <span className="dot !h-2 !w-2" style={{ background: l.color }} />
                  <div className="min-w-0 flex-1 border-b border-line-soft pb-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <span className="text-[13px] text-ink">
                        {stationName(leg.fromId)}
                        <ArrowRight size={11} className="mx-1 inline text-muted" />
                        {stationName(leg.toId)}
                        <span className="ml-1.5 font-mono text-[10.5px] text-muted">
                          {l.name} · {leg.hops} stop{leg.hops === 1 ? "" : "s"}
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        <CrowdBadge score={leg.crowd} />
                        <span className="num text-[11.5px] text-dim">
                          {minToHHMM(leg.boardMin)}→{minToHHMM(leg.alightMin)}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* why */}
        <p className="mt-3 rounded-md border border-aqua/20 bg-aqua/[0.06] px-3 py-2 text-[13px] leading-relaxed text-dim">
          <span className="mr-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-aqua">
            Why this route
          </span>
          {why}
          {aiSource === "glm" && (
            <span className="ml-1.5 font-mono text-[9.5px] uppercase tracking-widest text-grape">
              · GLM
            </span>
          )}
          {aiSource === "template" && (
            <span className="ml-1.5 font-mono text-[9.5px] uppercase tracking-widest text-muted">
              · offline AI mode
            </span>
          )}
        </p>

        <div className="mt-3 flex items-center justify-between">
          <span className="num text-[11px] text-muted">
            dep {minToHHMM(plan.departMin)} · arr {minToHHMM(plan.arriveMin)} · {plan.transfers}{" "}
            change{plan.transfers === 1 ? "" : "s"} · incl. entry + security
          </span>
          <div className="flex items-center gap-2">
            <Link
              href={`/station/${plan.stationIds[0]}`}
              className="btn-quiet !px-2 !py-1 text-[11.5px]"
            >
              origin
            </Link>
            <button
              onClick={() =>
                saveTrip({
                  fromId: plan.stationIds[0],
                  toId: destId,
                  strategy: plan.strategy,
                  arriveMin: plan.arriveMin,
                  fare: plan.fare,
                })
              }
              className="btn-quiet !px-2 !py-1 text-[11.5px]"
              disabled={saved}
            >
              {saved ? (
                <>
                  <Check size={12} /> saved
                </>
              ) : (
                <>
                  <Star size={12} /> save trip
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
