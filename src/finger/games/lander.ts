import { drawSprite, hash2, type Palette } from './pixel';
import type { GamePhase, GameSpec } from './types';
import { GAME_BY_ID } from './types';

/**
 * soft landing — thrust against the fall, touch down gently.
 *
 * The honest bit: hovering is deliberately priced at ~42% of the calibrated
 * max at round one — the abrahangs band — so parking mid-air is training, not
 * stalling. Each soft landing raises gravity while thrust stays put, so the
 * hover climbs toward a hold that eventually cannot be paid, and the ladder
 * ends when a landing comes in too hard. The rounds' rests on the pad are the
 * protocol's rests.
 */

export const LANDER = {
  /** Downward pull at round one, altitude-units per s². */
  gravity0: 0.22,
  /** Gravity multiplier per completed round — the ladder. */
  gravityGrowth: 1.12,
  /**
   * Force fraction that exactly hovers at round one. Thrust does not grow
   * with the rounds — only gravity does — so the hover cost keeps rising.
   */
  hoverFrac: 0.42,
  startAlt: 1.0,
  /** Ceiling clamp; upward velocity dies here too. */
  maxAlt: 1.05,
  /** A round's drop begins at first contact. */
  ignitionFrac: 0.05,
  /** Pause on the pad between rounds. */
  restSec: 2.5,
  /** Touchdown speed thresholds, units/s. */
  vSoft: 0.12,
  vGood: 0.2,
  vHard: 0.3,
  pointsSoft: 100,
  pointsGood: 60,
  pointsHard: 25,
  /** Descent-speed warning near the ground. */
  warnV: 0.35,
  warnAlt: 0.3,
  /** Force above this counts as time under tension. */
  tensionFrac: 0.1,
} as const;

export type LanderTouch = 'soft' | 'good' | 'hard';

export interface LanderState {
  phase: GamePhase;
  /** 1-based; each scored landing raises it, and the gravity with it. */
  round: number;
  alt: number;
  /** Positive is downward — the direction the whole game is about resisting. */
  v: number;
  force: number;
  score: number;
  t: number;
  /** Seconds of pad rest left; 0 while airborne. */
  resting: number;
  lastTouchdownV: number | null;
  lastLanding: LanderTouch | null;
  activeSec: number;
  /** The near-ground overspeed warning; fires once per round. */
  warned: boolean;
  crashed: boolean;
}

export function landerGravity(round: number): number {
  return LANDER.gravity0 * LANDER.gravityGrowth ** (round - 1);
}

export function initLander(): LanderState {
  return {
    phase: 'ready',
    round: 1,
    alt: LANDER.startAlt,
    v: 0,
    force: 0,
    score: 0,
    t: 0,
    resting: 0,
    lastTouchdownV: null,
    lastLanding: null,
    activeSec: 0,
    warned: false,
    crashed: false,
  };
}

export function stepLander(state: LanderState, dt: number, force: number): LanderState {
  if (state.phase === 'over') return state;

  if (state.phase === 'ready') {
    if (force < LANDER.ignitionFrac) return { ...state, force };
    return { ...state, phase: 'live', force };
  }

  const t = state.t + dt;

  // The pad rest: force does nothing here, and no tension accrues — this is
  // the between-sets rest, not a place to keep pulling.
  if (state.resting > 0) {
    return { ...state, t, force, resting: Math.max(0, state.resting - dt) };
  }

  // Rested, waiting on the pad: the next round needs a fresh ignition, and
  // then the lander goes straight back to the top. A round reset, not physics.
  if (state.alt <= 0) {
    if (force < LANDER.ignitionFrac) return { ...state, t, force };
    return { ...state, t, force, alt: LANDER.startAlt, v: 0, warned: false };
  }

  const accel = landerGravity(state.round) - (LANDER.gravity0 * force) / LANDER.hoverFrac;
  let v = state.v + accel * dt;
  let alt = state.alt - v * dt;
  if (alt > LANDER.maxAlt) {
    alt = LANDER.maxAlt;
    v = Math.max(0, v);
  }
  const activeSec = state.activeSec + (force >= LANDER.tensionFrac ? dt : 0);

  if (alt <= 0) {
    if (v > LANDER.vHard) {
      // The fatal round pays nothing; the score keeps what was banked.
      return {
        ...state,
        t,
        force,
        alt: 0,
        v,
        activeSec,
        lastTouchdownV: v,
        phase: 'over',
        crashed: true,
      };
    }
    const landing: LanderTouch = v <= LANDER.vSoft ? 'soft' : v <= LANDER.vGood ? 'good' : 'hard';
    const points =
      landing === 'soft' ? LANDER.pointsSoft : landing === 'good' ? LANDER.pointsGood : LANDER.pointsHard;
    return {
      ...state,
      t,
      force,
      alt: 0,
      v: 0,
      activeSec,
      score: state.score + points,
      lastTouchdownV: v,
      lastLanding: landing,
      round: state.round + 1,
      resting: LANDER.restSec,
    };
  }

  const warned = state.warned || (v > LANDER.warnV && alt < LANDER.warnAlt);
  return { ...state, t, force, alt, v, activeSec, warned };
}

// ── drawing ────────────────────────────────────────────────────────────────

const W = 120;
const H = 160;
const GROUND_Y = 150;
const PAD_TOP = 146;
const PAD_W = 15;
const PAD_X = W / 2 - 7; // 53 — slab centered under the lander
const PAD_Y0 = 145; // lander base when alt = 0
const SKY_Y = 14; // lander base when alt = 1

const LANDER_SPRITE = ['.AAA.', 'ABBBA', 'ABBBA', 'A.A.A'] as const;
// The same craft with rows and columns swapped: on its side.
const TIPPED_SPRITE = ['.AAA', 'ABB.', 'ABBA', 'ABB.', '.AAA'] as const;

function altToY(alt: number): number {
  return Math.round(PAD_Y0 - alt * (PAD_Y0 - SKY_Y));
}

function drawStars(ctx: CanvasRenderingContext2D, p: Palette): void {
  for (let k = 0; k < 22; k++) {
    const x = Math.floor(hash2(k, 11) * W);
    const y = Math.floor(2 + hash2(k, 23) * (GROUND_Y - 26));
    ctx.fillStyle = k % 3 === 0 ? p.line : p.lineSoft;
    ctx.fillRect(x, y, 1, 1);
  }
}

function drawGround(ctx: CanvasRenderingContext2D, p: Palette): void {
  ctx.fillStyle = p.line;
  ctx.fillRect(0, GROUND_Y, W, 1);
  for (let x = 0; x < W; x++) {
    if (hash2(x, 7) < 0.14) {
      ctx.fillStyle = hash2(x, 9) < 0.5 ? p.bark : p.lineSoft;
      ctx.fillRect(x, GROUND_Y + 2 + Math.floor(hash2(x, 5) * 5), 1, 1);
    }
  }
  ctx.fillStyle = p.inkSoft;
  ctx.fillRect(PAD_X + 1, PAD_TOP + 2, 1, 2);
  ctx.fillRect(PAD_X + PAD_W - 2, PAD_TOP + 2, 1, 2);
  ctx.fillStyle = p.ink;
  ctx.fillRect(PAD_X, PAD_TOP, PAD_W, 2);
}

function drawFlame(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  cx: number,
  yTop: number,
  len: number,
  tMs: number,
): void {
  for (let i = 0; i < len; i++) {
    const y = yTop + i;
    if (y >= H - 1) break;
    ctx.fillStyle = i === 0 ? p.clay : hash2(i, Math.floor(tMs / 70)) < 0.5 ? p.bark : p.clay;
    const width = i < 2 ? 2 : 1;
    ctx.fillRect(cx - (width - 1), y, width, 1);
  }
}

/**
 * The instrument that makes soft landings flyable: pips fill with speed, and
 * every lit pip wears the color of the zone the speed is in right now.
 */
function drawSpeedRibbon(ctx: CanvasRenderingContext2D, p: Palette, v: number): void {
  const pips = 12;
  const speed = Math.abs(v);
  const lit = Math.min(pips, Math.round((speed / LANDER.vHard) * pips));
  const color = speed <= LANDER.vSoft ? p.pine : speed <= LANDER.vHard ? p.bark : p.clay;
  for (let i = 0; i < pips; i++) {
    ctx.fillStyle = i < lit ? color : p.lineSoft;
    ctx.fillRect(W - 4, 10 + i * 8, 2, 2);
  }
}

function drawScene(ctx: CanvasRenderingContext2D, state: LanderState, p: Palette, tMs: number): void {
  ctx.fillStyle = p.paper;
  ctx.fillRect(0, 0, W, H);
  drawStars(ctx, p);
  drawGround(ctx, p);
  drawSpeedRibbon(ctx, p, state.v);

  ctx.fillStyle = p.pine;
  for (let i = 0; i < state.round - 1 && i < 14; i++) {
    ctx.fillRect(3 + i * 4, 3, 2, 2);
  }

  if (state.phase === 'over') {
    drawSprite(ctx, TIPPED_SPRITE, { A: p.pineDeep, B: p.pine }, W / 2 + 3, PAD_Y0 - 4);
    ctx.fillStyle = p.clay;
    for (let k = 0; k < 7; k++) {
      const dx = Math.round((hash2(k, 3) - 0.5) * 22);
      const dy = Math.round(hash2(k, 5) * 4);
      ctx.fillRect(W / 2 + dx, PAD_Y0 - dy, 1, 1);
    }
    return;
  }

  const yBase = altToY(Math.max(0, Math.min(LANDER.maxAlt, state.alt)));
  drawSprite(ctx, LANDER_SPRITE, { A: p.pineDeep, B: p.pine }, W / 2 - 2, yBase - 3);

  const airborne = state.phase === 'live' && state.resting === 0 && state.alt > 0;
  if (airborne && state.force >= LANDER.tensionFrac) {
    drawFlame(ctx, p, W / 2, yBase + 1, Math.round(1 + Math.min(1, state.force) * 6), tMs);
  }
  // The rest shows a check; the rested wait for ignition looks the same minus it.
  if (state.resting > 0) {
    ctx.fillStyle = p.pine;
    ctx.fillRect(W / 2, yBase - 6, 1, 1);
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
  drawStars(ctx, p);
  drawGround(ctx, p);

  const charge = Math.min(1, liveKg / Math.max(peakKg, 10));
  // An engine test: bolted to the pad, the pull only ever feeds the flame —
  // until it settles, when the cut flame reads as a little hop.
  const yBase = done ? PAD_Y0 - 1 : PAD_Y0;
  drawSprite(ctx, LANDER_SPRITE, { A: p.pineDeep, B: p.pine }, W / 2 - 2, yBase - 3);

  if (!done) {
    drawFlame(ctx, p, W / 2, yBase + 1, Math.round(charge * 10), tMs);
    if (charge > 0.1) {
      ctx.fillStyle = p.lineSoft;
      for (let k = 0; k < 5; k++) {
        const drift = (tMs / 1400 + hash2(k, 13)) % 1;
        const sx = Math.round(W / 2 + 3 + drift * 14 + hash2(k, 17) * 4);
        const sy = Math.round(PAD_Y0 - 2 - drift * 26);
        ctx.fillRect(sx, sy, 1, 1);
      }
    }
  }

  const pips = 12;
  const lit = Math.round(charge * pips);
  for (let i = 0; i < pips; i++) {
    ctx.fillStyle = i < lit ? p.pine : p.lineSoft;
    ctx.fillRect(6, GROUND_Y - 8 - i * 6, 2, 2);
  }
}

export const softLanding: GameSpec<LanderState> = {
  meta: GAME_BY_ID['soft-landing'],
  width: W,
  height: H,
  scoreLabel: 'landing score',
  hint: 'brake the fall, touch down gently. every landing makes the sky heavier.',
  init: initLander,
  step: stepLander,
  phase: (s) => s.phase,
  score: (s) => s.score,
  activeSec: (s) => s.activeSec,
  cue: (prev, next) => {
    if (prev.phase === 'ready' && next.phase === 'live') return 'start';
    if (prev.phase === 'live' && next.phase === 'over') return 'over';
    if (next.round > prev.round) return 'good';
    if (prev.phase === 'live' && prev.resting === 0 && prev.alt <= 0 && next.alt > 0) return 'start';
    if (!prev.warned && next.warned) return 'tick';
    return null;
  },
  draw: drawScene,
  drawCalibration: drawCalibrationScene,
};
