"use client";

import { useEffect, useRef } from "react";
import { withBase } from "@/lib/basePath";
import { feedToLiveState } from "@/lib/livefeed";
import { useIntegrationsStore } from "@/store/integrations";
import { useLiveStore } from "@/store/live";

/**
 * Bridge between a configured live feed and the app's live-state store.
 * While mode = "live" and an endpoint is set, this polls /api/live (server
 * side fetch, so no CORS and the key can stay in env) and pushes normalized
 * delays + crowd boosts in. Any failure leaves the last known state up and
 * records the error on the Integrations page.
 */
export default function LiveFeedSync() {
  const mode = useIntegrationsStore((s) => s.mode);
  const endpoint = useIntegrationsStore((s) => s.endpoint);
  const apiKey = useIntegrationsStore((s) => s.apiKey);
  const keyHeader = useIntegrationsStore((s) => s.keyHeader);
  const pollSec = useIntegrationsStore((s) => s.pollSec);

  // keep the latest credentials without re-arming the interval on keystrokes
  const creds = useRef({ apiKey, keyHeader });
  creds.current = { apiKey, keyHeader };

  useEffect(() => {
    if (mode !== "live" || !endpoint) return;

    let cancelled = false;

    const sync = async () => {
      try {
        const res = await fetch(withBase("/api/live"), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint, apiKey: creds.current.apiKey, keyHeader: creds.current.keyHeader }),
        });
        const json = await res.json();
        if (cancelled) return;
        if (json?.ok && json.feed) {
          useIntegrationsStore.getState().applyFeed(json.feed);
          const { delays, boosts } = feedToLiveState(json.feed);
          useLiveStore.getState().applyLiveFeed(delays, boosts);
        } else {
          useIntegrationsStore.getState().markError(String(json?.error ?? "feed unreachable"));
        }
      } catch {
        if (!cancelled) useIntegrationsStore.getState().markError("could not reach /api/live");
      }
    };

    void sync();
    const t = setInterval(sync, Math.max(10, pollSec) * 1000);
    return () => {
      cancelled = true;
      clearInterval(t);
      // stepping back to demo hands the network back to the Demo Control bar
      useLiveStore.getState().clearDisruptions();
    };
  }, [mode, endpoint, pollSec]);

  return null;
}
