# StretchQuest 🧘🔥

A gamified stretching-routine tracker — Duolingo-style streaks, XP and badges
for guided, timed stretch sessions. Built for climbers and runners, with a
custom routine builder for everything else.

## Features

- **Guided session player** — per-stretch countdown, left/right side switching,
  rest transitions, pause/skip/back, audio cues (synthesized, no files), screen
  wake-lock so your phone stays on.
- **Gamification** — daily streaks with auto-applied streak freezes, XP with a
  level curve and flavor titles, a daily goal ring, 14 achievements, confetti.
- **Content** — 32 curated stretches and 7 prebuilt routines (3 climbing,
  3 running, 1 full-body), plus a builder for your own routines.
- **PWA** — installable on iOS/Android home screens, fully offline after the
  first visit. All data is stored locally in the browser (no account, no
  backend). Architected so it can later be wrapped with Capacitor for the app
  stores.

## Getting started

```bash
npm install
npm run dev        # dev server
npm test           # vitest unit tests (streak/XP/timer logic)
npm run build      # type-check + production build
npm run preview    # serve the production build (test the PWA/offline)
npm run icons      # regenerate PNG icons from public/icons/icon.svg
```

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which tests, builds and
publishes to the `gh-pages` branch. The build's base path is derived from the
repository name, so the app works under `https://<user>.github.io/<repo>/`
without any config changes.

**One-time setup:** repo Settings → Pages → Source: *Deploy from a branch* →
branch `gh-pages`, folder `/ (root)`. GitHub Pages is free on public repos.

## Architecture notes

- `src/game/` and `src/session/` are pure logic modules (unit-tested, no React).
- State lives in three zustand stores (`src/store/`) persisted to localStorage
  behind a small `StorageAdapter` interface — swap it out to add cloud sync.
- Timer uses real `Date.now()` deltas, so timing survives tab throttling.
- Routing is hash-based to avoid 404s on GitHub Pages and to work offline.
