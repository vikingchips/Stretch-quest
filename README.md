# StretchQuest

A stretching-routine tracker with streaks, XP and badges for guided, timed
stretch sessions. Built for climbers and runners, with a custom routine builder
for everything else.

## Features

- **Guided session player** — countdowns for timed work, self-paced counting-up
  for rep work, left/right side switching, sets, rest transitions,
  pause/skip/back, audio cues (synthesized, no files), screen wake-lock.
- **Progress** — daily streaks with auto-applied streak freezes, XP with a level
  curve and flavor titles, a one-session-a-day goal with a week strip, 14
  achievements, and weekly dose per body area against the point where
  flexibility gains flatten out.
- **Content** — 66 exercises and 6 prebuilt routines, plus a builder for your
  own.
- **PWA** — installable on iOS/Android home screens, fully offline after the
  first visit. Architected so it can later be wrapped with Capacitor for the
  app stores.
- **Accounts** — a name and a four-digit code. Required once the build has
  Supabase credentials; your history lives on the account rather than the
  device. No email anywhere. See below.
- **Friends** — share a link, follow each other, and see who is actually
  keeping their routine this week.
- **First-run tour** — four pages explaining the timing split, shown once,
  before the sign-in gate.
- **Animated figures** — the Daily Warp exercises play as a looping pose you
  can view from the front, at an angle, or side-on.
- **Finger strength** (optional) — hangboard training and testing against a
  Progressor-compatible force sensor, or a simulated one. Off by default. See
  below.

## Sync and accounts

Signing in is required in any build that has Supabase credentials. The gate
lives in `App.tsx`, in front of the router: it replaces the content without
navigating, so the URL survives it and someone arriving on a shared friend
link lands on that link once they are through.

A build **without** credentials stays local-only and ungated — otherwise
`npm run dev` without secrets would be a brick. localStorage remains the
working copy either way; the cloud is a backup, not the source of truth, so
the app keeps running offline once signed in.

Sign-in is **a name and a four-digit code**. No email is involved anywhere —
which is the point, because every free email path in 2026 dead-ends without a
verified domain: Supabase's built-in sender only delivers to members of the
project's organization, Resend needs a verified domain to reach anyone but
you, and Brevo refuses free sender domains outright.

**This is not real security.** Four digits against a guessable name is 10,000
combinations. It is a deliberate trade for stretching history, and the account
panel says so where people choose a code. Anything more sensitive needs a
different scheme.

Under the hood it is ordinary Supabase password auth. A name is folded to a
synthetic address that is never sent to — an identifier, not a mailbox. Real
sessions, token refresh and `auth.uid()`-scoped RLS keep working exactly as
they would with email. See `src/sync/identity.ts`.

**The domain is not invented.** It is the host of the Supabase project itself,
derived from `VITE_SUPABASE_URL` — so `mans@abcdef.supabase.co`. That is not
cosmetic: Supabase rejects any address whose domain does not resolve, and both
obvious choices fail that test. RFC 2606's reserved `.invalid`, the
semantically correct answer for an address that must never exist, is NXDOMAIN;
so is any made-up name like `stretchquest.app`. The project host resolves by
definition, since the app is already talking to it, and needs no configuration.

Nothing is ever delivered there: the app has no mailer, and step 3 below turns
Supabase's confirmation mail off. `VITE_IDENTITY_DOMAIN` overrides the default
if you ever need it to.

Names fold to a stable key: lowercase, accents stripped, everything else
collapsed to dashes. "Måns Brandt", "måns brandt" and "Måns-Brandt" are one
account. Two people who want the same name cannot both have it.

When `VITE_SUPABASE_URL` and a public key are absent, the Supabase SDK is
tree-shaken out of the bundle entirely. When present it loads as a separate
~53 kB chunk.

**Setup, once:**

1. Create a project at [supabase.com](https://supabase.com) (the free tier is
   enough).
2. Run `supabase/schema.sql` in the project's SQL editor. It creates one table
   and its row-level security policies.
3. Authentication → **Sign In / Providers** → expand **Email**: leave the
   provider enabled and turn **Confirm email off**. Without that, sign-up waits
   on a confirmation nobody will ever receive — the addresses are synthetic.
4. Add the project URL and the public key as repository secrets named
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (Settings → Secrets
   and variables → Actions). The deploy workflow picks them up.

   Both live under Project Settings → **API Keys**, or behind the **Connect**
   button at the top of the dashboard. Take the **publishable** key
   (`sb_publishable_…`), not the legacy `anon` one: Supabase retires anon and
   service_role keys at the end of 2026. `VITE_SUPABASE_ANON_KEY` still works
   as a fallback if a project only has the old format, and the publishable key
   wins when both are set.

No SMTP, no email templates, no redirect URLs, no domain.

The publishable key is designed to ship in client code. Row-level security is
what keeps one account's rows away from another's — every policy in the schema
is scoped to `auth.uid()`.

Sign-ups are open: anyone can create an account. To close that, drop the
`createAccount` path in `src/sync/authStore.ts` and add users from the Supabase
dashboard instead.

**Friends.** `user_state` stays strictly private. Everything a friend can see
lives in a separate `profiles` row — name, streak, longest streak, xp, last
active day, and a seven-character week pattern — which each client writes for
itself on sync. The split is deliberate: no policy ever has to reason about
which fields inside a private JSON blob are safe to expose.

Your share link is `#/add/<your-name-slug>`; opening it sends a friend
request, and accepting creates the friendship. Two things go through
`security definer` functions rather than policies, because a row-level check
cannot express them: resolving a name to a user without exposing the whole
profiles table (`find_profile_by_slug`), and accepting a request atomically
with deleting it (`accept_friend_request`).

**How sync behaves.** Signing in pulls the remote row, merges it into local
state, and pushes the merged result back; later changes push on a two-second
debounce. The merge (`src/sync/merge.ts`, unit-tested) is deliberately
additive — sessions union by id, badge unlocks keep the earliest timestamp,
date sets union, scalars take the larger value. Signing in on a second device
can therefore never delete history. Sign-out leaves local data untouched.

## Animated poses

The figure in a session is a skeleton of eighteen joints stored in 3D and
projected to 2D (`src/anim/skeleton.ts`). That is deliberately not a model:
there is no mesh, no texture and no asset, so one pose definition serves every
camera angle instead of needing a drawing per view, and the whole system adds
nothing to the bundle beyond a few numbers.

Poses are written as **direction vectors, not positions** — `thighL: [0.3,
0.35, 1.05]` rather than a coordinate. Bone lengths come from the rig, so a
limb cannot stretch no matter how a pose is written. Axes are x right, y down
to match SVG, z toward the viewer; the figure faces +z.

Each exercise in `src/anim/poses.ts` is two keyframes that the figure eases
between, which is what most mobility work is: an oscillation into and out of a
position. It also carries the angle and elevation it reads best from — floor
and seated work is illegible without the camera looking down at it.

Four things carry most of the legibility, and all four are cheap:

- **A ground line.** One hairline under the figure. A lying or seated pose is
  close to unreadable without it. Drawn as a baseline below the whole cycle
  rather than as the true floor plane, which from a raised camera spreads
  vertically with depth and would cut across the near foot.
- **Every keyframe stands on that floor** (`grounded` in `poses.ts`). Poses are
  authored as angles, so where the chain of bones happens to end is an accident
  — without this the squat keyframe hangs below the standing one it eases from
  and the figure sinks through the ground and bobs back out.
- **One fit transform per cycle, not per frame** (`fitTransform`). Fitting each
  frame on its own rescales the whole body around a swinging leg.
- **Floor poses are turned on the spot** (`turned`). The three view buttons are
  absolute angles, so a body laid along one world axis is inevitably end-on
  from one of them, and a bridge seen down its own length is a scribble. On a
  diagonal its long axis keeps 82%, 100% and 71% of its length across the three
  views.

Positive elevation means the camera is above the horizon: nearer points sit
lower on the screen. The inverse convention puts it under the floor, and the
poses that suffer are exactly the ones that need elevation most.

**Authoring is done by eye, not by imagination.** `npx vite-node
scripts/pose-sheet.ts` renders every pose at three angles, both keyframes, into
`/tmp/pose-sheet.png`. Tuning vectors without looking at that sheet does not
work; the script mirrors what `PoseFigure` draws so the sheet can be trusted.

Coverage is the eight Daily Warp exercises, and all eight read from the front
and at an angle. The side view of the two floor movements is the weakest — a
stick figure lying down has little left to show once it is edge-on. Everything
without a pose falls back to `BodyMark`, the abstract figure that highlights
the target area.

## Finger strength

An optional second half of the app: a load cell between a one-hand hangboard
and the ceiling, an ESP32-C3 that streams force over Tindeq's open Progressor
BLE API, and a trainer built on top of it. The firmware lives in
[`firmware/`](firmware/) in this repo; the brief for the whole project is
[`BRIEF.md.md`](BRIEF.md.md).

**It is off until you turn it on**, in Settings → modules. The stretching app
is complete without it, and someone arriving on a shared friend link should
see that app rather than a hangboard tab. Turned on, `grip` replaces `awards`
in the nav — six tabs is too many on a phone, and awards is still reachable
from home. To ship it on for everyone, flip `fingerModuleEnabled` in
`DEFAULT_SETTINGS`.

**No hardware needed to try it.** `src/finger/mockSource.ts` is a simulated
cell — 80 Hz, force approached with a time constant, noise that grows under
load — behind the same `ForceSource` interface as the real device. It is a
product feature, not a test double: pick "use a simulated device" and a slider
drives the pull.

**Web Bluetooth only works in Chrome** on Android and desktop. No iOS browser
implements it and none is going to, so there is deliberately no workaround
here.

The original plan was to send iPhone owners to the official Tindeq app with
the same device. **That does not work**: their app finds a DIY device, then
rejects it as not being in their database of sold hardware. Getting past that
would mean claiming a real unit's identity, which is not something an openly
published protocol invites. So the device is Android and desktop Chrome only,
and the simulated source is what everyone else gets.

### The protocol it implements

Two programs, both scaled to a measured one-hand max:

| Program | Band | Structure | Frequency |
|---|---|---|---|
| Abrahangs | 30–50% of max | 6 × 10 s / 20 s, both grips, both hands | twice a day, 6 h apart |
| Max hangs | 85–95% of max | 6 × 10 s / 2 min, half crimp | 2–3 × a week |

The combination is the point — it was the source study's only large effect.
Note that Abrahangs sits at about **40% of max**, not the 70–80% that
circulates: that figure is a percentage of pull force with both feet on the
floor, a different measurement of a different thing. Low load is the
protocol, not a compromise in it, and the summary screen says so when a
session comes in above the band.

Three rules are enforced in code rather than left to the copy:

- **Bands come from that hand's own max.** There is no validated conversion
  between hands, so a hand without a measured max is skipped, never inferred.
- **Grade estimates only for half crimp on the ~20 mm edge**, only as an
  interval, always with their confidence and the line that finger strength
  explains about half the variance in boulder grade. `estimateGrade` returns
  null otherwise and `gradeBlocker` says which rule stopped it, so the screen
  explains itself instead of going quiet. Smaller edges are fine to train on;
  there is simply no normative data to grade them against.
- **Peak force is smoothed** before it counts. A 24-bit ADC at 80 SPS will
  produce a single-sample spike eventually, and an unsmoothed peak would
  enshrine it as your max and set every future session's load from it.

### How it is wired in

- A finished hang session goes through the same `completeSession` as a stretch
  session, with a synthetic routine in the `fingers` category. Streak, daily
  goal, XP, badges and the friends week-strip therefore work with no new code.
  Weekly dose ignores routine ids it does not recognise, so hang time cannot
  pollute it, and Stats keeps it out of the figure labelled "stretched".
- **Samples never touch React.** They arrive eighty times a second;
  `sourceManager` holds the stream outside the tree, `ForceGraph` writes its
  path attribute from a rAF loop, and the session reducer is fed one tick's
  batch at a time. Only connection status goes through a store.
- Sync is a `finger` jsonb column on the existing `user_state` row rather than
  tables of its own — that row is already private, already covered by the four
  `auth.uid()` policies, and already merged in one place. The merge is
  additive like the rest: sessions and tests union by id, and maxes key on
  hand, grip and edge, with the newer test winning even when it is lower,
  because that is what retesting is for.
- `src/finger/progressorProtocol.ts` is the wire format on its own, testable
  against hand-built buffers rather than against hardware. It was verified by
  reading BigBanger's MicroPython firmware as a specification.

### Games

Four pixel-art games live under `grip → games`, each one a training stimulus
in a costume: **comet run** (force is altitude — continuous holds, mostly in
the low-middle band, no flap to spam), **pulsar** (the 7:3 repeater protocol
as a rhythm game), **orbit decay** (a survival hold above a sinking line that
fails softly and leaves a 1 Hz endurance curve behind), and **soft landing**
(lunar lander where hovering costs the abrahangs band, and every landing makes
gravity heavier).

Every visit starts with a calibration pull — one hard pull whose peak becomes
100% for that hand today — so the games need no max test and never write to
the training max. None of them reward yanking, all of them end at low force
rather than demanding a final effort on cooked fingers, and scores are kept
per game and hand with the calibration recorded alongside. Games pay a little
xp through the ordinary session path (primer weight) and hold the streak, but
they never tick the daily plan.

A game is a pure simulation plus a pixel scene behind one shell
(`src/routes/finger/games/GamePlayPage.tsx`): `src/finger/games/<name>.ts`
exports a `GameSpec` — init/step/score plus two draw functions — and registers
in `src/finger/games/index.ts`. Sprites are character grids in code, drawn at
120×160 logical pixels and integer-scaled with smoothing off.

**If you already ran `supabase/schema.sql`,** run it again — the new column is
an idempotent `alter table` and everything else is `if not exists`. There is
no rush and no ordering to get right: a build that meets a project without the
column falls back to syncing everything else, so stretch sessions and streaks
keep working, and finger data starts syncing by itself once the column exists.

## The protocol

The built-in routines are not a generic stretching library. They follow one
split, and most of the data model exists to express it:

**Dynamic work goes before activity. Range-building work is kept away from
performance.** Dynamic stretching buys temporary range and costs nothing on the
wall; long static holds build lasting range but cost acute force output. Putting
them in the same session is the mistake the routine set is designed to avoid.

| Routine | When | Character |
|---|---|---|
| Daily Warp | any day; also the pre-climb warm-up | The six-minute primer. Never hard. |
| Hip Nebula | 2–3 × a week, rest or easy days | Heavy. Loaded end-range for frogging. |
| Lower Orbit | 1 × a week, rest day | Heavy. Flexion, extension, dorsiflexion. |
| Stride Ignition (+ Long) | before running | Raise, activate, mobilise, potentiate. |
| Deep Dive | rest days, or 4–6 h after climbing | Slower recovery work: eccentrics, long holds, calves. |

**There is a second split, and it is about dose rather than timing.** A daily
primer and a training session used to be the same routine — one that was too
long to do every day and too light to change anything. They are separate now:
six minutes that are never hard, and two sessions that unmistakably are.

`Routine.effort` carries that into XP (`EFFORT_WEIGHT` in `src/game/xp.ts`),
weighting the work-dependent terms so a primer pays about 28 and a heavy
session about 90–100. The daily-goal and streak-milestone bonuses are *not*
weighted: turning up is worth the same whichever routine got you there. The
streak itself is deliberately indifferent — any completed routine holds it, so
a heavy session is never something the streak can pressure you into.

Heavy routines carry a badge in the list and a hard caution, because starting
one by accident the day before a project costs you the project.

Things the model has to represent, and where:

- **`Modality`** on every exercise (`dynamic`, `static`, `loaded`, `eccentric`,
  `activation`, `potentiation`, `isometric`, `pails-rails`). It drives which
  routine an exercise belongs in and what the session screen calls the current
  phase — "lower slowly" for a Nordic curl, "hold" for a couch stretch, "push,
  then pull" for the loaded frog.
- **`RoutineStep.restSec`** — heavy work sets its own rest. A minute between
  loaded sets is the difference between training and a circuit, and it cannot
  come from a global setting meant for stretches.
- **`Exercise.levels`** — ordered progressions, picked during the session and
  remembered (`UserProgress.exerciseLevels`). Only the Copenhagen has them so
  far, because for that one the lever *is* the training variable: too short is
  pointless, too long is a groin strain.
- **Rep work is self-paced** (`Exercise.mode === 'reps'`). The clock counts up
  and waits for you rather than rushing an eccentric; `SessionEvent.ADVANCE`
  ends the set. Nordic curls are the reason this exists.
- **Sets** (`RoutineStep.sets`) with rest between them, separate from the rest
  between exercises.
- **`Routine.guidance` and `Routine.caution`** — timing rules shown before you
  start. The running routines carry a hard "no static calf or hamstring work
  beforehand"; Deep Dive carries "not before climbing".
- **The daily goal is one session**, not a minute count (`src/game/dailyGoal.ts`).
  Routines run 9–13 minutes of work depending on which one you pick, so a
  minutes target passed or failed the same honest effort depending on the day.
  Volume is a weekly, per-muscle question instead.
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
  behind a small `StorageAdapter` interface. Cloud sync (`src/sync/`) layers on
  top of that rather than replacing it: local storage stays the working copy.
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
