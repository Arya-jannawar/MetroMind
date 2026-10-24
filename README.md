<p align="center">
  <img src="docs/assets/banner.svg" alt="MetroMind — an AI commute copilot for the Pune Metro, by Team UrbanSync" width="100%" />
</p>

# MetroMind — the Pune Metro AI super-app

**Tell it your goal. Read the reasoning.** MetroMind is a commute copilot for the Pune Metro:
it plans constraint-aware journeys across both lines, reasons over community crowd reports and
live disruptions, explains every recommendation in plain language, and pairs it with crowd
intelligence, safety triage, accessibility guidance and a commuter board.

> Built for **OpenAI DevDay Exchange — Metro Hackathon Pune** (Codex Dayline, one-day build
> sprint on the metro), **Urban Mobility** track. Status: **local-runnable demo** that upgrades
> to a live feed without code changes (see [Going live](#going-live-operators--authorities)).

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
| **Operations · Integrations** | `/integrations` | Connect a live metro feed (endpoint + API key), poll interval, connection test, feed contract; AI key configuration | Paste an endpoint → *Test connection* → flip to *Live feed* |

## Going live (operators & authorities)

MetroMind ships with a deterministic demo dataset, but every module reads network conditions
through **one narrow seam**: line delays and per-station crowd levels in a shared live-state
store. The integration layer (`lib/livefeed.ts`, unit-tested) normalizes any JSON feed into
that seam — station matching by id or name, crowd as 0–1 or %, delays clamped, unmatched rows
skipped and counted, never guessed.

To run on real conditions:

1. Serve the [feed contract](#the-feed-contract) from a GTFS-RT converter, an authority
   gateway, or any ops JSON endpoint.
2. Set `LIVE_FEED_URL` + `LIVE_API_KEY` as server env vars (`.env.example` documents both), **or**
   configure an endpoint + key at runtime on `/integrations` for field pilots.
3. Flip to *Live feed*. The app polls server-side (no CORS, 4 s timeout), pushes normalized
   delays + crowd into the live store, and every surface — Copilot, CrowdCast, Safety, the map —
   re-reasons on live data with a **live feed** badge replacing the demo badge.

Failures degrade gracefully: a slow or erroring feed leaves the last known state up, records
the error on the Integrations page, and the demo dataset remains the offline default.

### The feed contract

```json
{
  "updatedAt": "2026-10-24T09:00:00+05:30",
  "lines": [
    { "id": "aqua",   "status": "delay", "delayMin": 12 },
    { "id": "purple", "status": "normal" }
  ],
  "stations": [
    { "id": "shivaji-nagar", "crowd": 0.72 },
    { "name": "Deccan Gymkhana", "crowd": 0.31 }
  ]
}
```

`"Shivaji Nagar"`, `"shivaji-nagar"` and `"SHIVAJI NAGAR"` all resolve to the same station;
`crowd` values above 1 are read as percentages. The full normalization rules and the honest
scope note (what "production ready" does and does not include) are on `/integrations` and in
[DECISIONS.md](DECISIONS.md).

## Architecture

```mermaid
flowchart LR
  A[data/pune-metro.json + seeds<br/>DEMO DATASET] --> B[lib/ engine<br/>graph · routing · fare · crowd · triage · explain]
  B --> C[Zustand stores<br/>live · crowd · rescue · community · safe · prefs · integrations<br/>localStorage-persisted]
  C --> D[App Router pages<br/>home · copilot · crowd · safety · guide · community · station · integrations]
  B --> E[/api/copilot<br/>GLM via z.ai · 3s timeout]
  E -->|failure / no key| F[template explanations<br/>offline AI mode]
  E --> D
  G[Demo Control bar<br/>inject delays · spikes · sim clock] --> C
  H[/api/live<br/>LIVE_FEED_URL + LIVE_API_KEY<br/>4s timeout · normalization] -->|delays + crowd| C
  I[Integrations page<br/>pilot endpoint + key · poll interval] --> H
```

The engine in `lib/` is pure TypeScript with no framework imports — 34 vitest tests cover
routing constraints, fare capping, crowd decay, triage ranking, live-feed normalization and
persistence.

## Data disclaimer

**DEMO DATASET** — station lists follow the operational Aqua (Vanaz ↔ Ramwadi, 16 stations) and
Purple (PCMC Bhavan ↔ Swargate, 14 stations) lines with the single District Court interchange,
compiled from public sources (punemetrorail.org, Wikipedia) on 2026-10-24. Fares (₹10 + ₹2/stop,
cap ₹35), the 10-minute headway, the 06:00–22:30 service window, amenities and coordinates are
**estimates** and labelled as such in the UI. Crowd reports and incidents are simulated seeds
plus local-only user input. Nothing here is a real-time Maha-Metro feed — until you connect one.

## Quickstart

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 34 engine + integration tests (vitest)
npm run build && npm start   # production build
```

Optional AI upgrade — the app is fully functional without it:

```bash
cp .env.example .env.local   # set OPENAI_API_KEY or ZAI_API_KEY (server-side only)
```

Explanations upgrade to model-written whys when a key is present (OpenAI or z.ai/GLM — both
speak the same wire format, `AI_PROVIDER` forces a choice). With no key (or after 3s / on any
error) every AI call falls back instantly to deterministic rule-based explanations, badged
*offline AI mode* in the UI. Note the AI key shapes the *wording* — live network data comes
from the feed integration above.

Deploy on Vercel: import the repo, add `OPENAI_API_KEY` or `ZAI_API_KEY` (+ `LIVE_FEED_URL` /
`LIVE_API_KEY` when going live) as env vars, deploy. `npx vercel` works too.

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

GTFS-RT converter service (the JSON contract is ready) · AFC-gate-based crowding · authority
dashboards for the rescue grid · full HI/MR app-wide i18n · PWA offline trip caching ·
multimodal (PMPML/BRTS) routing · photo verification for SafeStreets.

## Team UrbanSync

Built in one day at **OpenAI DevDay Exchange — Metro Hackathon Pune**, on and around the
Aqua Line, by:

**Arya Jannawar** · **Siddhant Pardeshi** · **Avani Jannawar**

| On stage at DevDay Exchange | Wristbands on, mid-sprint |
|---|---|
| <img src="docs/assets/team-stage.jpg" alt="Team UrbanSync on stage at the DevDay Exchange community event" width="420" /> | <img src="docs/assets/wristbands.jpg" alt="Team UrbanSync wristbands during the build" width="420" /> |

## License

MIT — see [LICENSE](LICENSE).
