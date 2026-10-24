"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CrowdSpike, Disruption, LineId } from "@/lib/types";

export type SimPreset = "now" | "morning-peak" | "evening-peak";

interface LiveState {
  simNow: number; // simulated epoch ms
  offsetMin: number; // simulated clock offset from real time
  preset: SimPreset;
  disruptions: Disruption[];
  spikes: CrowdSpike[];
  aiOffline: boolean; // user toggle: force rule-based explanations
  tick: () => void;
  setPreset: (p: SimPreset) => void;
  injectDelay: (lineId: LineId, minutes: number) => void;
  injectSpike: (stationId: string, boost?: number, minutes?: number) => void;
  clearDisruptions: () => void;
  toggleAi: () => void;
  clearAll: () => void;
}

/** Offset that maps the real clock onto 08:30 (morning peak build-up). */
function morningOffset(): number {
  const now = new Date();
  const target = new Date(now);
  target.setHours(8, 30, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 60000);
}

function eveningOffset(): number {
  const now = new Date();
  const target = new Date(now);
  target.setHours(18, 30, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 60000);
}

let counter = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${counter++}`;

export const useLiveStore = create<LiveState>()(
  persist(
    (set, get) => ({
      simNow: Date.now(),
      offsetMin: 0,
      preset: "now",
      disruptions: [],
      spikes: [],
      aiOffline: false,
      tick: () => set({ simNow: Date.now() + get().offsetMin * 60000 }),
      setPreset: (p) => {
        const offset =
          p === "morning-peak" ? morningOffset() : p === "evening-peak" ? eveningOffset() : 0;
        set({ preset: p, offsetMin: offset, simNow: Date.now() + offset * 60000 });
      },
      injectDelay: (lineId, minutes) =>
        set((s) => {
          // accumulate: pressing the button twice injects a 30′ disruption
          const existing = s.disruptions.find((d) => d.lineId === lineId);
          const next = existing
            ? s.disruptions.map((d) =>
                d.lineId === lineId ? { ...d, minutes: d.minutes + minutes } : d,
              )
            : [...s.disruptions, { id: uid("dis"), lineId, kind: "delay" as const, minutes, createdAt: Date.now() }];
          return { disruptions: next };
        }),
      injectSpike: (stationId, boost = 42, minutes = 30) =>
        set((s) => ({
          spikes: [
            ...s.spikes.filter((k) => k.stationId !== stationId),
            { id: uid("spike"), stationId, boost, until: Date.now() + minutes * 60000 },
          ],
        })),
      clearDisruptions: () => set({ disruptions: [], spikes: [] }),
      toggleAi: () => set((s) => ({ aiOffline: !s.aiOffline })),
      clearAll: () =>
        set({ disruptions: [], spikes: [], offsetMin: 0, preset: "now", simNow: Date.now() }),
    }),
    {
      name: "metromind-live",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        offsetMin: s.offsetMin,
        preset: s.preset,
        disruptions: s.disruptions,
        spikes: s.spikes,
        aiOffline: s.aiOffline,
      }),
    },
  ),
);

/** Convenience: current simulated minutes-of-day. */
export function nowMinOf(simNow: number): number {
  const d = new Date(simNow);
  return d.getHours() * 60 + d.getMinutes();
}
