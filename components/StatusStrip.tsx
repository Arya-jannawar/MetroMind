"use client";

import ClientOnly from "./ClientOnly";
import { useLiveStore, nowMinOf } from "@/store/live";
import { lineDelayMin } from "@/lib/crowd";
import type { LineId } from "@/lib/types";
import { LINE_COLORS } from "@/lib/data";

function LineStatus({ lineId, name }: { lineId: LineId; name: string }) {
  const disruptions = useLiveStore((s) => s.disruptions);
  const delay = lineDelayMin(disruptions, lineId);
  const state = delay === 0 ? "normal" : delay <= 10 ? "delayed" : "disrupted";
  const color =
    state === "normal" ? "var(--ok)" : state === "delayed" ? "var(--warn)" : "var(--danger)";
  return (
    <span className="chip !py-1">
      <span className="dot" style={{ background: LINE_COLORS[lineId] }} />
      <span className="text-ink/80">{name}</span>
      <span className="num" style={{ color }}>
        {delay === 0 ? "NORMAL" : `+${delay} MIN`}
      </span>
    </span>
  );
}

function Inner() {
  const nowMin = nowMinOf(useLiveStore((s) => s.simNow));
  void nowMin; // subscribes to clock so delays re-render on reset
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar" aria-label="Line status">
      <LineStatus lineId="aqua" name="Aqua" />
      <LineStatus lineId="purple" name="Purple" />
    </div>
  );
}

export default function StatusStrip() {
  return (
    <ClientOnly fallback={<div className="h-[26px]" />}>
      <Inner />
    </ClientOnly>
  );
}
