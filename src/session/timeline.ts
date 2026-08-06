import type { Routine, Settings } from '../types';
import { EXERCISE_BY_ID } from '../data/exercises';

export type SegmentKind = 'prep' | 'stretch' | 'switch' | 'rest';

export interface Segment {
  kind: SegmentKind;
  /** For self-paced segments this is an estimate used for progress only. */
  durationSec: number;
  /** Index into routine.steps (the upcoming step for prep/rest segments). */
  stepIndex: number;
  exerciseId?: string;
  sideLabel?: 'Left' | 'Right';
  /** 1-based set number and total, present when the step has more than one. */
  setIndex?: number;
  setTotal?: number;
  /**
   * Rep work runs at your own tempo — the clock counts up and waits for you
   * instead of rushing an eccentric.
   */
  selfPaced?: boolean;
  reps?: number;
}

export const SWITCH_DURATION_SEC = 3;

/**
 * Flatten a routine into the exact sequence of segments:
 * prep -> [set (L, switch, R for per-side) -> rest] ... last set (no rest).
 */
export function buildTimeline(
  routine: Routine,
  settings: Pick<Settings, 'prepDurationSec' | 'restDurationSec'>,
): Segment[] {
  const segments: Segment[] = [];
  if (routine.steps.length === 0) return segments;

  segments.push({ kind: 'prep', durationSec: settings.prepDurationSec, stepIndex: 0 });

  routine.steps.forEach((step, stepIndex) => {
    const exercise = EXERCISE_BY_ID[step.exerciseId];
    if (!exercise) return;

    const setTotal = Math.max(1, step.sets ?? 1);
    const selfPaced = exercise.mode === 'reps';
    const reps = selfPaced ? (step.reps ?? exercise.defaultReps) : undefined;

    for (let set = 0; set < setTotal; set++) {
      const setMeta =
        setTotal > 1 ? { setIndex: set + 1, setTotal } : ({} as Record<string, never>);
      const work = {
        kind: 'stretch' as const,
        durationSec: step.durationSec,
        stepIndex,
        exerciseId: step.exerciseId,
        ...setMeta,
        ...(selfPaced ? { selfPaced: true, reps } : {}),
      };

      if (exercise.side === 'per-side') {
        segments.push({ ...work, sideLabel: 'Left' });
        segments.push({
          kind: 'switch',
          durationSec: SWITCH_DURATION_SEC,
          stepIndex,
          exerciseId: step.exerciseId,
          ...setMeta,
        });
        segments.push({ ...work, sideLabel: 'Right' });
      } else {
        segments.push(work);
      }

      // Rest between sets of the same exercise, and between exercises. A step
      // can ask for its own: a minute between loaded sets is the difference
      // between training and a circuit.
      const lastSetOfLastStep = set === setTotal - 1 && stepIndex === routine.steps.length - 1;
      if (!lastSetOfLastStep) {
        segments.push({
          kind: 'rest',
          durationSec: step.restSec ?? settings.restDurationSec,
          stepIndex: set === setTotal - 1 ? stepIndex + 1 : stepIndex,
        });
      }
    }
  });

  return segments;
}

/** Total wall-clock duration of a timeline in seconds. */
export function timelineDurationSec(segments: Segment[]): number {
  return segments.reduce((sum, s) => sum + s.durationSec, 0);
}

/** Total active work seconds of a routine (what XP is based on). */
export function routineActiveSec(routine: Routine): number {
  return routine.steps.reduce((sum, step) => {
    const exercise = EXERCISE_BY_ID[step.exerciseId];
    if (!exercise) return sum;
    const sets = Math.max(1, step.sets ?? 1);
    const sides = exercise.side === 'per-side' ? 2 : 1;
    return sum + step.durationSec * sides * sets;
  }, 0);
}

/** Estimated total session length shown on routine cards. */
export function routineTotalSec(
  routine: Routine,
  settings: Pick<Settings, 'prepDurationSec' | 'restDurationSec'>,
): number {
  return timelineDurationSec(buildTimeline(routine, settings));
}
