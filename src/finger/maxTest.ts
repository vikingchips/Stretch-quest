import { MAX_TEST, PEAK_SMOOTHING_SAMPLES } from './constants';
import type { FingerMax, FingerTestRecord, ForceSample, Grip, Hand } from './types';

/**
 * The max test. Every intensity band in the app is a fraction of what this
 * measures, which is why it is fussy about how it measures it.
 *
 * Peak is taken from a smoothed series, not the raw stream: a 24-bit ADC at
 * 80 SPS will hand you a single-sample spike sooner or later, and an
 * unsmoothed peak would enshrine it as your max and then set every future
 * session's load from it.
 */

/** Fraction of the running peak below which the pull counts as released. */
const RELEASE_FRACTION = 0.2;
/** How long it has to stay released before the attempt ends itself. */
const RELEASE_HOLD_MS = 1000;
/** Ignore noise around zero: an attempt has to actually start. */
const ARM_THRESHOLD_KG = 2;

export interface AttemptState {
  /** Rolling window for smoothing. */
  window: number[];
  /** Peak of the smoothed series so far. */
  peakKg: number;
  smoothedKg: number;
  /** True once force has exceeded ARM_THRESHOLD_KG. */
  started: boolean;
  /** How long force has been below the release threshold. */
  releasedMs: number;
  lastT: number | null;
  done: boolean;
}

export function initAttempt(): AttemptState {
  return {
    window: [],
    peakKg: 0,
    smoothedKg: 0,
    started: false,
    releasedMs: 0,
    lastT: null,
    done: false,
  };
}

export function feedAttempt(state: AttemptState, sample: ForceSample): AttemptState {
  if (state.done) return state;

  const window = [...state.window, sample.kg].slice(-PEAK_SMOOTHING_SAMPLES);
  const smoothedKg = window.reduce((sum, v) => sum + v, 0) / window.length;
  const dt = state.lastT === null ? 0 : Math.min(200, Math.max(0, sample.t - state.lastT));

  const started = state.started || smoothedKg >= ARM_THRESHOLD_KG;
  const peakKg = Math.max(state.peakKg, smoothedKg);
  const released = started && smoothedKg < peakKg * RELEASE_FRACTION;
  const releasedMs = released ? state.releasedMs + dt : 0;

  return {
    window,
    peakKg,
    smoothedKg,
    started,
    releasedMs,
    lastT: sample.t,
    done: releasedMs >= RELEASE_HOLD_MS,
  };
}

export type TestPhase = 'warmup' | 'ready' | 'pulling' | 'resting' | 'done';

export interface MaxTestState {
  phase: TestPhase;
  hand: Hand;
  grip: Grip;
  /** Peaks recorded so far, per hand, in attempt order. */
  attempts: Record<Hand, number[]>;
  attempt: AttemptState;
  restRemainingMs: number;
}

/** Hands are always tested and stored separately — never averaged, never
 *  converted. There is no validated one-hand to two-hand factor. */
const HAND_ORDER: Hand[] = ['left', 'right'];

export function initMaxTest(grip: Grip): MaxTestState {
  return {
    phase: 'warmup',
    hand: 'left',
    grip,
    attempts: { left: [], right: [] },
    attempt: initAttempt(),
    restRemainingMs: 0,
  };
}

export function bestOf(attempts: number[]): number {
  return attempts.length === 0 ? 0 : Math.max(...attempts);
}

/** Record the finished attempt and decide what comes next. */
export function endAttempt(state: MaxTestState): MaxTestState {
  const peak = state.attempt.peakKg;
  const attempts: Record<Hand, number[]> = {
    ...state.attempts,
    [state.hand]: [...state.attempts[state.hand], peak],
  };
  const doneWithHand = attempts[state.hand].length >= MAX_TEST.attempts;
  const handIndex = HAND_ORDER.indexOf(state.hand);
  const lastHand = handIndex === HAND_ORDER.length - 1;

  if (doneWithHand && lastHand) {
    return { ...state, attempts, phase: 'done', attempt: initAttempt() };
  }
  return {
    ...state,
    attempts,
    hand: doneWithHand ? HAND_ORDER[handIndex + 1] : state.hand,
    phase: 'resting',
    restRemainingMs: MAX_TEST.restSec * 1000,
    attempt: initAttempt(),
  };
}

/** Skip the remaining attempts for this hand. */
export function skipToNextHand(state: MaxTestState): MaxTestState {
  const handIndex = HAND_ORDER.indexOf(state.hand);
  if (handIndex === HAND_ORDER.length - 1) {
    return { ...state, phase: 'done', attempt: initAttempt() };
  }
  return {
    ...state,
    hand: HAND_ORDER[handIndex + 1],
    phase: 'ready',
    attempt: initAttempt(),
    restRemainingMs: 0,
  };
}

export interface TestOutcome {
  tests: FingerTestRecord[];
  maxes: FingerMax[];
}

export interface ApplyTestInput {
  state: MaxTestState;
  edgeMm: number;
  bodyweightKg: number;
  testedAt: string;
  dateKey: string;
  existing: FingerMax[];
  /** Injectable so tests do not depend on crypto.randomUUID. */
  makeId?: () => string;
}

/**
 * Fold a finished test into stored history and maxes.
 *
 * The newest test wins for a given hand+grip+edge even when it is lower —
 * that is the entire point of retesting. Nothing is lost either way: every
 * attempt of every test stays in `tests`.
 */
export function applyTestResult(input: ApplyTestInput): TestOutcome {
  const { state, edgeMm, bodyweightKg, testedAt, dateKey, existing } = input;
  const makeId = input.makeId ?? (() => crypto.randomUUID());

  const tests: FingerTestRecord[] = [];
  const maxes = [...existing];

  for (const hand of HAND_ORDER) {
    const attempts = state.attempts[hand];
    if (attempts.length === 0) continue;

    tests.push({
      id: makeId(),
      testedAt,
      dateKey,
      hand,
      grip: state.grip,
      edgeMm,
      bodyweightKg,
      attemptsKg: attempts,
    });

    const next: FingerMax = {
      hand,
      grip: state.grip,
      kg: bestOf(attempts),
      edgeMm,
      testedAt,
    };
    const at = maxes.findIndex(
      (m) => m.hand === hand && m.grip === state.grip && m.edgeMm === edgeMm,
    );
    if (at === -1) maxes.push(next);
    else if (maxes[at].testedAt <= testedAt) maxes[at] = next;
  }

  return { tests, maxes };
}

export function findMax(
  maxes: FingerMax[],
  hand: Hand,
  grip: Grip,
  edgeMm: number | null,
): FingerMax | undefined {
  return maxes.find(
    (m) => m.hand === hand && m.grip === grip && (edgeMm === null || m.edgeMm === edgeMm),
  );
}

/** Maxes keyed by hand, ready for buildHangTimeline. */
export function maxByHand(
  maxes: FingerMax[],
  grip: Grip,
  edgeMm: number | null,
): Partial<Record<Hand, number>> {
  const out: Partial<Record<Hand, number>> = {};
  for (const hand of HAND_ORDER) {
    const found = findMax(maxes, hand, grip, edgeMm);
    if (found) out[hand] = found.kg;
  }
  return out;
}
