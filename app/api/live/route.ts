import { NextResponse } from "next/server";
import { normalizeLiveFeed } from "@/lib/livefeed";

// Server-side bridge to a live metro feed. The upstream URL + API key are
// read from the environment for production deployments (LIVE_FEED_URL,
// LIVE_API_KEY, LIVE_API_KEY_HEADER); the POST variant lets the Integrations
// page test a pilot endpoint without storing anything server-side.

const TIMEOUT_MS = 4000;

async function pull(
  endpoint: string,
  apiKey?: string,
  keyHeader = "x-api-key",
): Promise<ReturnType<typeof normalizeLiveFeed>> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const headers: Record<string, string> = { accept: "application/json" };
    if (apiKey) headers[keyHeader] = apiKey;
    const res = await fetch(endpoint, { headers, signal: ctl.signal, cache: "no-store" });
    if (!res.ok) return { ok: false, error: `upstream responded ${res.status}` };
    const json = await res.json();
    return normalizeLiveFeed(json);
  } catch (e) {
    const msg = e instanceof Error && e.name === "AbortError" ? "upstream timeout" : "fetch failed";
    return { ok: false, error: msg };
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  const url = process.env.LIVE_FEED_URL;
  if (!url) {
    return NextResponse.json({
      source: "not-configured",
      message:
        "Set LIVE_FEED_URL (+ LIVE_API_KEY, LIVE_API_KEY_HEADER) in the environment, or configure a pilot feed on the Integrations page.",
    });
  }
  const r = await pull(url, process.env.LIVE_API_KEY, process.env.LIVE_API_KEY_HEADER || "x-api-key");
  return NextResponse.json(
    r.ok ? { source: "live", ...r } : { source: "error", ...r },
    { status: r.ok ? 200 : 502 },
  );
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    endpoint?: unknown;
    apiKey?: unknown;
    keyHeader?: unknown;
  } | null;
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint.trim() : "";
  if (!/^https?:\/\//i.test(endpoint)) {
    return NextResponse.json({ ok: false, error: "endpoint must be an http(s) URL" }, { status: 400 });
  }
  const apiKey = typeof body?.apiKey === "string" && body.apiKey ? body.apiKey : undefined;
  const keyHeader =
    typeof body?.keyHeader === "string" && body.keyHeader.trim() ? body.keyHeader.trim() : "x-api-key";
  const r = await pull(endpoint, apiKey, keyHeader);
  return NextResponse.json(
    r.ok ? { source: "live", ...r } : { source: "error", ...r },
    { status: r.ok ? 200 : 502 },
  );
}
