import { formatClock } from '../../lib/format';
import { drawSprite, hash2, type Palette } from './pixel';
import type { GamePhase, GameSpec } from './types';
import { GAME_BY_ID } from './types';

/**
 * orbit decay — a survival hold above a sinking line.
 *
 * The line only ever comes DOWN: it starts at 60% of the calibrated max and
 * decays like an orbit toward a low floor, so the game fails softly — when
 * the forearms give out the demand is already low, and the run ends at low
 * force instead of demanding a final max effort on cooked fingers. The force
 * curve it leaves behind is an endurance profile worth comparing across
 * weeks.
 */

export const DECAY = {
  /** Where the line starts, as a fraction of the calibrated max. */
  startFrac: 0.6,
  /** Where the decay bottoms out — the orbit never asks for less. */
  floorFrac: 0.12,
  /** Exponential decay time constant, seconds. */
  tauSec: 60,
  /** How long the pull may sit below the line before the orbit is lost. */
  graceSec: 1.2,
} as const;

/** The curve stops recording after six minutes; the run itself may go on. */
const CURVE_CAP = 360;

export function decayThreshold(t: number): number {
  return DECAY.floorFrac + (DECAY.startFrac - DECAY.floorFrac) * Math.exp(-t / DECAY.tauSec);
}

export interface DecayState {
  phase: GamePhase;
  t: number;
  force: number;
  /** Seconds spent continuously below the line. */
  below: number;
  /** Finished 1 Hz buckets: mean force fraction per whole run-second. */
  curve: number[];
  /** The bucket in progress. */
  bucketSum: number;
  bucketSec: number;
}

export function initDecay(): DecayState {
  return { phase: 'ready', t: 0, force: 0, below: 0, curve: [], bucketSum: 0, bucketSec: 0 };
}

export function stepDecay(state: DecayState, dt: number, force: number): DecayState {
  if (state.phase === 'over') return state;

  // You climb up to the line to enter orbit; the clock starts there.
  if (state.phase === 'ready') {
    if (force < DECAY.startFrac) return { ...state, force };
    return { ...state, phase: 'live', force };
  }

  const t = state.t + dt;

  // The endurance profile: accumulate the current bucket, and on rolling past
  // a second boundary push the finished bucket's mean. The shell clamps dt to
  // 50 ms, so a step never spans more than one boundary.
  let curve = state.curve;
  let bucketSum = state.bucketSum + force * dt;
  let bucketSec = state.bucketSec + dt;
  const boundary = Math.floor(state.t) + 1;
  if (t >= boundary) {
    const tail = t - boundary;
    if (curve.length < CURVE_CAP) {
      const mean = (bucketSum - force * tail) / (bucketSec - tail);
      curve = [...curve, Math.round(mean * 1000) / 1000];
    }
    bucketSum = force * tail;
    bucketSec = tail;
  }

  const below = force < decayThreshold(t) ? state.below + dt : 0;
  const phase: GamePhase = below >= DECAY.graceSec ? 'over' : 'live';
  return { ...state, phase, t, force, below, curve, bucketSum, bucketSec };
}

// ── drawing ────────────────────────────────────────────────────────────────

const W = 120;
const H = 160;
const SAT_X = 30;
/** How fast the line's future scrolls toward the satellite, px per second. */
const SCROLL = 6;
const HORIZON_Y = 150;
const FORCE_Y0 = 146; // force 0
const FORCE_Y1 = 12; // force 1.0

const SAT_BODY = ['.AA.', 'ABBA', '.AA.'] as const;

function forceToY(force: number): number {
  return Math.round(FORCE_Y0 - force * (FORCE_Y0 - FORCE_Y1));
}

function drawStars(ctx: CanvasRenderingContext2D, p: Palette, tMs: number): void {
  for (let k = 0; k < 22; k++) {
    const x = Math.floor(hash2(k, 3) * W);
    const y = Math.floor(2 + hash2(k, 17) * (HORIZON_Y - 18));
    // A slow twinkle: each star sits out a beat now and then.
    if (hash2(k, Math.floor(tMs / 500)) < 0.1) continue;
    ctx.fillStyle = k % 2 === 0 ? p.lineSoft : p.line;
    ctx.fillRect(x, y, 1, 1);
  }
}

function drawHorizon(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = p.line;
  ctx.fillRect(0, HORIZON_Y, W, 1);
  ctx.fillStyle = p.bark;
  for (let x = 0; x < W; x++) {
    for (let y = HORIZON_Y + 2; y < H; y++) {
      if (hash2(x, y) < 0.1) ctx.fillRect(x, y, 1, 1);
    }
  }
}

function drawSatellite(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  x: number,
  y: number,
  danger: boolean,
): void {
  // Solar-panel wings off the middle row, then the body over them.
  ctx.fillStyle = p.fjord;
  ctx.fillRect(x - 4, y, 2, 1);
  ctx.fillRect(x + 2, y, 2, 1);
  const body = { A: danger ? p.clay : p.pineDeep, B: p.pine };
  drawSprite(ctx, SAT_BODY, body, x - 2, y - 1);
}

function drawScene(ctx: CanvasRenderingContext2D, state: DecayState, p: Palette, tMs: number): void {
  ctx.fillStyle = p.paper;
  ctx.fillRect(0, 0, W, H);
  drawStars(ctx, p, tMs);

  // The line's past and future at once: each column shows the threshold at
  // the moment the satellite reaches — or left — that x.
  for (let x = 0; x < W; x++) {
    const ty = forceToY(decayThreshold(state.t + (x - SAT_X) / SCROLL));
    if (x % 2 === 0) {
      ctx.fillStyle = p.ink;
      ctx.fillRect(x, ty, 1, 1);
    }
    // The atmosphere below the line — the thing you must not sink into.
    ctx.fillStyle = p.clay;
    const wx = Math.floor(x + state.t * SCROLL);
    for (let y = ty + 2; y < HORIZON_Y - 1; y++) {
      if (hash2(wx, y) < 0.06) ctx.fillRect(x, y, 1, 1);
    }
  }

  drawHorizon(ctx, p);

  const y = forceToY(Math.max(0, Math.min(1, state.force)));
  if (state.phase === 'over') {
    // Tumbling in: a short trail flickering upward from where it fell.
    ctx.fillStyle = p.clay;
    for (let i = 0; i < 6; i++) {
      if (hash2(i, Math.floor(tMs / 80)) < 0.65) {
        ctx.fillRect(SAT_X + Math.round((hash2(i, 9) - 0.5) * 3), y + 1 - i, 1, 1);
      }
    }
    drawSatellite(ctx, p, SAT_X, y + 4, true);
  } else {
    const bob = Math.round(Math.sin(tMs / 300));
    drawSatellite(ctx, p, SAT_X, y + bob, state.below > 0);
  }
}

function drawCalibrationScene(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  tMs: number,
  liveKg: number,
  peakKg: number,
  done: boolean,
): void {
  ctx.fillStyle = p.paper;
  ctx.fillRect(0, 0, W, H);
  drawStars(ctx, p, tMs);
  drawHorizon(ctx, p);

  // The orbit to reach: a shallow dotted arc near the top.
  const arcY = (x: number): number => Math.round(16 + ((x - 60) * (x - 60)) / 480);
  ctx.fillStyle = p.line;
  for (let x = 0; x < W; x += 3) ctx.fillRect(x, arcY(x), 1, 1);

  // The gantry on the pad.
  const gx = 46;
  const gTop = HORIZON_Y - 24;
  ctx.fillStyle = p.ink;
  ctx.fillRect(gx, gTop, 2, 24);
  ctx.fillStyle = p.inkSoft;
  for (let y = HORIZON_Y - 4; y >= gTop; y -= 4) ctx.fillRect(gx - 2, y, 6, 1);

  const charge = Math.min(1, liveKg / Math.max(peakKg, 10));
  if (done) {
    // Calibrated: the satellite is up, riding the arc with a little trail.
    const ox = 84;
    ctx.fillStyle = p.pine;
    for (let i = 1; i <= 4; i++) {
      const tx = ox - 4 - i * 2;
      if (hash2(i, Math.floor(tMs / 120)) < 0.75) ctx.fillRect(tx, arcY(tx), 1, 1);
    }
    drawSatellite(ctx, p, ox, arcY(ox), false);
  } else {
    const sx = gx + 8;
    const padY = HORIZON_Y - 3;
    const y = Math.round(padY - charge * (padY - arcY(sx)));
    drawSatellite(ctx, p, sx, y, false);
  }

  // The charge column, same idiom as the other games: pips up the left edge,
  // lit to the live pull's share of the biggest pull seen so far.
  const pips = 12;
  const lit = Math.round(charge * pips);
  for (let i = 0; i < pips; i++) {
    ctx.fillStyle = i < lit ? p.pine : p.lineSoft;
    ctx.fillRect(6, HORIZON_Y - 8 - i * 6, 2, 2);
  }
}

export const orbitDecay: GameSpec<DecayState> = {
  meta: GAME_BY_ID['orbit-decay'],
  width: W,
  height: H,
  scoreLabel: 'time in orbit',
  hint: 'stay above the sinking line. it only gets easier — until there is nothing left.',
  init: initDecay,
  step: stepDecay,
  phase: (s) => s.phase,
  score: (s) => Math.floor(s.t),
  activeSec: (s) => s.t,
  curve: (s) => s.curve,
  formatScore: (s) => formatClock(s),
  cue: (prev, next) => {
    if (prev.phase === 'ready' && next.phase === 'live') return 'start';
    if (prev.phase === 'live' && next.phase === 'over') return 'over';
    if (next.phase === 'live' && prev.below === 0 && next.below > 0) return 'tick';
    return null;
  },
  draw: drawScene,
  drawCalibration: drawCalibrationScene,
};
