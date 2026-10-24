"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Lang } from "@/lib/i18n";
import type { Strategy } from "@/lib/types";

interface SavedTrip {
  id: string;
  fromId: string;
  toId: string;
  strategy: Strategy;
  arriveMin: number;
  fare: number;
  savedAt: number;
}

export interface MyProfile {
  nickname: string;
  skills: string[];
  lookingFor: string[];
}

interface PrefsState {
  lang: Lang;
  accessibleOnly: boolean;
  recentTrips: SavedTrip[];
  myProfile: MyProfile;
  setLang: (l: Lang) => void;
  setAccessibleOnly: (v: boolean) => void;
  saveTrip: (t: Omit<SavedTrip, "id" | "savedAt">) => void;
  setMyProfile: (p: MyProfile) => void;
  reset: () => void;
}

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      lang: "en",
      accessibleOnly: false,
      recentTrips: [],
      myProfile: { nickname: "", skills: [], lookingFor: [] },
      setLang: (lang) => set({ lang }),
      setAccessibleOnly: (v) => set({ accessibleOnly: v }),
      setMyProfile: (p) => set({ myProfile: p }),
      saveTrip: (t) =>
        set((s) => ({
          recentTrips: [
            { id: `trip-${Date.now().toString(36)}`, ...t, savedAt: Date.now() },
            ...s.recentTrips.filter(
              (x) => !(x.fromId === t.fromId && x.toId === t.toId && x.strategy === t.strategy),
            ),
          ].slice(0, 5),
        })),
      reset: () =>
        set({ lang: "en", accessibleOnly: false, recentTrips: [], myProfile: { nickname: "", skills: [], lookingFor: [] } }),
    }),
    { name: "metromind-prefs", storage: createJSONStorage(() => localStorage) },
  ),
);
