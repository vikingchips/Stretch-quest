import type { Routine, Settings } from '../types';
import { EXERCISE_BY_ID } from '../data/exercises';

export type SegmentKind = 'prep' | 'stretch' | 'switch' | 'rest';

export interface Segment {
  kind: SegmentKind;
  durationSec: number;
  /** Index into routine.steps (the upcoming step for prep/rest segments). */
  stepIndex: number;
  exerciseId?: string;
  sideLabel?: 'Left' | 'Right';
}

export const SWITCH_DURATION_SEC = 3;

/**
 * Flatten a routine into the exact sequence of timed segments:
 * prep -> [stretch (L, switch, R for per-side) -> rest] ... last stretch (no rest).
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

    if (exercise.side === 'per-side') {
      segments.push({
        kind: 'stretch',
        durationSec: step.durationSec,
        stepIndex,
        exerciseId: step.exerciseId,
        sideLabel: 'Left',
      });
      segments.push({
        kind: 'switch',
        durationSec: SWITCH_DURATION_SEC,
        stepIndex,
        exerciseId: step.exerciseId,
      });
      segments.push({
        kind: 'stretch',
        durationSec: step.durationSec,
        stepIndex,
        exerciseId: step.exerciseId,
        sideLabel: 'Right',
      });
    } else {
      segments.push({
        kind: 'stretch',
        durationSec: step.durationSec,
        stepIndex,
        exerciseId: step.exerciseId,
      });
    }

    if (stepIndex < routine.steps.length - 1) {
      segments.push({
        kind: 'rest',
        durationSec: settings.restDurationSec,
        stepIndex: stepIndex + 1,
      });
    }
  });

  return segments;
}

/** Total wall-clock duration of a timeline in seconds. */
export function timelineDurationSec(segments: Segment[]): number {
  return segments.reduce((sum, s) => sum + s.durationSec, 0);
}

/** Total active stretch seconds of a routine (what XP is based on). */
export function routineActiveSec(routine: Routine): number {
  return routine.steps.reduce((sum, step) => {
    const exercise = EXERCISE_BY_ID[step.exerciseId];
    if (!exercise) return sum;
    return sum + step.durationSec * (exercise.side === 'per-side' ? 2 : 1);
  }, 0);
}

/** Estimated total session length shown on routine cards. */
export function routineTotalSec(
  routine: Routine,
  settings: Pick<Settings, 'prepDurationSec' | 'restDurationSec'>,
): number {
  return timelineDurationSec(buildTimeline(routine, settings));
}
