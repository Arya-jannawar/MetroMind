"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Terminal } from "lucide-react";
import { resetDemo } from "@/store/bootstrap";
import { useIntegrationsStore } from "@/store/integrations";
import { useLiveStore } from "@/store/live";

// God-mode demo control. Intentionally visible and clearly badged: the
// presenter injects disruptions/crowd and the app adapts live. Never
// presented as real operations data.

function DbButton({
  onClick,
  children,
  tone = "ghost",
  testId,
}: {
  onClick: () => void;
  children: React.ReactNode;
  tone?: "ghost" | "aqua" | "danger";
  testId?: string;
}) {
  const cls =
    tone === "aqua"
      ? "border-aqua/40 text-aqua hover:bg-aqua/10"
      : tone === "danger"
        ? "border-danger/40 text-danger hover:bg-danger/10"
        : "border-line text-dim hover:bg-surface2 hover:text-ink";
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className={`rounded border px-2.5 py-1 font-mono text-[11px] transition-colors ${cls}`}
    >
      {children}
    </button>
  );
}

function Panel() {
  const [open, setOpen] = useState(false);
  const injectDelay = useLiveStore((s) => s.injectDelay);
  const injectSpike = useLiveStore((s) => s.injectSpike);
  const clearDisruptions = useLiveStore((s) => s.clearDisruptions);
  const setPreset = useLiveStore((s) => s.setPreset);
  const aiOffline = useLiveStore((s) => s.aiOffline);
  const toggleAi = useLiveStore((s) => s.toggleAi);
  const disruptions = useLiveStore((s) => s.disruptions);
  const spikes = useLiveStore((s) => s.spikes);
  const feedMode = useIntegrationsStore((s) => s.mode);
  const feedError = useIntegrationsStore((s) => s.lastError);

  const activeCount = disruptions.length + spikes.filter((k) => k.until > Date.now()).length;

  return (
    <div className="mx-auto max-w-3xl overflow-hidden rounded-card border border-warn/35 bg-[#131309]/95 shadow-[0_8px_30px_rgba(0,0,0,0.55)] backdrop-blur lg:mx-0">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        data-testid="demo-toggle"
        className="flex w-full items-center gap-2 px-3.5 py-2"
      >
        <Terminal size={13} className="text-warn" />
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-warn">
          Demo control
        </span>
        {feedMode === "live" && !feedError && (
          <span className="flex items-center gap-1 rounded bg-ok/15 px-1.5 py-0.5 font-mono text-[10px] text-ok">
            <span className="dot animate-pulse-soft bg-ok" /> live feed
          </span>
        )}
        {feedMode === "live" && feedError && (
          <span className="rounded bg-danger/15 px-1.5 py-0.5 font-mono text-[10px] text-danger">
            feed error
          </span>
        )}
        {activeCount > 0 && (
          <span className="num rounded bg-warn/15 px-1.5 py-0.5 text-[10px] text-warn">
            {activeCount} active
          </span>
        )}
        <span className="ml-auto hidden font-mono text-[10px] text-muted sm:block">
          inject conditions live · judges, this is intentional
        </span>
        <ChevronDown
          size={14}
          className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-warn/20 px-3.5 py-2.5">
          <DbButton testId="demo-aqua" onClick={() => injectDelay("aqua", 15)}>aqua +15′ delay</DbButton>
          <DbButton onClick={() => injectDelay("purple", 10)}>purple +10′ delay</DbButton>
          <DbButton onClick={() => injectSpike("shivaji-nagar")}>crowd spike @ Shivaji Nagar</DbButton>
          <DbButton onClick={() => setPreset("morning-peak")}>sim 08:30</DbButton>
          <DbButton onClick={() => setPreset("evening-peak")}>sim 18:30</DbButton>
          <DbButton onClick={() => setPreset("now")}>sim → now</DbButton>
          <DbButton onClick={clearDisruptions}>clear conditions</DbButton>
          <DbButton onClick={toggleAi}>{aiOffline ? "ai: forced offline" : "ai: auto"}</DbButton>
          <Link
            href="/integrations"
            className="rounded border border-line px-2.5 py-1 font-mono text-[11px] text-dim transition-colors hover:bg-surface2 hover:text-ink"
          >
            live feed / api keys →
          </Link>
          <DbButton tone="danger" onClick={resetDemo}>
            reset demo
          </DbButton>
        </div>
      )}
    </div>
  );
}

export default function DemoBar() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return (
    <div className="fixed inset-x-0 bottom-[60px] z-40 px-3 lg:bottom-5 lg:left-[252px] lg:right-8">
      <Panel />
    </div>
  );
}
