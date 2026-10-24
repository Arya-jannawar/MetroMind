"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AlertTriangle, BadgeAlert, PackageSearch, Users } from "lucide-react";
import { stationName } from "@/lib/data";
import { relTime } from "@/lib/time";
import { useCrowdStore } from "@/store/crowd";
import { useRescueStore } from "@/store/rescue";
import { useCommunityStore } from "@/store/community";
import { useSafeStore } from "@/store/safe";
import { useLiveStore } from "@/store/live";
import type { CrowdLevel } from "@/lib/types";

const LEVEL_WORD: Record<CrowdLevel, string> = {
  empty: "Light crowds",
  moderate: "Moderate crowds",
  packed: "Packed platform",
};

type Item = { at: number; icon: "crowd" | "incident" | "lost" | "hazard"; text: string; href: string };

export default function ActivityFeed({ limit = 6 }: { limit?: number }) {
  const reports = useCrowdStore((s) => s.reports);
  const incidents = useRescueStore((s) => s.incidents);
  const lostFound = useCommunityStore((s) => s.lostFound);
  const hazards = useSafeStore((s) => s.hazards);

  const items = useMemo<Item[]>(() => {
    const crowd: Item[] = reports
      .slice(-8)
      .reverse()
      .map((r) => ({
        at: r.at,
        icon: "crowd",
        text: `${LEVEL_WORD[r.level]} reported at ${stationName(r.stationId)}${r.source === "seed" ? " (sample)" : ""}`,
        href: "/crowd",
      }));
    const inc: Item[] = incidents.slice(0, 6).map((i) => ({
      at: i.at,
      icon: "incident",
      text: `${i.type.replace("-", " ")} reported at ${stationName(i.stationId)} · ${i.status}`,
      href: "/safety",
    }));
    const lost: Item[] = lostFound.slice(0, 5).map((p) => ({
      at: p.at,
      icon: "lost",
      text: `${p.kind === "lost" ? "Lost" : "Found"}: ${p.item} · ${stationName(p.stationId)}`,
      href: "/community",
    }));
    const hz: Item[] = hazards.slice(0, 5).map((h) => ({
      at: h.at,
      icon: "hazard",
      text: `${h.type} hazard near ${stationName(h.nearStationId)} · severity ${h.severity}/5`,
      href: "/safety",
    }));
    return [...crowd, ...inc, ...lost, ...hz].sort((a, b) => b.at - a.at).slice(0, limit);
  }, [reports, incidents, lostFound, hazards, limit]);

  if (items.length === 0) {
    return <p className="text-sm text-muted">Quiet network — no reports in the last hour.</p>;
  }

  const ICONS = {
    crowd: Users,
    incident: BadgeAlert,
    lost: PackageSearch,
    hazard: AlertTriangle,
  };
  const COLORS = {
    crowd: "var(--aqua)",
    incident: "var(--danger)",
    lost: "var(--grape)",
    hazard: "var(--warn)",
  };

  return (
    <ul className="divide-y divide-line-soft">
      {items.map((it, i) => {
        const Icon = ICONS[it.icon];
        return (
          <li key={i}>
            <Link href={it.href} className="flex items-center gap-3 py-2.5 group">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                style={{ background: `${COLORS[it.icon]}18`, color: COLORS[it.icon] }}
              >
                <Icon size={14} />
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] text-dim group-hover:text-ink">
                {it.text}
              </span>
              <span className="num shrink-0 text-[11px] text-muted">{relTime(it.at)}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
