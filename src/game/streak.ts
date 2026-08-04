import type { UserProgress } from '../types';
import { addDays, daysBetween } from './dates';

export const MAX_FREEZES = 2;
export const STARTING_FREEZES = 1;
/** A new freeze is earned every FREEZE_EARN_INTERVAL days of streak. */
export const FREEZE_EARN_INTERVAL = 7;

export interface StreakEvaluation {
  streak: number;
  streakFreezes: number;
  /** Days (dateKeys) newly saved by consuming a freeze. */
  newlyFrozenDateKeys: string[];
  /** True when the streak was reset to 0 because freezes ran out. */
  streakLost: boolean;
}

/**
 * Reconcile the stored streak with the calendar. Pure: call on app open and
 * before counting a new session, passing today's local dateKey.
 *
 * Gap rules (gap = days since last active day):
 *   0 or 1  -> streak intact (today's session extends it; yesterday chains).
 *   n >= 2  -> the (n - 1) intermediate missed days each consume one freeze;
 *              if freezes run out, the streak resets to 0.
 */
export function evaluateStreak(
  progress: Pick<UserProgress, 'streak' | 'streakFreezes' | 'lastActiveDateKey'>,
  today: string,
): StreakEvaluation {
  const { streak, streakFreezes, lastActiveDateKey } = progress;
  if (lastActiveDateKey === null || streak === 0) {
    return { streak: 0, streakFreezes, newlyFrozenDateKeys: [], streakLost: false };
  }

  const gap = daysBetween(lastActiveDateKey, today);
  if (gap <= 1) {
    return { streak, streakFreezes, newlyFrozenDateKeys: [], streakLost: false };
  }

  const missedDays = gap - 1;
  if (missedDays > streakFreezes) {
    return {
      streak: 0,
      streakFreezes,
      newlyFrozenDateKeys: [],
      streakLost: true,
    };
  }

  const frozen: string[] = [];
  for (let i = 1; i <= missedDays; i++) {
    frozen.push(addDays(lastActiveDateKey, i));
  }
  return {
    streak,
    streakFreezes: streakFreezes - missedDays,
    newlyFrozenDateKeys: frozen,
    streakLost: false,
  };
}

export interface StreakCount {
  streak: number;
  streakFreezes: number;
  /** True when this session extended the streak (new active day). */
  extended: boolean;
}

/**
 * Count a qualifying session on `today` after evaluateStreak has run.
 * Awards a freeze at every FREEZE_EARN_INTERVAL milestone, capped at MAX_FREEZES.
 */
export function countActiveDay(
  evaluated: Pick<StreakEvaluation, 'streak' | 'streakFreezes'>,
  lastActiveDateKey: string | null,
  today: string,
): StreakCount {
  if (lastActiveDateKey === today) {
    return { streak: evaluated.streak, streakFreezes: evaluated.streakFreezes, extended: false };
  }
  const streak = evaluated.streak + 1;
  let freezes = evaluated.streakFreezes;
  if (streak > 0 && streak % FREEZE_EARN_INTERVAL === 0) {
    freezes = Math.min(MAX_FREEZES, freezes + 1);
  }
  return { streak, streakFreezes: freezes, extended: true };
}
