import type { BodyArea, SessionRecord } from '../types';
import { BUILTIN_ROUTINE_BY_ID } from '../data/routines';
import { EXERCISE_BY_ID } from '../data/exercises';
import { addDays, dateKeyOf } from './dates';

/**
 * Flexibility gains plateau at roughly ten minutes per week per target muscle
 * — past that you are spending time for nothing. Tracking weekly seconds per
 * area is therefore more useful than a lifetime total: it shows which areas
 * are under the threshold and which are already saturated.
 */
export const WEEKLY_TARGET_SEC = 600;

export interface AreaDose {
  area: BodyArea;
  sec: number;
  /** Fraction of the weekly target, capped at 1 for display. */
  fraction: number;
  met: boolean;
}

/** Seconds of work each body area received in a single session. */
function areaSecondsForRoutine(routineId: string): Map<BodyArea, number> {
  const perArea = new Map<BodyArea, number>();
  const routine = BUILTIN_ROUTINE_BY_ID[routineId];
  if (!routine) return perArea;

  for (const step of routine.steps) {
    const exercise = EXERCISE_BY_ID[step.exerciseId];
    if (!exercise) continue;
    const sets = Math.max(1, step.sets ?? 1);
    const sides = exercise.side === 'per-side' ? 2 : 1;
    const sec = step.durationSec * sets * sides;
    // An exercise credits every area it targets: a Cossack squat really is
    // adductor work and hip work at the same time.
    for (const area of exercise.targetAreas) {
      perArea.set(area, (perArea.get(area) ?? 0) + sec);
    }
  }
  return perArea;
}

/**
 * Weekly dose per area over the last 7 days (including today).
 *
 * Only built-in routines can be attributed to areas — a custom routine's
 * composition is not stored on the session record, so its minutes count toward
 * streaks and XP but not toward per-area dose.
 */
export function weeklyDose(sessions: SessionRecord[], today: string): AreaDose[] {
  const from = addDays(today, -6);
  const totals = new Map<BodyArea, number>();

  for (const session of sessions) {
    if (session.dateKey < from || session.dateKey > today) continue;
    // Scale by how much of the routine was actually completed.
    const ratio =
      session.stepsTotal > 0 ? Math.min(1, session.stepsCompleted / session.stepsTotal) : 0;
    if (ratio === 0) continue;
    for (const [area, sec] of areaSecondsForRoutine(session.routineId)) {
      totals.set(area, (totals.get(area) ?? 0) + sec * ratio);
    }
  }

  return [...totals.entries()]
    .map(([area, sec]) => ({
      area,
      sec: Math.round(sec),
      fraction: Math.min(1, sec / WEEKLY_TARGET_SEC),
      met: sec >= WEEKLY_TARGET_SEC,
    }))
    .sort((a, b) => b.sec - a.sec);
}

/** Convenience for the current week ending today. */
export function weeklyDoseToday(sessions: SessionRecord[]): AreaDose[] {
  return weeklyDose(sessions, dateKeyOf(new Date()));
}
