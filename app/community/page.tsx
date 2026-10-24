"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { DemoNote, EmptyState, PageHeader, Segmented } from "@/components/ui";
import { SORTED_STATIONS, stationName } from "@/lib/data";
import { explainBuddyMatch, explainBuilderMatch } from "@/lib/explain";
import { relTime } from "@/lib/time";
import { useCommunityStore } from "@/store/community";
import { useLiveStore } from "@/store/live";
import { usePrefsStore } from "@/store/prefs";

type Tab = "lostfound" | "buddy" | "builders" | "events";

const SKILL_OPTIONS = [
  "react", "typescript", "nextjs", "node", "python", "ml", "data", "flutter",
  "firebase", "postgres", "api", "maps", "design", "ui", "cv", "research", "content", "payments",
];

function LostFound() {
  const simNow = useLiveStore((s) => s.simNow);
  const posts = useCommunityStore((s) => s.lostFound);
  const addLostFound = useCommunityStore((s) => s.addLostFound);

  const [kind, setKind] = useState<"lost" | "found">("lost");
  const [item, setItem] = useState("");
  const [stationId, setStationId] = useState("district-court");
  const [detail, setDetail] = useState("");
  const [nickname, setNickname] = useState("");
  const [query, setQuery] = useState("");

  const filtered = posts.filter(
    (p) =>
      query === "" ||
      p.item.toLowerCase().includes(query.toLowerCase()) ||
      stationName(p.stationId).toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <div className="card h-fit p-4">
        <p className="kicker mb-3">Post to the board</p>
        <div className="space-y-3">
          <div className="flex gap-2">
            <button onClick={() => setKind("lost")} className={(kind === "lost" ? "chip-on" : "chip") + " flex-1 justify-center"}>
              I lost something
            </button>
            <button onClick={() => setKind("found")} className={(kind === "found" ? "chip-on" : "chip") + " flex-1 justify-center"}>
              I found something
            </button>
          </div>
          <input className="field" placeholder="Item (e.g. black umbrella)" value={item} onChange={(e) => setItem(e.target.value)} />
          <select className="field" value={stationId} onChange={(e) => setStationId(e.target.value)}>
            {SORTED_STATIONS.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <textarea className="field min-h-[56px]" placeholder="Detail — where exactly, when" value={detail} onChange={(e) => setDetail(e.target.value)} />
          <input className="field" placeholder="Display nickname (no PII)" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={24} />
          <button
            onClick={() => {
              if (!item.trim() || !nickname.trim()) return;
              addLostFound({ kind, item: item.trim(), stationId, detail: detail.trim() || "—", nickname: nickname.trim() }, Date.now());
              setItem("");
              setDetail("");
            }}
            className="btn-primary w-full"
          >
            post anonymously
          </button>
        </div>
      </div>
      <div>
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="field !pl-9"
            placeholder="Search the board — item or station"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {filtered.length === 0 ? (
          <EmptyState title="Nothing matches" body="Try a different search, or post the first entry for this item." />
        ) : (
          <ul className="space-y-2.5">
            {filtered.map((p) => (
              <li key={p.id} className="card anim-rise flex items-start gap-3 p-3.5">
                <span
                  className="rounded px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-wider"
                  style={{
                    background: p.kind === "lost" ? "rgba(226,80,80,0.12)" : "rgba(38,166,110,0.12)",
                    color: p.kind === "lost" ? "var(--danger)" : "var(--ok)",
                  }}
                >
                  {p.kind}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium text-ink">{p.item}</p>
                  <p className="text-[12px] text-muted">
                    {stationName(p.stationId)} · {p.detail}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[11.5px] text-dim">{p.nickname}</p>
                  <p className="num text-[10.5px] text-muted">{relTime(p.at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4">
          <DemoNote>DEMO DATA — posts live only in this browser. No accounts, no PII beyond the nickname you type.</DemoNote>
        </div>
      </div>
    </div>
  );
}

function Buddy() {
  const simNow = useLiveStore((s) => s.simNow);
  const requests = useCommunityStore((s) => s.buddyRequests);
  const addBuddy = useCommunityStore((s) => s.addBuddy);

  const [nickname, setNickname] = useState("");
  const [stationId, setStationId] = useState("vanaz");
  const [time, setTime] = useState("08:30");
  const [windowMin, setWindowMin] = useState(20);
  const [direction, setDirection] = useState("toward city");
  const [mine, setMine] = useState<{ id: string } | null>(null);

  function post() {
    if (!nickname.trim()) return;
    const hhmm = time;
    const timeMin = Number(hhmm.split(":")[0]) * 60 + Number(hhmm.split(":")[1]);
    const req = {
      nickname: nickname.trim(),
      stationId,
      direction,
      timeMin,
      windowMin,
      note: "Looking for a travel buddy.",
    };
    addBuddy(req, Date.now());
    setMine({ id: "mine" });
  }

  const matches = useMemo(() => {
    if (!mine) return [];
    const me = requests[0];
    if (!me) return [];
    return requests
      .slice(1)
      .filter((r) => r.stationId === me.stationId)
      .map((r) => ({ r, overlap: Math.min(r.windowMin, me.windowMin) - Math.abs(r.timeMin - me.timeMin) }))
      .filter((m) => m.overlap > 0)
      .sort((a, b) => b.overlap - a.overlap)
      .slice(0, 4);
  }, [mine, requests]);

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <div className="card h-fit p-4">
        <p className="kicker mb-3">Find a travel buddy / carpool</p>
        <div className="space-y-3">
          <input className="field" placeholder="Display nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={24} />
          <select className="field" value={stationId} onChange={(e) => setStationId(e.target.value)}>
            {SORTED_STATIONS.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <select className="field" value={direction} onChange={(e) => setDirection(e.target.value)}>
              <option>toward city</option>
              <option>toward ramwadi</option>
              <option>toward pcmc</option>
              <option>toward swargate</option>
            </select>
            <input type="time" className="field num !w-[130px]" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <label className="block">
            <span className="kicker mb-1.5 block">Flexible by · ±{windowMin} min</span>
            <input type="range" min={5} max={45} step={5} value={windowMin} onChange={(e) => setWindowMin(Number(e.target.value))} className="w-full accent-[var(--aqua)]" />
          </label>
          <button onClick={post} disabled={!nickname.trim()} className="btn-primary w-full">
            post request &amp; match
          </button>
        </div>
      </div>
      <div>
        {!mine ? (
          <>
            <p className="kicker mb-2">Open requests on the board</p>
            <ul className="space-y-2.5">
              {requests.map((r) => (
                <li key={r.id} className="card flex items-center justify-between gap-3 p-3.5">
                  <div>
                    <p className="text-[13.5px] font-medium text-ink">{r.nickname}</p>
                    <p className="text-[12px] text-muted">
                      {stationName(r.stationId)} · {r.direction} · {r.note}
                    </p>
                  </div>
                  <span className="num shrink-0 text-[11.5px] text-dim">
                    {String(Math.floor(r.timeMin / 60)).padStart(2, "0")}:
                    {String(r.timeMin % 60).padStart(2, "0")} ±{r.windowMin}′
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : matches.length === 0 ? (
          <EmptyState
            title="No overlapping windows yet"
            body="Your request is on the board. When another rider posts the same station with an overlapping time window, a match card appears here."
          />
        ) : (
          <ul className="space-y-2.5">
            {matches.map(({ r, overlap }) => (
              <li key={r.id} className="card anim-rise p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[13.5px] font-medium text-ink">
                    {r.nickname} <span className="text-muted">· {stationName(r.stationId)}</span>
                  </p>
                  <span className="num text-[11.5px] text-dim">
                    {String(Math.floor(r.timeMin / 60)).padStart(2, "0")}:
                    {String(r.timeMin % 60).padStart(2, "0")}
                  </span>
                </div>
                <p className="mt-1.5 rounded-md border border-aqua/20 bg-aqua/[0.06] px-3 py-2 text-[12.5px] text-dim">
                  <span className="mr-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-aqua">Why matched</span>
                  {explainBuddyMatch(requests[0], r, Math.round(overlap))}
                </p>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4">
          <DemoNote>DEMO DATA — matching is station + time-window overlap, computed on-device. Nothing leaves this browser.</DemoNote>
        </div>
      </div>
    </div>
  );
}

function Builders() {
  const simNow = useLiveStore((s) => s.simNow);
  const profiles = useCommunityStore((s) => s.profiles);
  const intros = useCommunityStore((s) => s.intros);
  const requestIntro = useCommunityStore((s) => s.requestIntro);
  const myProfile = usePrefsStore((s) => s.myProfile);
  const setMyProfile = usePrefsStore((s) => s.setMyProfile);

  const ranked = useMemo(() => {
    return profiles
      .map((p) => ({ p, match: explainBuilderMatch(myProfile, p) }))
      .sort((a, b) => b.match.score - a.match.score);
  }, [profiles, myProfile]);

  function toggleSkill(field: "skills" | "lookingFor", skill: string) {
    const cur = myProfile[field];
    const next = cur.includes(skill) ? cur.filter((s) => s !== skill) : [...cur, skill];
    setMyProfile({ ...myProfile, [field]: next });
  }

  return (
    <div className="space-y-6">
      <div className="card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="kicker">Your build profile</p>
            <p className="text-[12.5px] text-muted">Used only on-device to rank the matches below.</p>
          </div>
          <input
            className="field !w-48"
            placeholder="your nickname"
            value={myProfile.nickname}
            onChange={(e) => setMyProfile({ ...myProfile, nickname: e.target.value })}
            maxLength={24}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="kicker mb-2">I have</p>
            <div className="flex flex-wrap gap-1.5">
              {SKILL_OPTIONS.map((s) => (
                <button key={s} onClick={() => toggleSkill("skills", s)} className={myProfile.skills.includes(s) ? "chip-on" : "chip"}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="kicker mb-2">I need</p>
            <div className="flex flex-wrap gap-1.5">
              {SKILL_OPTIONS.map((s) => (
                <button key={s} onClick={() => toggleSkill("lookingFor", s)} className={myProfile.lookingFor.includes(s) ? "chip-on" : "chip"}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ul className="grid gap-2.5 md:grid-cols-2">
        {ranked.map(({ p, match }) => (
          <li key={p.nickname} className="card anim-rise flex flex-col p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[14px] font-semibold text-ink">{p.nickname}</p>
                <p className="font-mono text-[10.5px] uppercase tracking-wider text-muted">{p.track}</p>
              </div>
              {match.score > 0 && (
                <span className="num rounded-md bg-grape/12 px-2 py-1 text-[11px] text-grape">
                  {match.score}% fit
                </span>
              )}
            </div>
            <p className="mt-2 text-[13px] text-dim">“{p.idea}”</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {p.skills.map((s) => (
                <span key={s} className="chip !py-0.5">
                  {s}
                </span>
              ))}
            </div>
            <p className="mt-2.5 text-[12px] leading-relaxed text-muted">{match.why}</p>
            <div className="mt-auto flex items-center justify-between pt-3">
              <span className="num text-[10.5px] text-muted">posted {relTime(p.at)}</span>
              <button
                onClick={() => requestIntro(p.nickname)}
                disabled={intros.includes(p.nickname)}
                className={intros.includes(p.nickname) ? "btn-quiet h-8 text-[12px]" : "btn-grape h-8 text-[12px]"}
              >
                {intros.includes(p.nickname) ? "intro requested ✓" : "request intro"}
              </button>
            </div>
          </li>
        ))}
      </ul>
      <DemoNote>
        ConnectIQ-style matcher (Civic &amp; Community track): complementarity = skills-you-need ∩
        skills-they-have. DEMO DATA — profiles are seeded samples.
      </DemoNote>
    </div>
  );
}

function Events() {
  const simNow = useLiveStore((s) => s.simNow);
  const events = useCommunityStore((s) => s.events);
  return (
    <ul className="space-y-2.5">
      {events.map((e) => (
        <li key={e.id} className="card p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[14px] font-semibold text-ink">{e.title}</p>
            <span className="num text-[11.5px] text-warn">{e.whenLabel}</span>
          </div>
          <p className="mt-1 text-[12.5px] text-muted">
            {stationName(e.stationId)} · {e.detail}
          </p>
          <p className="num mt-1 text-[10.5px] text-muted">listed {relTime(e.at)}</p>
        </li>
      ))}
    </ul>
  );
}

export default function CommunityPage() {
  const [tab, setTab] = useState<Tab>("lostfound");
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        kicker="M5 · Community connect"
        title="The part riders run themselves."
        lede="Lost & found, last-mile buddies, builder matching for the sprint, and station events — anonymous, local-first, no accounts."
        aside={
          <Segmented
            label="Community section"
            value={tab}
            onChange={setTab}
            options={[
              { value: "lostfound", label: "Lost & found" },
              { value: "buddy", label: "Buddy up" },
              { value: "builders", label: "Builders" },
              { value: "events", label: "Events" },
            ]}
          />
        }
      />
      {tab === "lostfound" && <LostFound />}
      {tab === "buddy" && <Buddy />}
      {tab === "builders" && <Builders />}
      {tab === "events" && <Events />}
    </div>
  );
}
