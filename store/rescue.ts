"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import seedJson from "@/data/seed-incidents.json";
import type { Incident, IncidentStatus, IncidentType } from "@/lib/types";

let counter = 0;
const uid = () => `inc-${Date.now().toString(36)}-${counter++}`;

interface RescueState {
  incidents: Incident[];
  seededAt: number | null;
  seed: (nowMs: number) => void;
  addIncident: (
    input: { type: IncidentType; stationId: string; note: string; peopleAffected: number },
    nowMs: number,
  ) => void;
  setStatus: (id: string, status: IncidentStatus) => void;
  reset: () => void;
}

interface SeedRow {
  id: string;
  type: IncidentType;
  stationId: string;
  note: string;
  peopleAffected: number;
  minutesAgo: number;
  status: IncidentStatus;
}

export const useRescueStore = create<RescueState>()(
  persist(
    (set) => ({
      incidents: [],
      seededAt: null,
      seed: (nowMs) =>
        set((s) => {
          if (s.seededAt) return s;
          const rows = (seedJson as { incidents: SeedRow[] }).incidents;
          return {
            seededAt: nowMs,
            incidents: rows.map((r) => ({
              id: r.id,
              type: r.type,
              stationId: r.stationId,
              note: r.note,
              peopleAffected: r.peopleAffected,
              at: nowMs - r.minutesAgo * 60000,
              status: r.status,
              source: "seed" as const,
            })),
          };
        }),
      addIncident: (input, nowMs) =>
        set((s) => ({
          incidents: [
            {
              id: uid(),
              type: input.type,
              stationId: input.stationId,
              note: input.note,
              peopleAffected: input.peopleAffected,
              at: nowMs,
              status: "open",
              source: "user",
            },
            ...s.incidents,
          ],
        })),
      setStatus: (id, status) =>
        set((s) => ({
          incidents: s.incidents.map((i) => (i.id === id ? { ...i, status } : i)),
        })),
      reset: () => set({ incidents: [], seededAt: null }),
    }),
    { name: "metromind-rescue", storage: createJSONStorage(() => localStorage) },
  ),
);
