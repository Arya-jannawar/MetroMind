"use client";

import ClientOnly from "./ClientOnly";
import { useLiveStore } from "@/store/live";

function fmt(simNow: number): string {
  const d = new Date(simNow);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function Inner({ compact }: { compact?: boolean }) {
  const simNow = useLiveStore((s) => s.simNow);
  const preset = useLiveStore((s) => s.preset);
  return (
    <span className="inline-flex items-baseline gap-2">
      <span
        className={`num font-medium tracking-tight text-ink ${compact ? "text-[15px]" : "text-xl"}`}
      >
        {fmt(simNow)}
      </span>
      {preset !== "now" && (
        <span className="chip chip-on !px-2 !py-0.5 text-[10px]">
          {preset === "morning-peak" ? "SIM 08:30 PEAK" : "SIM 18:30 PEAK"}
        </span>
      )}
    </span>
  );
}

export default function Clock({ compact }: { compact?: boolean }) {
  return (
    <ClientOnly fallback={<span className="num text-xl text-muted">--:--:--</span>}>
      <Inner compact={compact} />
    </ClientOnly>
  );
}
