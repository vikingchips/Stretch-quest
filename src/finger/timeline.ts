import type { HangProgram } from './programs';
import type { Grip, Hand } from './types';

/**
 * A hang session flattened into segments, the same shape the stretch player
 * uses (src/session/timeline.ts) so the timer and the controls carry over.
 */
export interface HangSegment {
  kind: 'prep' | 'hang' | 'rest' | 'switch';
  durationSec: number;
  hand?: Hand;
  grip?: Grip;
  repIndex?: number;
  repTotal?: number;
  /** Running index across every hang in the session, for the progress bar. */
  setIndex: number;
  targetLoKg?: number;
  targetHiKg?: number;
}

export const HANG_SWITCH_SEC = 3;

const HANDS: Hand[] = ['left', 'right'];

function round1(kg: number): number {
  return Math.round(kg * 10) / 10;
}

/**
 * Bands are a fraction of *that hand's own max*. There is no validated way to
 * convert one hand's strength into the other's, so a hand without a measured
 * max is skipped rather than guessed at.
 */
export function buildHangTimeline(
  program: HangProgram,
  maxByHand: Partial<Record<Hand, number>>,
  prepSec = 5,
): HangSegment[] {
  const segments: HangSegment[] = [];
  let setIndex = 0;
  let first = true;

  for (const grip of program.grips) {
    for (const hand of HANDS) {
      const max = maxByHand[hand];
      if (!max || max <= 0) continue;

      segments.push(
        first
          ? { kind: 'prep', durationSec: prepSec, hand, grip, setIndex }
          : { kind: 'switch', durationSec: HANG_SWITCH_SEC, hand, grip, setIndex },
      );
      first = false;

      for (let rep = 0; rep < program.reps; rep++) {
        segments.push({
          kind: 'hang',
          durationSec: program.hangSec,
          hand,
          grip,
          repIndex: rep + 1,
          repTotal: program.reps,
          setIndex,
          targetLoKg: round1(max * program.band.lo),
          targetHiKg: round1(max * program.band.hi),
        });
        setIndex++;
        // No rest after the last rep of a block: the switch covers it.
        if (rep < program.reps - 1) {
          segments.push({
            kind: 'rest',
            durationSec: program.restSec,
            hand,
            grip,
            setIndex,
          });
        }
      }
    }
  }

  return segments;
}

export function hangCount(segments: HangSegment[]): number {
  return segments.filter((s) => s.kind === 'hang').length;
}

/** Time under tension. Rest and preparation are not the training. */
export function hangTimelineActiveSec(segments: HangSegment[]): number {
  return segments.reduce((sum, s) => (s.kind === 'hang' ? sum + s.durationSec : sum), 0);
}

export function hangTimelineTotalSec(segments: HangSegment[]): number {
  return segments.reduce((sum, s) => sum + s.durationSec, 0);
}
