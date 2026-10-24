"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import seedJson from "@/data/seed-hazards.json";
import type { Hazard, HazardType } from "@/lib/types";

let counter = 0;
const uid = () => `hz-${Date.now().toString(36)}-${counter++}`;

interface SafeState {
  hazards: Hazard[];
  seededAt: number | null;
  seed: (nowMs: number) => void;
  addHazard: (
    input: {
      type: HazardType;
      nearStationId: string;
      location: string;
      note?: string;
      severity: 1 | 2 | 3 | 4 | 5;
    },
    nowMs: number,
  ) => void;
  reset: () => void;
}

interface SeedRow {
  id: string;
  type: HazardType;
  nearStationId: string;
  location: string;
  severity: 1 | 2 | 3 | 4 | 5;
  minutesAgo: number;
}

export const useSafeStore = create<SafeState>()(
  persist(
    (set) => ({
      hazards: [],
      seededAt: null,
      seed: (nowMs) =>
        set((s) => {
          if (s.seededAt) return s;
          const rows = (seedJson as { hazards: SeedRow[] }).hazards;
          return {
            seededAt: nowMs,
            hazards: rows.map((r) => ({
              id: r.id,
              type: r.type,
              nearStationId: r.nearStationId,
              location: r.location,
              severity: r.severity,
              at: nowMs - r.minutesAgo * 60000,
              source: "seed" as const,
            })),
          };
        }),
      addHazard: (input, nowMs) =>
        set((s) => ({
          hazards: [
            { id: uid(), ...input, at: nowMs, source: "user" as const },
            ...s.hazards,
          ],
        })),
      reset: () => set({ hazards: [], seededAt: null }),
    }),
    { name: "metromind-safe", storage: createJSONStorage(() => localStorage) },
  ),
);
