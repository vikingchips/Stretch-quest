import type { ProgramId } from './programs';

export type Hand = 'left' | 'right';

/**
 * The two grips the protocol uses. Half crimp is the one every number in the
 * grade table was measured on; the open drag is trained but never graded.
 */
export type Grip = 'half-crimp' | 'front-3-drag';

export interface ForceSample {
  /** Milliseconds, from the source's own clock. Only deltas are meaningful. */
  t: number;
  /** Kilograms after tare. Slightly negative values are normal noise. */
  kg: number;
}

export type SourceStatus = 'disconnected' | 'connecting' | 'connected';

/**
 * A measured maximum. Every intensity band in the app is a fraction of one of
 * these, which is why it carries the exact conditions it was measured under —
 * a max on a different edge is a different number, not a better one.
 */
export interface FingerMax {
  hand: Hand;
  grip: Grip;
  kg: number;
  edgeMm: number;
  testedAt: string;
}

export interface FingerTestRecord {
  id: string;
  testedAt: string;
  /** Local calendar day 'YYYY-MM-DD', same convention as SessionRecord. */
  dateKey: string;
  hand: Hand;
  grip: Grip;
  edgeMm: number;
  /** Frozen at test time: a grade estimate from today's weight and last
   *  year's pull would be quietly wrong. */
  bodyweightKg: number;
  /** Peak force per attempt, in order. The best of these becomes the max. */
  attemptsKg: number[];
}

export interface FingerSetResult {
  hand: Hand;
  grip: Grip;
  targetLoKg: number;
  targetHiKg: number;
  meanKg: number;
  peakKg: number;
  /** Fraction of the hang spent inside the target band, 0..1. */
  timeInZone: number;
}

export interface FingerSessionRecord {
  /** Shared with the SessionRecord this session also produced. */
  id: string;
  programId: ProgramId;
  startedAt: string;
  dateKey: string;
  /** Seconds under tension — hang segments only, excluding rest and pauses. */
  activeSec: number;
  setsCompleted: number;
  setsTotal: number;
  sets: FingerSetResult[];
  edgeMm: number;
  /** The maxes the bands were computed from, so an old session can still be
   *  read as a percentage even after a retest moves the numbers. */
  maxSnapshotKg: Partial<Record<Hand, number>>;
}
