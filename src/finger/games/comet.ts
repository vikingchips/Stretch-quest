import { drawSprite, hash2, type Palette } from './pixel';
import type { GamePhase, GameSpec, Rng } from './types';
import { GAME_BY_ID } from './types';

/**
 * comet run — your pull is the altitude.
 *
 * The one rule that makes this training instead of a toy: altitude follows
 * force *continuously*. There is no flap and nothing to spam — a gate at 40%
 * of max is held the way an abrahang is held, and the floor ends the run, so
 * you can never fully let go. Level design is dose design: most gates sit in
 * the low-middle band, with the occasional high one asking for a harder pull.
 */

export const COMET = {
  /** Force fraction that maps to the top of the sky. */
  top: 0.88,
  /** Lift-off: the run starts at first real contact. */
  launch: 0.06,
  /** Altitude inertia — flying, not a cursor. */
  tauSec: 0.22,
  /** Below this altitude the comet is dragging on the ground... */
  groundAlt: 0.03,
  /** ...and after this long it has landed, ending the run. */
  groundGraceSec: 0.35,
  /** The comet's half-height, in altitude units. */
  radius: 0.05,
  /** Breathing room after launch before the first gate arrives. */
  firstGateSec: 4,
  gateEverySecLo: 2.4,
  gateEverySecHi: 3.2,
  /** Half-gap of the first gates, shrinking per gate spawned to the floor. */
  gapStart: 0.15,
  gapFloor: 0.095,
  gapShrinkPerGate: 0.002,
  /** How far ahead gates exist, in seconds of travel. */
  horizonSec: 12,
  scorePerSec: 10,
  scorePerGate: 20,
} as const;

export interface CometGate {
  /** The moment the comet crosses this gate, in run-seconds. */
  at: number;
  center: number;
  halfGap: number;
  passed: boolean;
}

export interface CometState {
  phase: GamePhase;
  t: number;
  alt: number;
  force: number;
  gates: CometGate[];
  /** Total gates ever spawned — drives the gap shrink. */
  spawned: number;
  passed: number;
  crash: 'gate' | 'ground' | null;
  groundSec: number;
}

/**
 * Where gates sit: mostly the low-middle band — the range worth living in —
 * with occasional high and low excursions so a run is never one static hold.
 */
function gateCenter(rng: Rng): number {
  const roll = rng();
  if (roll < 0.6) return 0.3 + rng() * 0.25;
  if (roll < 0.85) return 0.55 + rng() * 0.23;
  return 0.16 + rng() * 0.14;
}

function spawnGate(after: number, spawned: number, rng: Rng): CometGate {
  return {
    at: after + COMET.gateEverySecLo + rng() * (COMET.gateEverySecHi - COMET.gateEverySecLo),
    center: gateCenter(rng),
    halfGap: Math.max(COMET.gapFloor, COMET.gapStart - spawned * COMET.gapShrinkPerGate),
    passed: false,
  };
}

export function initComet(rng: Rng): CometState {
  const gates: CometGate[] = [];
  let spawned = 0;
  let last = COMET.firstGateSec - COMET.gateEverySecLo;
  while (last < COMET.horizonSec) {
    const gate = spawnGate(last, spawned, rng);
    gates.push(gate);
    last = gate.at;
    spawned++;
  }
  return {
    phase: 'ready',
    t: 0,
    alt: 0,
    force: 0,
    gates,
    spawned,
    passed: 0,
    crash: null,
    groundSec: 0,
  };
}

export function stepComet(state: CometState, dt: number, force: number, rng: Rng): CometState {
  if (state.phase === 'over') return state;

  if (state.phase === 'ready') {
    if (force < COMET.launch) return { ...state, force };
    return { ...state, phase: 'live', force };
  }

  const t = state.t + dt;
  const target = Math.min(1.04, force / COMET.top);
  const alt = state.alt + (target - state.alt) * (1 - Math.exp(-dt / COMET.tauSec));

  // Landing has a grace window so a momentary dip is a scare, not a death —
  // but a real release ends the run. That is the mechanic that makes rest
  // impossible, which is where the pump comes from.
  const onGround = alt < COMET.groundAlt;
  const groundSec = onGround ? state.groundSec + dt : 0;
  if (groundSec >= COMET.groundGraceSec) {
    return { ...state, t, alt, force, groundSec, phase: 'over', crash: 'ground' };
  }

  let gates = state.gates;
  let spawned = state.spawned;
  let passed = state.passed;

  // Evaluate every gate crossed this step. Steps are 50 ms against gates
  // seconds apart, so this is almost always zero or one gate.
  for (const gate of gates) {
    if (gate.passed || gate.at > t) continue;
    if (Math.abs(alt - gate.center) <= gate.halfGap - COMET.radius) {
      gates = gates.map((g) => (g === gate ? { ...g, passed: true } : g));
      passed++;
    } else {
      return { ...state, t, alt, force, groundSec, gates, passed, phase: 'over', crash: 'gate' };
    }
  }

  // Keep the horizon stocked and drop gates well behind the comet.
  if (gates.length > 0 && gates[gates.length - 1].at < t + COMET.horizonSec) {
    const gate = spawnGate(gates[gates.length - 1].at, spawned, rng);
    gates = [...gates, gate];
    spawned++;
  }
  if (gates.length > 0 && gates[0].at < t - 5) {
    gates = gates.filter((g) => g.at >= t - 5);
  }

  return { ...state, t, alt, force, gates, spawned, passed, groundSec };
}

export function cometScore(state: CometState): number {
  return Math.floor(state.t * COMET.scorePerSec) + state.passed * COMET.scorePerGate;
}

// ── drawing ────────────────────────────────────────────────────────────────

const W = 120;
const H = 160;
const GROUND_Y = H - 9;
const COMET_X = 30;
const SCROLL = 26; // px per run-second
const SKY_TOP = 10;

const COMET_SPRITE = ['.AA.', 'ACBA', 'ABBA', '.AA.'] as const;

function altToY(alt: number): number {
  return GROUND_Y - 2 - alt * (GROUND_Y - 2 - SKY_TOP);
}

function drawStars(ctx: CanvasRenderingContext2D, p: Palette, t: number, tMs: number): void {
  for (let k = 0; k < 26; k++) {
    const layer = k % 2;
    const speed = layer === 0 ? 5 : 11;
    const baseX = hash2(k, 11) * W;
    const y = Math.floor(2 + hash2(k, 23) * (GROUND_Y - 14));
    const x = Math.floor(((baseX - t * speed) % W) + W) % W;
    // A slow twinkle: each star sits out a beat now and then.
    if (hash2(k, Math.floor(tMs / 400)) < 0.12) continue;
    ctx.fillStyle = layer === 0 ? p.lineSoft : p.line;
    ctx.fillRect(x, y, 1, 1);
  }
}

function drawGround(ctx: CanvasRenderingContext2D, p: Palette, t: number): void {
  ctx.fillStyle = p.line;
  ctx.fillRect(0, GROUND_Y, W, 1);
  for (let x = 0; x < W; x++) {
    const wx = Math.floor(x + t * SCROLL);
    if (hash2(wx, 7) < 0.14) {
      ctx.fillStyle = hash2(wx, 9) < 0.5 ? p.bark : p.lineSoft;
      ctx.fillRect(x, GROUND_Y + 2 + Math.floor(hash2(wx, 5) * 4), 1, 1);
    }
  }
}

function drawGateColumn(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  x: number,
  yTop: number,
  yBottom: number,
  seed: number,
): void {
  if (yBottom <= yTop) return;
  const width = 7;
  ctx.fillStyle = p.bark;
  ctx.fillRect(x, yTop, width, yBottom - yTop);
  // Speckle the rock, and cap the ends a pixel narrower so they read as
  // boulders rather than bars.
  ctx.fillStyle = p.ink;
  for (let y = yTop; y < yBottom; y++) {
    if (hash2(seed, y) < 0.18) ctx.fillRect(x + 1 + Math.floor(hash2(seed + 1, y) * (width - 2)), y, 1, 1);
  }
  ctx.fillStyle = p.lineSoft;
  for (let y = yTop; y < yBottom; y += 1) {
    if (hash2(seed + 2, y) < 0.3) ctx.fillRect(x, y, 1, 1);
  }
}

function drawComet(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  x: number,
  y: number,
  force: number,
  tMs: number,
  crashed: boolean,
): void {
  const body = crashed
    ? { A: p.clay, B: p.bark, C: p.bark }
    : { A: p.pineDeep, B: p.pine, C: p.paper };
  const trail = Math.round(3 + Math.min(1, force) * 8);
  for (let i = 0; i < trail; i++) {
    const tx = x - 2 - i;
    const ty = y + Math.round(Math.sin(tMs / 90 + i * 1.1));
    ctx.fillStyle = i % 2 === 0 ? p.pine : p.lineSoft;
    if (!crashed) ctx.fillRect(tx, ty, 1, 1);
  }
  drawSprite(ctx, COMET_SPRITE, body, x - 2, y - 2);
  if (crashed) {
    ctx.fillStyle = p.clay;
    for (let k = 0; k < 6; k++) {
      const dx = Math.round((hash2(k, 3) - 0.5) * (6 + tMs / 60) % 14);
      const dy = Math.round((hash2(k, 5) - 0.5) * (6 + tMs / 80) % 12);
      ctx.fillRect(x + dx, y + dy, 1, 1);
    }
  }
}

function drawScene(ctx: CanvasRenderingContext2D, state: CometState, p: Palette, tMs: number): void {
  ctx.fillStyle = p.paper;
  ctx.fillRect(0, 0, W, H);
  drawStars(ctx, p, state.t, tMs);
  drawGround(ctx, p, state.t);

  for (const gate of state.gates) {
    const x = Math.round(COMET_X + (gate.at - state.t) * SCROLL) - 3;
    if (x > W || x < -8) continue;
    const gapTop = altToY(gate.center + gate.halfGap);
    const gapBottom = altToY(gate.center - gate.halfGap);
    const seed = Math.floor(gate.at * 97);
    drawGateColumn(ctx, p, x, 0, Math.max(0, Math.floor(gapTop)), seed);
    drawGateColumn(ctx, p, x, Math.min(GROUND_Y, Math.ceil(gapBottom)), GROUND_Y, seed + 13);
    if (gate.passed) {
      ctx.fillStyle = p.pine;
      ctx.fillRect(x + 3, Math.floor(gapTop) - 2, 1, 1);
    }
  }

  const y = Math.round(altToY(Math.max(0, Math.min(1.04, state.alt))));
  if (state.phase === 'ready') {
    // Idling on the ground with a little bob, waiting for the first pull.
    const bob = Math.round(Math.sin(tMs / 300));
    drawComet(ctx, p, COMET_X, GROUND_Y - 3 + bob, 0.1, tMs, false);
  } else {
    drawComet(ctx, p, COMET_X, y, state.force, tMs, state.phase === 'over');
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
  drawStars(ctx, p, 0, tMs);

  // Launch pad.
  const padY = GROUND_Y;
  ctx.fillStyle = p.line;
  ctx.fillRect(0, padY, W, 1);
  ctx.fillStyle = p.ink;
  ctx.fillRect(W / 2 - 7, padY - 1, 14, 1);
  ctx.fillStyle = p.inkSoft;
  ctx.fillRect(W / 2 - 5, padY - 2, 10, 1);

  const charge = peakKg > 0 ? Math.min(1, liveKg / Math.max(peakKg, 10)) : 0;
  const shake = !done && charge > 0.75 ? Math.round(Math.sin(tMs / 30)) : 0;
  // Once locked, the comet leaves — the scene itself says "calibrated".
  const lift = done ? 24 : Math.round(charge * 4);
  const cy = padY - 8 - lift;

  drawComet(ctx, p, W / 2 + shake, cy, done ? 1 : charge, tMs, false);

  // Engine flame while pulling: grows with the pull, flickers by the frame.
  const flame = done ? 8 : Math.round(charge * 7);
  for (let i = 0; i < flame; i++) {
    const fy = cy + 3 + i;
    if (fy >= padY - 1) break;
    ctx.fillStyle = i < 2 ? p.clay : hash2(i, Math.floor(tMs / 70)) < 0.5 ? p.bark : p.clay;
    const width = Math.max(1, 3 - Math.floor(i / 2));
    ctx.fillRect(W / 2 - Math.floor(width / 2), fy, width, 1);
  }

  // The charge column: a stack of pips up the left edge, lit to the live
  // pull's share of the biggest pull seen so far.
  const pips = 12;
  const lit = Math.round(charge * pips);
  for (let i = 0; i < pips; i++) {
    ctx.fillStyle = i < lit ? p.pine : p.lineSoft;
    ctx.fillRect(6, padY - 8 - i * 6, 2, 2);
  }
}

export const cometRun: GameSpec<CometState> = {
  meta: GAME_BY_ID['comet-run'],
  width: W,
  height: H,
  scoreLabel: 'distance',
  hint: 'hold the height the next gap asks for. the ground ends the run.',
  init: initComet,
  step: stepComet,
  phase: (s) => s.phase,
  score: cometScore,
  activeSec: (s) => s.t,
  cue: (prev, next) => {
    if (prev.phase === 'ready' && next.phase === 'live') return 'start';
    if (next.passed > prev.passed) return 'good';
    if (prev.phase === 'live' && next.phase === 'over') return 'over';
    return null;
  },
  draw: drawScene,
  drawCalibration: drawCalibrationScene,
};
