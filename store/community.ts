"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import seedJson from "@/data/seed-community.json";
import type { BuddyRequest, BuilderProfile, CommunityEvent, LostFoundPost } from "@/lib/types";

let counter = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${counter++}`;

interface SeedData {
  lostFound: (Omit<LostFoundPost, "at"> & { minutesAgo: number })[];
  buddyRequests: (Omit<BuddyRequest, "at"> & { minutesAgo: number })[];
  events: (Omit<CommunityEvent, "at"> & { minutesAgo: number })[];
  profiles: Omit<BuilderProfile, "at">[];
}

interface CommunityState {
  lostFound: LostFoundPost[];
  buddyRequests: BuddyRequest[];
  events: CommunityEvent[];
  profiles: BuilderProfile[];
  intros: string[]; // nicknames the user asked to connect with
  seededAt: number | null;
  seed: (nowMs: number) => void;
  addLostFound: (input: {
    kind: "lost" | "found";
    item: string;
    stationId: string;
    detail: string;
    nickname: string;
  }, nowMs: number) => void;
  addBuddy: (input: {
    nickname: string;
    stationId: string;
    direction: string;
    timeMin: number;
    windowMin: number;
    note: string;
  }, nowMs: number) => void;
  requestIntro: (nickname: string) => void;
  reset: () => void;
}

export const useCommunityStore = create<CommunityState>()(
  persist(
    (set) => ({
      lostFound: [],
      buddyRequests: [],
      events: [],
      profiles: [],
      intros: [],
      seededAt: null,
      seed: (nowMs) =>
        set((s) => {
          if (s.seededAt) return s;
          const data = seedJson as unknown as SeedData;
          return {
            seededAt: nowMs,
            lostFound: data.lostFound.map((p) => ({
              ...p,
              at: nowMs - p.minutesAgo * 60000,
            })),
            buddyRequests: data.buddyRequests.map((b) => ({
              ...b,
              at: nowMs - b.minutesAgo * 60000,
            })),
            events: data.events.map((e) => ({ ...e, at: nowMs - e.minutesAgo * 60000 })),
            profiles: data.profiles.map((p) => ({
              ...p,
              at: nowMs - ("minutesAgo" in p ? (p as { minutesAgo: number }).minutesAgo : 0) * 60000,
            })),
          };
        }),
      addLostFound: (input, nowMs) =>
        set((s) => ({
          lostFound: [
            { id: uid("lf"), ...input, at: nowMs, status: "open" as const },
            ...s.lostFound,
          ],
        })),
      addBuddy: (input, nowMs) =>
        set((s) => ({ buddyRequests: [{ id: uid("bd"), ...input, at: nowMs }, ...s.buddyRequests] })),
      requestIntro: (nickname) =>
        set((s) =>
          s.intros.includes(nickname) ? s : { intros: [...s.intros, nickname] },
        ),
      reset: () => set({ lostFound: [], buddyRequests: [], events: [], profiles: [], intros: [], seededAt: null }),
    }),
    { name: "metromind-community", storage: createJSONStorage(() => localStorage) },
  ),
);

export function useMyIntros(): string[] {
  return useCommunityStore((s) => s.intros);
}
