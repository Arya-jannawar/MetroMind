"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { NormalizedFeed } from "@/lib/livefeed";

export type FeedMode = "demo" | "live";

/**
 * Operator-configurable data source. Demo mode keeps every module on the
 * deterministic dataset; live mode polls a real feed endpoint through
 * /api/live and pushes normalized conditions into the live-state store.
 * The key lives here only for pilot/field use — production deployments
 * should set LIVE_FEED_URL + LIVE_API_KEY as server env vars instead.
 */
interface IntegrationsState {
  mode: FeedMode;
  endpoint: string;
  apiKey: string;
  keyHeader: string;
  pollSec: number;
  lastSyncAt: number;
  lastError: string;
  lastFeed: NormalizedFeed | null;
  setMode: (m: FeedMode) => void;
  setEndpoint: (v: string) => void;
  setApiKey: (v: string) => void;
  setKeyHeader: (v: string) => void;
  setPollSec: (v: number) => void;
  applyFeed: (f: NormalizedFeed) => void;
  markError: (e: string) => void;
}

export const useIntegrationsStore = create<IntegrationsState>()(
  persist(
    (set) => ({
      mode: "demo",
      endpoint: "",
      apiKey: "",
      keyHeader: "x-api-key",
      pollSec: 30,
      lastSyncAt: 0,
      lastError: "",
      lastFeed: null,
      setMode: (m) => set({ mode: m }),
      setEndpoint: (v) => set({ endpoint: v }),
      setApiKey: (v) => set({ apiKey: v }),
      setKeyHeader: (v) => set({ keyHeader: v }),
      setPollSec: (v) => set({ pollSec: v }),
      applyFeed: (f) => set({ lastFeed: f, lastSyncAt: Date.now(), lastError: "" }),
      markError: (e) => set({ lastError: e }),
    }),
    {
      name: "metromind-integrations",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
