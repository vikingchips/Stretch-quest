import type { HangProgram } from './programs';
import type { HangSegment } from './timeline';
import type { FingerSessionRecord, FingerSetResult, ForceSample, Hand } from './types';

/**
 * The hang session state machine.
 *
 * Deliberately shaped like src/session/sessionReducer.ts — same TICK deltas,
 * same pause/skip/back vocabulary — so the timer hook and the player controls
 * carry over unchanged. The difference is that this one also consumes force,
 * at about eighty samples a second.
 *
 * A hang is time-driven, not force-gated: the ten seconds run whether or not
 * you are in the band. The zone feedback is coaching. Cutting a hang short
 * because the load drifted would punish exactly the fatigue the set is meant
 * to produce.
 */

export type Zone = 'under' | 'in' | 'over';

export function classify(kg: number, lo: number, hi: number): Zone {
  if (kg < lo) return 'under';
  if (kg > hi) return 'over';
  return 'in';
}

/**
 * A sample counts the time since the previous one. Capped, because a throttled
 * background tab can deliver two samples a second apart and neither of them
 * describes what happened in between.
 */
const MAX_SAMPLE_GAP_MS = 100;

interface Accumulator {
  sumKg: number;
  n: number;
  peakKg: number;
  msInZone: number;
  msTotal: number;
  lastT: number | null;
}

const EMPTY_ACC: Accumulator = {
  sumKg: 0,
  n: 0,
  peakKg: 0,
  msInZone: 0,
  msTotal: 0,
  lastT: null,
};

export type HangStatus = 'running' | 'paused' | 'finished';

export interface HangState {
  segments: HangSegment[];
  index: number;
  remainingMs: number;
  elapsedMs: number;
  status: HangStatus;
  /** Time under tension: hang segments only. */
  activeMs: number;
  results: FingerSetResult[];
  acc: Accumulator;
  /** Latest reading, for the big number. Not history — the graph owns that. */
  currentKg: number;
}

export type HangEvent =
  | { type: 'TICK'; deltaMs: number }
  | { type: 'FORCE'; sample: ForceSample }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'SKIP' }
  | { type: 'BACK' };

export function initHang(segments: HangSegment[]): HangState {
  return {
    segments,
    index: 0,
    remainingMs: (segments[0]?.durationSec ?? 0) * 1000,
    elapsedMs: 0,
    status: segments.length > 0 ? 'running' : 'finished',
    activeMs: 0,
    results: [],
    acc: EMPTY_ACC,
    currentKg: 0,
  };
}

function foldResult(state: HangState): FingerSetResult[] {
  const segment = state.segments[state.index];
  if (!segment || segment.kind !== 'hang' || state.acc.n === 0) return state.results;
  return [
    ...state.results,
    {
      hand: segment.hand!,
      grip: segment.grip!,
      targetLoKg: segment.targetLoKg ?? 0,
      targetHiKg: segment.targetHiKg ?? 0,
      meanKg: state.acc.sumKg / state.acc.n,
      peakKg: state.acc.peakKg,
      timeInZone: state.acc.msTotal > 0 ? state.acc.msInZone / state.acc.msTotal : 0,
    },
  ];
}

function enterSegment(state: HangState, index: number, results: FingerSetResult[]): HangState {
  if (index >= state.segments.length) {
    return {
      ...state,
      results,
      index: state.segments.length,
      remainingMs: 0,
      elapsedMs: 0,
      status: 'finished',
      acc: EMPTY_ACC,
    };
  }
  return {
    ...state,
    results,
    index,
    remainingMs: state.segments[index].durationSec * 1000,
    elapsedMs: 0,
    status: 'running',
    acc: EMPTY_ACC,
  };
}

/** Fold the current hang's accumulator into a result, then move on. */
function advance(state: HangState, to: number): HangState {
  return enterSegment(state, to, foldResult(state));
}

function indexOfSet(segments: HangSegment[], setIndex: number): number {
  return segments.findIndex((s) => s.kind === 'hang' && s.setIndex === setIndex);
}

export function hangReducer(state: HangState, event: HangEvent): HangState {
  if (state.status === 'finished') return state;

  switch (event.type) {
    case 'FORCE': {
      const segment = state.segments[state.index];
      const { kg, t } = event.sample;
      // Outside a hang the reading is still shown, but nothing is recorded:
      // resting a hand on the board between reps is not training data.
      if (!segment || segment.kind !== 'hang' || state.status !== 'running') {
        return state.currentKg === kg ? state : { ...state, currentKg: kg };
      }
      const dt =
        state.acc.lastT === null ? 0 : Math.min(MAX_SAMPLE_GAP_MS, Math.max(0, t - state.acc.lastT));
      const inZone =
        classify(kg, segment.targetLoKg ?? 0, segment.targetHiKg ?? 0) === 'in';
      return {
        ...state,
        currentKg: kg,
        acc: {
          sumKg: state.acc.sumKg + kg,
          n: state.acc.n + 1,
          peakKg: Math.max(state.acc.peakKg, kg),
          msInZone: state.acc.msInZone + (inZone ? dt : 0),
          msTotal: state.acc.msTotal + dt,
          lastT: t,
        },
      };
    }

    case 'TICK': {
      if (state.status !== 'running') return state;
      const segment = state.segments[state.index];
      const consumed = Math.min(event.deltaMs, state.remainingMs);
      const activeMs = segment.kind === 'hang' ? state.activeMs + consumed : state.activeMs;
      const elapsedMs = state.elapsedMs + event.deltaMs;
      const remainingMs = state.remainingMs - event.deltaMs;
      if (remainingMs > 0) {
        return { ...state, remainingMs, elapsedMs, activeMs };
      }
      return advance({ ...state, activeMs }, state.index + 1);
    }

    case 'PAUSE':
      return state.status === 'running' ? { ...state, status: 'paused' } : state;

    case 'RESUME':
      // The sample clock restarts: the gap while paused is not hang time.
      return state.status === 'paused'
        ? { ...state, status: 'running', acc: { ...state.acc, lastT: null } }
        : state;

    case 'SKIP':
      // A skipped hang still records what it measured — you did hang, briefly.
      return advance(state, state.index + 1);

    case 'BACK': {
      const segment = state.segments[state.index];
      // Redo the current hang from the start; from a rest, redo the hang
      // before it. Results from the abandoned attempt are dropped.
      const currentSet =
        segment.kind === 'hang' && state.elapsedMs < 2000 ? segment.setIndex - 1 : segment.setIndex;
      const target = indexOfSet(state.segments, Math.max(0, currentSet));
      if (target === -1) return state;
      return enterSegment(state, target, state.results.slice(0, Math.max(0, currentSet)));
    }

    default:
      return state;
  }
}

export function hangProgress(state: HangState): number {
  const totalMs = state.segments.reduce((sum, s) => sum + s.durationSec * 1000, 0);
  if (totalMs === 0) return 1;
  let elapsed = 0;
  for (let i = 0; i < state.index && i < state.segments.length; i++) {
    elapsed += state.segments[i].durationSec * 1000;
  }
  if (state.index < state.segments.length) {
    elapsed += state.segments[state.index].durationSec * 1000 - state.remainingMs;
  }
  return Math.min(1, Math.max(0, elapsed / totalMs));
}

export interface HangSummaryInput {
  state: HangState;
  program: HangProgram;
  edgeMm: number;
  maxByHand: Partial<Record<Hand, number>>;
  startedAt: string;
  dateKey: string;
  id: string;
}

export function hangSummary(input: HangSummaryInput): FingerSessionRecord {
  const { state, program, edgeMm, maxByHand, startedAt, dateKey, id } = input;
  return {
    id,
    programId: program.id,
    startedAt,
    dateKey,
    activeSec: Math.round(state.activeMs / 1000),
    setsCompleted: state.results.length,
    setsTotal: state.segments.filter((s) => s.kind === 'hang').length,
    sets: state.results,
    edgeMm,
    maxSnapshotKg: { ...maxByHand },
  };
}

/**
 * True when an Abrahangs session was pulled harder than the protocol wants.
 *
 * Worth saying out loud afterwards, because the instinct is always to add
 * load, and here that instinct is wrong — the study's effect came at about
 * forty percent of max.
 */
export function abrahangsTooHeavy(sets: FingerSetResult[]): boolean {
  if (sets.length === 0) return false;
  const mean = sets.reduce((sum, s) => sum + s.meanKg, 0) / sets.length;
  const bandHi = sets.reduce((sum, s) => sum + s.targetHiKg, 0) / sets.length;
  return bandHi > 0 && mean > bandHi;
}
