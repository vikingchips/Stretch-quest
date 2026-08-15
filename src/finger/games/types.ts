import type { Palette } from './pixel';
import type { Hand } from '../types';

/**
 * The games are training wearing a costume. Each one maps the force stream
 * onto a mechanic that happens to demand the thing worth practising —
 * sustained mid-range holds, clean on/off transitions, precise control under
 * fatigue — and none of them reward yanking, because sharp repeated impulses
 * on half-crimped fingers is how pulleys get hurt.
 *
 * Every game calibrates itself at the start of a visit: one hard pull sets
 * what 100% means for that hand today. Scores are therefore relative to the
 * pull you showed up with, never to the training max — the games work without
 * a max test, and they cannot pollute it.
 */

export type GameId = 'comet-run' | 'pulsar' | 'orbit-decay' | 'soft-landing';

export interface GameMeta {
  id: GameId;
  name: string;
  tagline: string;
}

export const GAME_LIST: GameMeta[] = [
  { id: 'comet-run', name: 'comet run', tagline: 'your pull is the altitude — thread the gates' },
  { id: 'pulsar', name: 'pulsar', tagline: 'seven on, three off, on the beat' },
  { id: 'orbit-decay', name: 'orbit decay', tagline: 'ride the sinking line as long as you can' },
  { id: 'soft-landing', name: 'soft landing', tagline: 'thrust against the fall. touch down gently' },
];

export const GAME_BY_ID: Record<GameId, GameMeta> = Object.fromEntries(
  GAME_LIST.map((g) => [g.id, g]),
) as Record<GameId, GameMeta>;

/** One finished run. Records the calibration so a score can be read honestly. */
export interface GameRun {
  id: string;
  gameId: GameId;
  hand: Hand;
  score: number;
  /** The pull that defined 100% for this run, kg. */
  calibKg: number;
  at: string;
  dateKey: string;
  /** Seconds under meaningful tension. */
  activeSec: number;
  /** 1 Hz force trace as fractions of calibKg — orbit decay keeps one. */
  curve?: number[];
}

export interface GameBest {
  score: number;
  at: string;
}

export type GameBestKey = `${GameId}:${Hand}`;

export function bestKey(gameId: GameId, hand: Hand): GameBestKey {
  return `${gameId}:${hand}`;
}

export type Rng = () => number;

export type GamePhase = 'ready' | 'live' | 'over';

/** Mapped to the existing session sounds by the shell. */
export type GameCue = 'start' | 'tick' | 'good' | 'over';

/**
 * What a game module provides. The sim is pure — init/step/queries — so it is
 * unit-testable with scripted force streams; drawing is separate and verified
 * by eye. The shell owns the canvas, the rAF loop, calibration, hands, sound
 * and score-keeping, so a game is only ever mechanics plus pixels.
 */
export interface GameSpec<S = unknown> {
  meta: GameMeta;
  /** Logical pixel resolution. The canvas is integer-scaled up from this. */
  width: number;
  height: number;
  /** What the score is called on the run-over screen, e.g. 'distance'. */
  scoreLabel: string;
  /** One line of instruction shown under the canvas while playing. */
  hint: string;
  init(rng: Rng): S;
  /**
   * Advance by dt seconds (the shell clamps dt to 50 ms). `force` is the
   * smoothed pull as a fraction of the calibrated max, never negative.
   */
  step(state: S, dt: number, force: number, rng: Rng): S;
  phase(state: S): GamePhase;
  score(state: S): number;
  /** Seconds under meaningful tension so far, for XP accounting. */
  activeSec(state: S): number;
  /** 1 Hz force trace to store with the run, if the game keeps one. */
  curve?(state: S): number[];
  /** Render as '1:47' where a raw number would lie. Defaults to String(). */
  formatScore?(score: number): string;
  /** Sound for this step's transition, if any. */
  cue?(prev: S, next: S): GameCue | null;
  draw(ctx: CanvasRenderingContext2D, state: S, p: Palette, tMs: number): void;
  /**
   * The calibration scene: one themed screen asking for the hardest pull of
   * the day. `liveKg` is the smoothed pull right now, `peakKg` the biggest
   * seen this calibration; `done` flips once the machine has settled.
   */
  drawCalibration(
    ctx: CanvasRenderingContext2D,
    p: Palette,
    tMs: number,
    liveKg: number,
    peakKg: number,
    done: boolean,
  ): void;
}
