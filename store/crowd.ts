"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import seedJson from "@/data/seed-reports.json";
import type { CrowdLevel, CrowdReport } from "@/lib/types";

let counter = 0;
const uid = () => `r-${Date.now().toString(36)}-${counter++}`;

interface CrowdState {
  reports: CrowdReport[];
  seededAt: number | null;
  seed: (nowMs: number) => void;
  addReport: (stationId: string, level: CrowdLevel, nowMs: number) => void;
  reset: () => void;
}

interface SeedRow {
  stationId: string;
  level: CrowdLevel;
  minutesAgo: number;
}

export const useCrowdStore = create<CrowdState>()(
  persist(
    (set) => ({
      reports: [],
      seededAt: null,
      seed: (nowMs) =>
        set((s) => {
          if (s.seededAt) return s;
          const rows = (seedJson as { reports: SeedRow[] }).reports;
          return {
            seededAt: nowMs,
            reports: rows.map((r) => ({
              id: uid(),
              stationId: r.stationId,
              level: r.level,
              at: nowMs - r.minutesAgo * 60000,
              source: "seed" as const,
            })),
          };
        }),
      addReport: (stationId, level, nowMs) =>
        set((s) => ({
          reports: [
            ...s.reports,
            { id: uid(), stationId, level, at: nowMs, source: "user" as const },
          ],
        })),
      reset: () => set({ reports: [], seededAt: null }),
    }),
    { name: "metromind-crowd", storage: createJSONStorage(() => localStorage) },
  ),
);
