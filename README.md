# StretchQuest

A stretching-routine tracker with streaks, XP and badges for guided, timed
stretch sessions. Built for climbers and runners, with a custom routine builder
for everything else.

## Features

- **Guided session player** — countdowns for timed work, self-paced counting-up
  for rep work, left/right side switching, sets, rest transitions,
  pause/skip/back, audio cues (synthesized, no files), screen wake-lock.
- **Progress** — daily streaks with auto-applied streak freezes, XP with a level
  curve and flavor titles, a daily goal ring, 14 achievements, and weekly dose
  per body area against the point where flexibility gains flatten out.
- **Content** — 52 exercises and 6 prebuilt routines, plus a builder for your
  own.
- **PWA** — installable on iOS/Android home screens, fully offline after the
  first visit. All data is stored locally in the browser (no account, no
  backend). Architected so it can later be wrapped with Capacitor for the app
  stores.

## The protocol

The built-in routines are not a generic stretching library. They follow one
split, and most of the data model exists to express it:

**Dynamic work goes before activity. Range-building work is kept away from
performance.** Dynamic stretching buys temporary range and costs nothing on the
wall; long static holds build lasting range but cost acute force output. Putting
them in the same session is the mistake the routine set is designed to avoid.

| Routine | When | Character |
|---|---|---|
| Daily Warp | any day, any time | The baseline. Covers both sports. |
| Hip Nebula (+ Long) | straight before climbing | Dynamic hip prep for high steps and drop knees. |
| Stride Ignition (+ Long) | before running | Raise, activate, mobilise, potentiate. |
| Deep Dive | rest days, or 4–6 h after climbing | Loaded eccentrics and long holds. |

This is also why the recovery routine exists at all: it lets a daily streak
survive without long static holds landing right before a climb.

Things the model has to represent, and where:

- **`Modality`** on every exercise (`dynamic`, `static`, `loaded`, `eccentric`,
  `activation`, `potentiation`). It drives which routine an exercise belongs in
  and what the session screen calls the current phase — "lower slowly" for a
  Nordic curl, "hold" for a couch stretch.
- **Rep work is self-paced** (`Exercise.mode === 'reps'`). The clock counts up
  and waits for you rather than rushing an eccentric; `SessionEvent.ADVANCE`
  ends the set. Nordic curls are the reason this exists.
- **Sets** (`RoutineStep.sets`) with rest between them, separate from the rest
  between exercises.
- **`Routine.guidance` and `Routine.caution`** — timing rules shown before you
  start. The running routines carry a hard "no static calf or hamstring work
  beforehand"; Deep Dive carries "not before climbing".
- **Weekly dose per area** (`src/game/dose.ts`) — flexibility gains flatten out
  around ten minutes per week per target muscle, so Stats shows seconds per area
  over a rolling week against that line rather than a lifetime total. Only
  built-in routines can be attributed to areas; a custom routine's composition
  is not stored on the session record.

Two figures in the copy are load-bearing and worth keeping accurate if the
content changes: the ~10 min/week/muscle plateau, and the ~48 reps/week Nordic
hamstring maintenance volume quoted in that exercise's tips.

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

## Design

Scandinavian minimalism: warm neutrals (birch white, charcoal, wool gray) with
pine green and fjord blue as the only accents, extralight/light type, hairline
rules instead of cards, and generous whitespace.

- **Type** — Jost (SIL OFL), self-hosted in `src/fonts/` so the PWA keeps its
  typography offline. Weights 200 and 300 only.
- **Tokens** — all color and font tokens live in the `@theme` block in
  `src/index.css`. The `-deep` color variants are the text-safe ones (>= 4.5:1
  on paper); the base tones are for fills, rings and marks only.
- **No emoji.** Icons are a hairline line-art set drawn on a 24x24 grid
  (`src/components/Icon.tsx`). Achievement emblems are abstract — dots, rings,
  arcs, polygons — rather than a pictogram per badge.
- **Exercise art** — `src/components/BodyMark.tsx` renders an abstract figure
  that dims everywhere except the region the stretch targets, derived from the
  exercise's `targetAreas`.
- **Motion** — fades at 700ms `ease-in-out`; no bounce, spring or scale
  feedback. A `prefers-reduced-motion` fallback in `src/index.css` disables
  animation globally.
