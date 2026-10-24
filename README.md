# MetroMind — the Pune Metro AI super-app

**Tell it your goal. Read the reasoning.** MetroMind is a commute copilot for the Pune Metro:
it plans constraint-aware journeys across both lines, reasons over community crowd reports and
live disruptions, explains every recommendation in plain language, and pairs it with crowd
intelligence, safety triage, accessibility guidance and a commuter board.

> Built for **Codex Dayline** (one-day AI build sprint on the Pune Metro) — **Urban Mobility**
> track, with Civic & Community elements (SafeStreets, ConnectIQ-style builder matching).
> Status: **local-runnable demo**. Deploy: `npx vercel` (see below) — no API key required to run.

---

## Problem

Pune's metro is growing faster than the information riders need. First-time riders don't know
which exit or which line; daily commuters don't know how crowded the next platform will be;
and when something goes wrong, there is no single place that *explains* what to do. Qualitative,
honest framing — no ridership statistics are claimed anywhere in this project.

## Solution (30-second pitch)

MetroMind is one app with five modules sharing one data core (stations, lines, live state).
You state a goal — *"Ramwadi → Deccan Gymkhana, arrive by 9:30, budget ₹50, avoid crowds"* —
and it returns three explained plans: **Fastest**, **Calmer ride** and **Just-in-time**, each
with per-leg crowd forecasts, fares and a one-sentence *why*. A God-mode **Demo Control** bar
injects delays and crowd spikes live, and the whole app re-reasons in front of you.

## Screenshots (demo data throughout)

| | |
|---|---|
| ![home](docs/screenshots/01-home-desktop.png) | ![copilot](docs/screenshots/02-copilot-killer-query.png) |
| ![deadline](docs/screenshots/03-copilot-deadline-broken.png) | ![crowd](docs/screenshots/04-crowdcast-report.png) |
| ![mobile](docs/screenshots/05-home-mobile-390.png) | ![station](docs/screenshots/07-station-district-court.png) |

More in `docs/screenshots/` (safety triage, community builders, guide).

## Modules

| Module | Route | What it does | Demo flow |
|---|---|---|---|
| **Mission Control** | `/` | Simulated network clock, per-line status strip, live schematic map with crowd halos, quick actions, community activity feed | Open home; watch the map halos react to a crowd spike |
| **M1 · Commute Copilot** | `/copilot` | Constraint chips (arrive-by, budget, avoid crowds, step-free) → 3 explained timing plans over a Dijkstra engine; live disruption re-planning | Killer query → inject *aqua +15′ delay* twice → read the *Deadline broken* panel |
| **M2 · CrowdCast** | `/crowd` | Station × 15-min-band heatmap, one-tap anonymous reports (Empty/Moderate/Packed), 15-minute half-life decay, confidence + freshness | One tap → heatmap + Copilot badges update everywhere |
| **M3 · Rescue Grid + SafeStreets** | `/safety` | Incident form → control-room queue ranked by triage score (severity, people affected, footfall, recency) with recommended actions; street-hazard risk map + summary | Submit an incident; watch the queue re-rank and explain itself |
| **M4 · Station Guide / AccessWay** | `/guide`, `/station/[id]` | 5-step first-rider guide in EN/हिंदी/मराठी, per-station pages (exits, parking, accessibility, first/last mile, demo departures board, crowding now) | Tap any station on any map |
| **M5 · Community Connect** | `/community` | Lost & Found board with search, travel-buddy matcher with *why matched*, ConnectIQ-style builder matching, station events | Post an item; toggle skills in Builders and watch match scores |

## Architecture

```mermaid
flowchart LR
  A[data/pune-metro.json + seeds<br/>DEMO DATASET] --> B[lib/ engine<br/>graph · routing · fare · crowd · triage · explain]
  B --> C[Zustand stores<br/>live · crowd · rescue · community · safe · prefs<br/>localStorage-persisted]
  C --> D[App Router pages<br/>home · copilot · crowd · safety · guide · community · station]
  B --> E[/api/copilot<br/>GLM via z.ai · 3s timeout]
  E -->|failure / no key| F[template explanations<br/>offline AI mode]
  E --> D
  G[Demo Control bar<br/>inject delays · spikes · sim clock] --> C
```

The engine in `lib/` is pure TypeScript with no framework imports — 28 vitest tests cover
routing constraints, fare capping, crowd decay, triage ranking and persistence.

## Data disclaimer

**DEMO DATASET** — station lists follow the operational Aqua (Vanaz ↔ Ramwadi, 16 stations) and
Purple (PCMC Bhavan ↔ Swargate, 14 stations) lines with the single District Court interchange,
compiled from public sources (punemetrorail.org, Wikipedia) on 2026-10-24. Fares (₹10 + ₹2/stop,
cap ₹35), the 10-minute headway, the 06:00–22:30 service window, amenities and coordinates are
**estimates** and labelled as such in the UI. Crowd reports and incidents are simulated seeds
plus local-only user input. Nothing here is a real-time Maha-Metro feed.

## Quickstart

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 28 engine tests (vitest)
npm run build && npm start   # production build
```

Optional AI upgrade — the app is fully functional without it:

```bash
cp .env.example .env.local   # set ZAI_API_KEY (z.ai / GLM, server-side only)
```

With no key (or after 3s / on any error) every AI call falls back instantly to deterministic
rule-based explanations, badged *offline AI mode* in the UI.

Deploy on Vercel: import the repo, add `ZAI_API_KEY` as an env var, deploy. `npx vercel` works too.

## 90-second demo script

1. **0:00–0:10** — *"Pune's metro is growing faster than the information riders need. MetroMind
   closes that gap — one app, live conditions, plain-language reasoning."*
2. **0:10–0:35** — Copilot → **run the killer query**. Read one *why* line aloud. Open the
   trade-off table; tap a station chip on the map → station page.
3. **0:35–0:55** — THE MOMENT: Demo Control → *aqua +15′ delay*. Cards recompute live (+15 min
   chips, updated arrivals). Press it again → the **Deadline broken** panel: *"earliest arrival is
   now 09:36 — the engine won't pretend otherwise."* Relax the deadline → instant re-plan.
4. **0:55–1:15** — CrowdCast → one-tap *Packed* report → flash + heatmap. Back in Copilot the
   badge matches. Then Safety: ranked triage queue with recommended actions; Community: builder
   match cards.
5. **1:15–1:30** — *"Offline-first, honest demo data, engine is unit-tested, ready for a real
   Maha-Metro feed."*

## Roadmap

Real GTFS/Maha-Metro feed integration · AFC-gate-based crowding · authority dashboards for the
rescue grid · full HI/MR app-wide i18n · PWA offline trip caching · multimodal (PMPML/BRTS)
routing · photo verification for SafeStreets.

## License

MIT — see [LICENSE](LICENSE).
