import { NextResponse } from "next/server";
import { minToHHMM } from "@/lib/time";

// ---------------------------------------------------------------------------
// /api/copilot — the ONLY AI route. Reads ZAI_API_KEY from the server env,
// never ships it to the client. Any failure (missing key, slow >3s, bad
// response) falls back instantly to deterministic templates. The demo never
// depends on AI; AI is an upgrade.
// ---------------------------------------------------------------------------

export const runtime = "nodejs";
export const maxDuration = 10;

interface PlanIn {
  id: string;
  strategy: string;
  totalMin: number;
  fare: number;
  transfers: number;
  departMin: number;
  arriveMin: number;
  peakCrowd: number;
}

interface Body {
  origin?: string;
  destination?: string;
  arriveBy?: string;
  budget?: number | null;
  avoidCrowds?: boolean;
  plans?: PlanIn[];
  mode?: "auto" | "offline";
}

const STRAT_WORD: Record<string, string> = {
  fastest: "the fastest line-up",
  comfort: "the lightest-crowd option",
  direct: "the simplest ride",
};

/** Deterministic template explanations built from the plan numbers alone. */
function templateWhy(p: PlanIn, body: Body): string {
  const bits: string[] = [];
  const strat = STRAT_WORD[p.strategy] ?? "this option";
  bits.push(`${strat[0].toUpperCase()}${strat.slice(1)}: board ~${minToHHMM(p.departMin)}, arrive ${minToHHMM(p.arriveMin)}`);
  if (body.arriveBy) {
    const [h, m] = body.arriveBy.split(":").map(Number);
    const slack = h * 60 + m - p.arriveMin;
    bits.push(slack > 0 ? `${slack} min before your ${body.arriveBy} deadline` : "right at your deadline");
  }
  bits.push(`₹${p.fare}·${p.transfers === 0 ? "no changes" : `${p.transfers} change${p.transfers === 1 ? "" : "s"}`}`);
  if (body.avoidCrowds) bits.push(`peak crowd ${p.peakCrowd}/100`);
  return bits.join(", ") + ".";
}

async function callGlm(body: Body, key: string, baseUrl: string, model: string) {
  const plans = body.plans ?? [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000); // hard 3s budget
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: 400,
        messages: [
          {
            role: "system",
            content:
              "You are MetroMind, a Pune Metro commute copilot. For each route plan, write ONE sentence (max 26 words) explaining why it fits the rider's stated constraints. Use ONLY the numbers given; never invent stations, times or fares. Reply with strict JSON: {\"plans\":[{\"id\":\"<plan id>\",\"why\":\"<sentence>\"}]}",
          },
          {
            role: "user",
            content: JSON.stringify({
              rider: {
                origin: body.origin,
                destination: body.destination,
                arriveBy: body.arriveBy,
                budget: body.budget,
                avoidCrowds: body.avoidCrowds,
              },
              plans: plans.map((p) => ({
                id: p.id,
                strategy: p.strategy,
                totalMinutes: p.totalMin,
                fare: p.fare,
                transfers: p.transfers,
                departs: minToHHMM(p.departMin),
                arrives: minToHHMM(p.arriveMin),
                peakCrowdScore: p.peakCrowd,
              })),
            }),
          },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`glm ${res.status}`);
    const data = await res.json();
    const text: string | undefined = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error("glm empty");
    const jsonText = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const parsed = JSON.parse(jsonText) as { plans?: { id: string; why: string }[] };
    const out: Record<string, { why: string }> = {};
    for (const p of parsed.plans ?? []) {
      if (p?.id && typeof p.why === "string" && p.why.length > 0 && p.why.length < 220) {
        out[p.id] = { why: p.why };
      }
    }
    if (Object.keys(out).length === 0) throw new Error("glm unusable");
    return out;
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ source: "template", plans: {} }, { status: 200 });
  }

  const plans = body.plans ?? [];

  // Offline mode requested client-side, or no key configured: templates, 200 OK.
  const key = process.env.ZAI_API_KEY;
  const baseUrl = process.env.ZAI_BASE_URL ?? "https://api.z.ai/api/paas/v4";
  const model = process.env.ZAI_MODEL ?? "glm-4.6";

  if (body.mode === "offline" || !key) {
    return NextResponse.json({
      source: "template",
      plans: Object.fromEntries(plans.map((p) => [p.id, { why: templateWhy(p, body) }])),
    });
  }

  try {
    const whys = await callGlm(body, key, baseUrl, model);
    return NextResponse.json({ source: "glm", plans: whys });
  } catch {
    // rate-limited, slow, or erroring → deterministic fallback, demo continues
    return NextResponse.json({
      source: "template",
      plans: Object.fromEntries(plans.map((p) => [p.id, { why: templateWhy(p, body) }])),
    });
  }
}
