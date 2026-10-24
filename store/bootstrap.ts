"use client";

import { useEffect } from "react";
import { useCrowdStore } from "./crowd";
import { useRescueStore } from "./rescue";
import { useCommunityStore } from "./community";
import { useSafeStore } from "./safe";
import { useLiveStore } from "./live";

let seeded = false;

/** Seeds demo data once per session (localStorage-persisted afterwards). */
export function useSeedOnce(): void {
  useEffect(() => {
    if (seeded) return;
    seeded = true;
    const now = Date.now();
    useCrowdStore.getState().seed(now);
    useRescueStore.getState().seed(now);
    useCommunityStore.getState().seed(now);
    useSafeStore.getState().seed(now);
    useLiveStore.getState().tick();
  }, []);
}

/** Clears every persisted MetroMind key and reloads — used by Demo Bar reset. */
export function resetDemo(): void {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith("metromind-")) keys.push(k);
  }
  keys.forEach((k) => localStorage.removeItem(k));
  window.location.reload();
}
