"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Compass, HandHeart, LayoutDashboard, Route, Users } from "lucide-react";
import ClientOnly from "./ClientOnly";
import Clock from "./Clock";
import DemoBar from "./DemoBar";
import LiveFeedSync from "./LiveFeedSync";
import StatusStrip from "./StatusStrip";
import Wordmark from "./Wordmark";
import { resetDemo, useSeedOnce } from "@/store/bootstrap";
import { useLiveStore } from "@/store/live";
import { META } from "@/lib/data";

export const NAV = [
  { href: "/", label: "Home", icon: LayoutDashboard, hint: "Mission control" },
  { href: "/copilot", label: "Copilot", icon: Route, hint: "Plan a trip" },
  { href: "/crowd", label: "CrowdCast", icon: Compass, hint: "Live crowding" },
  { href: "/safety", label: "Safety", icon: HandHeart, hint: "Rescue grid + SafeStreets" },
  { href: "/community", label: "Community", icon: Users, hint: "Lost & found · buddies · builders" },
] as const;

function useDemoTicker() {
  useEffect(() => {
    const t = setInterval(() => useLiveStore.getState().tick(), 1000);
    return () => clearInterval(t);
  }, []);
}

function useServiceWorker() {
  useEffect(() => {
    // skipped on the static GitHub Pages export (basePath hosting + cached
    // shell adds risk without benefit for the demo)
    if (process.env.NEXT_PUBLIC_BASE_PATH) return;
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline shell is best-effort */
    });
  }, []);
}

function SideRail() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[228px] flex-col border-r border-line bg-surface/60 backdrop-blur lg:flex">
      <div className="px-5 pb-4 pt-6">
        <Wordmark />
      </div>
      <div className="stripe-line mx-5" />
      <nav aria-label="Primary" className="mt-4 flex-1 px-3">
        {NAV.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`group mb-1 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-surface2 text-ink"
                  : "text-dim hover:bg-surface2/60 hover:text-ink"
              }`}
            >
              <Icon size={17} strokeWidth={active ? 2.2 : 1.8} className={active ? "text-aqua" : ""} />
              <span className="flex flex-col leading-tight">
                <span className="font-medium">{item.label}</span>
                <span className="text-[11px] text-muted">{item.hint}</span>
              </span>
              {active && <span className="ml-auto h-5 w-[3px] rounded-full bg-aqua" />}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-line-soft px-5 py-4">
        <p className="kicker mb-2">Network clock</p>
        <Clock />
        <Link
          href="/integrations"
          className="mt-4 flex items-center justify-between text-[11px] text-muted transition-colors hover:text-aqua"
        >
          <span>data source &amp; API keys</span>
          <span aria-hidden>→</span>
        </Link>
        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          Demo dataset. Fares, headways and amenities are estimates pending official Maha-Metro data.
        </p>
        <button onClick={resetDemo} className="btn-quiet mt-3 h-7 px-2 font-mono text-[11px]">
          reset demo data
        </button>
      </div>
    </aside>
  );
}

function MobileHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur lg:hidden">
      <div className="flex items-center justify-between px-4 pb-2 pt-3">
        <Wordmark compact />
        <ClientOnly>
          <Clock compact />
        </ClientOnly>
      </div>
      <div className="px-4 pb-2.5">
        <StatusStrip />
      </div>
    </header>
  );
}

function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/92 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <div className="grid grid-cols-5">
        {NAV.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium transition-colors ${
                active ? "text-ink" : "text-muted"
              }`}
            >
              {active && <span className="absolute top-0 h-[2px] w-9 rounded-full bg-aqua" />}
              <Icon size={19} strokeWidth={active ? 2.2 : 1.7} className={active ? "text-aqua" : ""} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  useSeedOnce();
  useDemoTicker();
  useServiceWorker();

  return (
    <div className="min-h-screen">
      <SideRail />
      <MobileHeader />
      <main className="px-4 pb-32 pt-5 lg:ml-[228px] lg:px-8 lg:pb-20 lg:pt-8">{children}</main>
      <TabBar />
      <LiveFeedSync />
      <DemoBar />
      <footer className="hidden px-8 pb-8 pt-2 text-[11px] leading-relaxed text-muted lg:ml-[228px] lg:block">
        {META.label} — compiled {META.compiled} from {META.sources.join(" · ")}.
      </footer>
    </div>
  );
}
