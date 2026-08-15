import { hash2, type Palette } from './pixel';
import type { GamePhase, GameSpec } from './types';
import { GAME_BY_ID } from './types';

/**
 * pulsar — seven on, three off, on the beat.
 *
 * This is the classic repeater protocol: 7 s of work, 3 s of rest, six times
 * over. That duty cycle is the pump protocol — the work is long enough to
 * occlude the forearm and the rest short enough that it never fully refills,
 * which is what trains capillarity and strength-endurance. The game asks for
 * the two skills repeaters actually demand: hold force inside the band while
 * a block passes, and let go *cleanly* in the gaps — a half-release is how
 * rest fails on the real thing too.
 *
 * The first 0.4 s of every segment is unscored, because humans cannot
 * step-change force. The grace window scores the hold, not the reaction time.
 */

export const PULSAR = {
  /** Run-up before the first block; no force requirement during it. */
  prepSec: 5,
  onSec: 7,
  offSec: 3,
  blocks: 6,
  /** The hold target, as fractions of the calibrated max. */
  band: { lo: 0.35, hi: 0.55 },
  /** A gap counts as released at or below this. */
  releaseFrac: 0.1,
  /** Unscored transition time at the start of every segment. */
  graceSec: 0.4,
  /** Ready → live at this force. */
  startFrac: 0.12,
} as const;

/** prep, then on/off alternating, ending on the last on block — no tail gap. */
const SEG_COUNT = 2 * PULSAR.blocks;

/** Force history entries kept for the drawing tail. */
const TRAIL = 40;

type SegKind = 'prep' | 'on' | 'off';

function segKind(seg: number): SegKind {
  if (seg === 0) return 'prep';
  return seg % 2 === 1 ? 'on' : 'off';
}

function segLen(seg: number): number {
  const kind = segKind(seg);
  return kind === 'prep' ? PULSAR.prepSec : kind === 'on' ? PULSAR.onSec : PULSAR.offSec;
}

export interface PulsarState {
  phase: GamePhase;
  t: number;
  force: number;
  /** Index into the segment timeline; segT is seconds into it. */
  seg: number;
  segT: number;
  /** Per-segment accumulators, reset when the segment completes. */
  scoredSec: number;
  goodSec: number;
  /** One 0..1 entry per completed block / gap. */
  blockScores: number[];
  gapScores: number[];
  streak: number;
  bestStreak: number;
  /** Recent force values, newest last, for the drawing tail. */
  recent: number[];
}

export function initPulsar(): PulsarState {
  return {
    phase: 'ready',
    t: 0,
    force: 0,
    seg: 0,
    segT: 0,
    scoredSec: 0,
    goodSec: 0,
    blockScores: [],
    gapScores: [],
    streak: 0,
    bestStreak: 0,
    recent: [],
  };
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export function stepPulsar(state: PulsarState, dt: number, force: number): PulsarState {
  if (state.phase === 'over') return state;

  const recent = [...state.recent, force].slice(-TRAIL);

  if (state.phase === 'ready') {
    if (force < PULSAR.startFrac) return { ...state, force, recent };
    return { ...state, phase: 'live', force, recent };
  }

  let phase: GamePhase = 'live';
  let seg = state.seg;
  let segT = state.segT;
  let scoredSec = state.scoredSec;
  let goodSec = state.goodSec;
  let blockScores = state.blockScores;
  let gapScores = state.gapScores;
  let streak = state.streak;
  let bestStreak = state.bestStreak;

  // Walk dt across segment boundaries so a 50 ms step never loses time: each
  // pass consumes up to the end of the current segment and carries the rest.
  let remaining = dt;
  while (remaining > 1e-9 && phase === 'live') {
    const kind = segKind(seg);
    const len = segLen(seg);
    const slice = Math.min(remaining, len - segT);
    const scored = Math.max(0, segT + slice - Math.max(segT, PULSAR.graceSec));
    if (kind !== 'prep' && scored > 0) {
      scoredSec += scored;
      const good =
        kind === 'on'
          ? force >= PULSAR.band.lo && force <= PULSAR.band.hi
          : force <= PULSAR.releaseFrac;
      if (good) goodSec += scored;
    }
    segT += slice;
    remaining -= slice;

    if (segT >= len - 1e-9) {
      if (kind === 'on') {
        const score = clamp01(goodSec / (PULSAR.onSec - PULSAR.graceSec));
        blockScores = [...blockScores, score];
        if (score >= 0.9) {
          streak += 1;
          bestStreak = Math.max(bestStreak, streak);
        } else {
          streak = 0;
        }
      } else if (kind === 'off') {
        gapScores = [...gapScores, clamp01(goodSec / (PULSAR.offSec - PULSAR.graceSec))];
      }
      scoredSec = 0;
      goodSec = 0;
      if (seg === SEG_COUNT - 1) {
        phase = 'over';
      } else {
        seg += 1;
        segT = 0;
      }
    }
  }

  return {
    ...state,
    phase,
    t: state.t + dt,
    force,
    seg,
    segT,
    scoredSec,
    goodSec,
    blockScores,
    gapScores,
    streak,
    bestStreak,
    recent,
  };
}

export function pulsarScore(state: PulsarState): number {
  const { blockScores, gapScores } = state;
  if (blockScores.length === 0 && gapScores.length === 0) return 0;
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  // Blocks weigh 0.8, gaps 0.2 — renormalized over what has completed so far,
  // so a mid-run read is an accuracy, never a penalty for unplayed segments.
  let weight = 0;
  let total = 0;
  if (blockScores.length > 0) {
    weight += 0.8;
    total += 0.8 * mean(blockScores);
  }
  if (gapScores.length > 0) {
    weight += 0.2;
    total += 0.2 * mean(gapScores);
  }
  return Math.round((1000 * total) / weight);
}

/** Only the on blocks are tension; prep and the gaps are not. */
export function pulsarActiveSec(state: PulsarState): number {
  const inBlock =
    state.phase === 'live' && segKind(state.seg) === 'on'
      ? Math.min(state.segT, PULSAR.onSec)
      : 0;
  return state.blockScores.length * PULSAR.onSec + inBlock;
}

// ── drawing ────────────────────────────────────────────────────────────────

const W = 120;
const H = 160;
const NOW_X = 30;
const SCROLL = 10; // px per run-second
const Y_ZERO = 148; // force 0
const Y_FULL = 12; // force 1.0

function forceToY(force: number): number {
  return Math.round(Y_ZERO - clamp01(force) * (Y_ZERO - Y_FULL));
}

function drawStars(ctx: CanvasRenderingContext2D, p: Palette, tMs: number): void {
  for (let k = 0; k < 22; k++) {
    const x = Math.floor(hash2(k, 31) * W);
    const y = 2 + Math.floor(hash2(k, 17) * (H - 8));
    // A slow twinkle: each star sits out a beat now and then.
    if (hash2(k, Math.floor(tMs / 400)) < 0.12) continue;
    ctx.fillStyle = hash2(k, 41) < 0.5 ? p.lineSoft : p.line;
    ctx.fillRect(x, y, 1, 1);
  }
}

function drawStarBody(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  x: number,
  y: number,
  r: number,
): void {
  ctx.fillStyle = p.pine;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (Math.abs(dx) + Math.abs(dy) <= r) ctx.fillRect(x + dx, y + dy, 1, 1);
    }
  }
  ctx.fillStyle = p.paper;
  ctx.fillRect(x, y, 1, 1);
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  state: PulsarState,
  p: Palette,
  tMs: number,
): void {
  ctx.fillStyle = p.paper;
  ctx.fillRect(0, 0, W, H);
  drawStars(ctx, p, tMs);

  const bandTop = forceToY(PULSAR.band.hi);
  const bandBottom = forceToY(PULSAR.band.lo);
  ctx.fillStyle = p.lineSoft;
  ctx.fillRect(0, bandTop, W, bandBottom - bandTop + 1);
  ctx.fillStyle = p.line;
  ctx.fillRect(0, forceToY(PULSAR.releaseFrac), W, 1);

  // The blocks stream leftward past the now line; completed parts scroll off.
  for (let k = 0; k < PULSAR.blocks; k++) {
    const start = PULSAR.prepSec + k * (PULSAR.onSec + PULSAR.offSec);
    const left = Math.max(0, Math.round(NOW_X + (start - state.t) * SCROLL));
    const right = Math.min(W, Math.round(NOW_X + (start + PULSAR.onSec - state.t) * SCROLL));
    if (right <= left) continue;
    ctx.fillStyle = p.pineDeep;
    ctx.fillRect(left, bandTop, right - left, bandBottom - bandTop + 1);
    ctx.fillStyle = p.pine;
    ctx.fillRect(left, bandTop, right - left, 1);
  }

  ctx.fillStyle = p.line;
  ctx.fillRect(NOW_X, Y_FULL, 1, Y_ZERO - Y_FULL + 1);

  // The force history trails off behind the player, one pixel per step.
  ctx.fillStyle = p.line;
  for (let i = 0; i < state.recent.length; i++) {
    const x = NOW_X - (state.recent.length - i);
    if (x < 0) continue;
    ctx.fillRect(x, forceToY(state.recent[i]), 1, 1);
  }

  const r = state.phase === 'over' ? 1 : 1 + (Math.floor(tMs / 300) % 2);
  drawStarBody(ctx, p, NOW_X, forceToY(state.force), r);

  for (let i = 0; i < state.blockScores.length; i++) {
    const b = state.blockScores[i];
    ctx.fillStyle = b >= 0.9 ? p.pine : b >= 0.5 ? p.bark : p.clay;
    ctx.fillRect(4 + i * 7, 3, 2, 2);
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

  const cx = W / 2;
  const cy = Math.floor(H / 2);
  const charge = Math.min(1, liveKg / Math.max(peakKg, 10));

  // A ring of pips lights up with the pull.
  const lit = Math.round(charge * 8);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.fillStyle = done || i < lit ? p.pine : p.lineSoft;
    ctx.fillRect(cx + Math.round(Math.cos(a) * 24), cy + Math.round(Math.sin(a) * 24), 2, 2);
  }

  // Four rays grow with the charge and flicker frame to frame.
  const full = Math.round((done ? 1 : charge) * 14);
  const dirs = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];
  ctx.fillStyle = p.pine;
  for (let ray = 0; ray < dirs.length; ray++) {
    const flick = !done && hash2(ray, Math.floor(tMs / 80)) < 0.35 ? 2 : 0;
    const len = Math.max(0, full - flick);
    const [dx, dy] = dirs[ray];
    for (let i = 2; i < 2 + len; i++) {
      ctx.fillRect(cx + dx * i, cy + dy * i, 1, 1);
    }
  }
  if (done) {
    // Supernova: the diagonals join in once the calibration has locked.
    for (const [dx, dy] of [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]) {
      for (let i = 2; i < 5; i++) ctx.fillRect(cx + dx * i, cy + dy * i, 1, 1);
    }
  }

  ctx.fillStyle = p.pineDeep;
  ctx.fillRect(cx - 1, cy - 1, 3, 3);
  ctx.fillStyle = p.paper;
  ctx.fillRect(cx, cy, 1, 1);
}

export const pulsar: GameSpec<PulsarState> = {
  meta: GAME_BY_ID['pulsar'],
  width: W,
  height: H,
  scoreLabel: 'accuracy',
  hint: 'pull into the band when the block arrives. let go clean in the gaps.',
  init: initPulsar,
  step: stepPulsar,
  phase: (s) => s.phase,
  score: pulsarScore,
  activeSec: pulsarActiveSec,
  cue: (prev, next) => {
    if (prev.phase === 'ready' && next.phase === 'live') return 'start';
    if (prev.phase === 'live' && next.phase === 'over') return 'over';
    if (next.phase !== 'live') return null;
    if (next.seg !== prev.seg) {
      return segKind(next.seg) === 'on' ? 'start' : null;
    }
    // A countdown into every block: one tick per second over the last 3 s of
    // the prep and of each gap, cued off the ceiling of the time remaining.
    if (segKind(next.seg) !== 'on') {
      const len = segLen(next.seg);
      const remNext = len - next.segT;
      if (remNext <= 3 && Math.ceil(remNext) !== Math.ceil(len - prev.segT)) return 'tick';
    }
    return null;
  },
  draw: drawScene,
  drawCalibration: drawCalibrationScene,
};
