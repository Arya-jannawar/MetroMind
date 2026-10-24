# Judge Scorecard — MetroMind (self-judged per SUPER_PROMPT §8)

Judged as an Urban Mobility track entry at Codex Dayline. Scores cite evidence; hard gates are
binary. Verified 2026-10-24 on this working copy (Node 24, Windows).

## Scoring (85 / 100 → verdict: SHIP, one gate pending user action)

| Criterion | Score | Evidence |
|---|---|---|
| Innovation & originality | 12 / 15 | Consequence engine: goals → explained timing plans; honest "Deadline broken" state instead of fake reroutes; crowd reports feed routing across modules |
| Technical implementation | 17 / 20 | Pure-TS engine (`lib/`), Dijkstra over (station·line) states, 28 vitest tests green, clean `next build`, template fallback proven via API `"source":"template"` |
| UX & visual design | 13 / 15 | IBM Plex identity, ops-room dark theme, hand-built SVG network map, 390 px sweep clean, a11y roles/labels, motion ≤ 300 ms |
| Demo readiness | 18 / 20 | F1 killer query → 3 explained cards; F2 live delay injection → recompute + absorbed/deadline-broken banners; F3 one-tap report → heatmap + Copilot; God-mode bar; zero console errors across all pages |
| Impact & feasibility for Pune | 12 / 15 | Real rider problems (first ride, crowding, safety, last mile); buildable on a real feed; all claims qualitative |
| Repo & docs quality | 13 / 15 | README per appendix skeleton, DECISIONS.md (18 logged decisions), conventional commits, MIT, screenshots, secrets scan clean |

## Hard gates

| Gate | Result |
|---|---|
| G1 Build + tests green from clean state | ✅ 28/28 tests, build clean |
| G2 Deployed URL live, 5 modules ≤ 2 taps | ⏳ **Pending user action** — Vercel/Netlify deploy needs the owner's account auth. Local production build verified; deploy = `npx vercel` (README §Quickstart) |
| G3 Killer query works with NO API key | ✅ template fallback verified |
| G4 Live disruption visibly re-plans and explains | ✅ browser-verified (+15′/+30′ injections) |
| G5 Crowd report updates heatmap + Copilot | ✅ browser-verified (14→15 reports, flash) |
| G6 Zero console errors, full walkthrough | ✅ 9 routes + interactions, 0 errors |
| G7 No secrets in repo or history | ✅ scan clean, no `.env` ever committed |
| G8 Every simulated dataset visibly labelled | ✅ DEMO DATA / DEMO DATASET / sample badges |
| G9 README complete | ✅ |
| G10 LICENSE, .gitignore, .env.example | ✅ |
| G11 Mobile 390 px sweep | ✅ no horizontal scroll after fixes |
| G12 No fabricated claims | ✅ qualitative claims only; deviations logged |
