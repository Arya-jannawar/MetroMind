"use client";

import { BAND_META, bandOf } from "@/lib/crowd";

export function CrowdBadge({ score, fresh = true }: { score: number; fresh?: boolean }) {
  const band = bandOf(score);
  const meta = BAND_META[band];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10.5px]"
      style={{ background: meta.bg, color: meta.color }}
      title={fresh ? `crowd score ${Math.round(score)}/100` : "model estimate"}
    >
      <span className="dot" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}

export function StatusPill({ state, children }: { state: "ok" | "warn" | "danger"; children: React.ReactNode }) {
  const color = state === "ok" ? "var(--ok)" : state === "warn" ? "var(--warn)" : "var(--danger)";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10.5px]"
      style={{ borderColor: `${color}55`, color }}
    >
      <span className="dot" style={{ background: color }} />
      {children}
    </span>
  );
}
