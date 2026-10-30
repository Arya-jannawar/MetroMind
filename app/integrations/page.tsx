"use client";

import { useState } from "react";
import { CheckCircle2, KeyRound, Radio, XCircle } from "lucide-react";
import { DemoNote, PageHeader, Segmented, Section } from "@/components/ui";
import { withBase } from "@/lib/basePath";
import { useIntegrationsStore } from "@/store/integrations";

const FEED_SAMPLE = `{
  "updatedAt": "2026-10-24T09:00:00+05:30",
  "lines": [
    { "id": "aqua",   "status": "delay", "delayMin": 12 },
    { "id": "purple", "status": "normal" }
  ],
  "stations": [
    { "id": "shivaji-nagar", "crowd": 0.72 },
    { "name": "Deccan Gymkhana", "crowd": 0.31 }
  ]
}`;

function TestResult({ state }: { state: { ok: boolean; text: string } | null }) {
  if (!state) return null;
  return (
    <p
      className={`flex items-center gap-1.5 text-[12.5px] ${state.ok ? "text-ok" : "text-danger"}`}
      role="status"
    >
      {state.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
      {state.text}
    </p>
  );
}

function LiveFeedCard() {
  const store = useIntegrationsStore();
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const test = async () => {
    setTesting(true);
    setResult(null);
    try {
      const res = await fetch(withBase("/api/live"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint: store.endpoint, apiKey: store.apiKey, keyHeader: store.keyHeader }),
      });
      const json = await res.json();
      setResult(
        json?.ok
          ? {
              ok: true,
              text: `connected · ${json.feed.matched} stations matched${
                json.feed.unmatched ? `, ${json.feed.unmatched} skipped` : ""
              } · ${json.feed.lines.length} line updates`,
            }
          : { ok: false, text: String(json?.error ?? "feed unreachable") },
      );
    } catch {
      setResult({ ok: false, text: "could not reach /api/live" });
    } finally {
      setTesting(false);
    }
  };

  const synced = store.lastSyncAt ? new Date(store.lastSyncAt).toLocaleTimeString() : null;

  return (
    <Section
      kicker="Operations"
      title="Live metro feed"
      aside={
        <Segmented
          label="Data source"
          value={store.mode}
          onChange={store.setMode}
          options={[
            { value: "demo", label: "Demo dataset" },
            { value: "live", label: "Live feed" },
          ]}
        />
      }
    >
      <div className="card space-y-4 p-4">
        <p className="text-[13px] leading-relaxed text-dim">
          Point MetroMind at any endpoint that returns network conditions as JSON — line delays
          and per-station crowding. While <span className="font-mono text-ink">live</span> is
          selected the app polls it continuously and every module (Copilot, CrowdCast, Safety,
          the map) re-reasons on real conditions. Feed fetches run server-side, so CORS is never
          an issue and the key can stay in the environment.
        </p>

        <div className="grid gap-3 lg:grid-cols-2">
          <label className="block">
            <span className="kicker mb-1.5 block">Feed endpoint (https)</span>
            <input
              className="field font-mono text-[12.5px]"
              type="url"
              placeholder="https://ops.example.org/pune-metro/feed.json"
              value={store.endpoint}
              onChange={(e) => store.setEndpoint(e.target.value)}
              spellCheck={false}
            />
          </label>
          <label className="block">
            <span className="kicker mb-1.5 block">API key (optional)</span>
            <input
              className="field font-mono text-[12.5px]"
              type="password"
              placeholder="••••••••••••"
              value={store.apiKey}
              onChange={(e) => store.setApiKey(e.target.value)}
              spellCheck={false}
            />
          </label>
          <label className="block">
            <span className="kicker mb-1.5 block">Key header</span>
            <input
              className="field font-mono text-[12.5px]"
              type="text"
              placeholder="x-api-key"
              value={store.keyHeader}
              onChange={(e) => store.setKeyHeader(e.target.value)}
              spellCheck={false}
            />
          </label>
          <label className="block">
            <span className="kicker mb-1.5 block">Poll interval</span>
            <select
              className="field text-[12.5px]"
              value={store.pollSec}
              onChange={(e) => store.setPollSec(Number(e.target.value))}
            >
              <option value={15}>every 15 seconds</option>
              <option value={30}>every 30 seconds</option>
              <option value={60}>every minute</option>
              <option value={120}>every 2 minutes</option>
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button className="btn-primary h-8" onClick={test} disabled={testing || !store.endpoint}>
            {testing ? "connecting…" : "Test connection"}
          </button>
          <TestResult state={result} />
        </div>

        {(store.mode === "live" || synced) && (
          <div className="rounded-md border border-line-soft bg-surface2/60 px-3 py-2.5 text-[12.5px] leading-relaxed">
            <p className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em]">
              <Radio size={12} className={store.mode === "live" ? "text-ok" : "text-muted"} />
              {store.mode === "live" ? "live feed active" : "last test result"}
            </p>
            {synced && !store.lastError && (
              <p className="mt-1 text-dim">
                synced {synced}
                {store.lastFeed
                  ? ` · ${store.lastFeed.matched} stations · ${store.lastFeed.lines.length} lines`
                  : ""}
              </p>
            )}
            {store.lastError && <p className="mt-1 text-danger">{store.lastError}</p>}
            {store.mode === "live" && !store.endpoint && (
              <p className="mt-1 text-warn">set an endpoint to start syncing</p>
            )}
          </div>
        )}

        <div>
          <p className="kicker mb-1.5">Expected feed contract</p>
          <pre className="overflow-x-auto rounded-md border border-line-soft bg-bg p-3 font-mono text-[11px] leading-relaxed text-dim">
{FEED_SAMPLE}
          </pre>
          <p className="mt-2 text-[12px] leading-relaxed text-muted">
            Station entries match by id or name (slugified — “Shivaji Nagar”, “shivaji-nagar”
            and “SHIVAJI NAGAR” all resolve); unmatched entries are skipped, never guessed.
            <span className="font-mono"> crowd </span>is 0–1 (values &gt;1 are read as %).
            A GTFS-RT source needs a tiny converter to this shape — the normalization layer
            lives in <span className="font-mono">lib/livefeed.ts</span>.
          </p>
        </div>

        <DemoNote>
          pilot keys are kept in this browser only (localStorage) for field trials — production
          deployments should set LIVE_FEED_URL + LIVE_API_KEY as server env vars and leave this
          blank.
        </DemoNote>
      </div>
    </Section>
  );
}

function AiKeyCard() {
  return (
    <Section kicker="Optional · explanations" title="AI API key (OpenAI or GLM)">
      <div className="card space-y-3 p-4 text-[13px] leading-relaxed text-dim">
        <p className="flex items-start gap-2">
          <KeyRound size={15} className="mt-0.5 shrink-0 text-aqua" />
          <span>
            Route explanations are generated by templates by default. Setting an OpenAI or z.ai
            (GLM) key upgrades them to model-written whys — the app is fully functional without
            either and falls back instantly on any error, timeout or missing key. (Note: an AI
            key powers the <em>wording</em> of explanations — live network data comes from the
            feed integration above.)
          </span>
        </p>
        <pre className="overflow-x-auto rounded-md border border-line-soft bg-bg p-3 font-mono text-[11px] leading-relaxed text-dim">
{`# .env.local (server-side only — never shipped to the client)
OPENAI_API_KEY=sk-...          # or ZAI_API_KEY for z.ai / GLM
OPENAI_MODEL=gpt-4o-mini       # optional
AI_PROVIDER=                   # optional: force "openai" or "zai"`}
        </pre>
        <p className="text-[12px] text-muted">
          Keys are read server-side only. The{" "}
          <span className="font-mono">ai: auto / forced offline</span> switch in the Demo Control
          bar overrides this at runtime for A/B comparisons.
        </p>
      </div>
    </Section>
  );
}

export default function IntegrationsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        kicker="Operations · integrations"
        title="Data sources & API keys"
        lede="MetroMind runs fully offline on its demo dataset. This is where an operator or authority connects the same app to live conditions — one JSON contract, no code changes."
      />
      <div className="space-y-6">
        <LiveFeedCard />
        <AiKeyCard />
        <Section kicker="Honest scope" title="What “production ready” means here">
          <div className="card space-y-2.5 p-4 text-[13px] leading-relaxed text-dim">
            <p>
              The integration seam, normalization, polling and failure fallbacks are real and
              tested — point them at a genuine feed and the app runs on it. What this project
              does not include is an authority agreement, a GTFS-RT converter service, or
              hardened multi-tenant auth; those sit outside a one-day build and are on the
              roadmap.
            </p>
            <p className="font-mono text-[10.5px] text-muted">
              dial 112 / contact station staff for real emergencies — this app does not dispatch.
            </p>
          </div>
        </Section>
      </div>
    </div>
  );
}
