import type { SessionRecord, UserProgress } from '../types';
import { addDays } from './dates';

/**
 * Rebuild the derived parts of progress from the sessions that remain.
 *
 * Needed because sessions can be deleted. Streak, XP and the met-goal days
 * are all statements about the history, so once a session is removed they are
 * claims the history no longer supports, and leaving them would be the app
 * lying about what you did.
 *
 * Badges are deliberately not revoked. You did earn them at the time, and
 * taking one back because the evidence was tidied away later would be a
 * worse outcome than a badge that outlives its session.
 */

export interface Recomputed {
  streak: number;
  longestStreak: number;
  lastActiveDateKey: string | null;
  goalMetDateKeys: string[];
  xp: number;
}

const MAX_GOAL_DAYS = 60;

export function recomputeProgress(
  progress: UserProgress,
  sessions: SessionRecord[],
  today: string,
): Recomputed {
  const days = new Set(sessions.map((s) => s.dateKey));
  const frozen = new Set(progress.frozenDateKeys);

  const sorted = [...days].sort();
  const lastActiveDateKey = sorted[sorted.length - 1] ?? null;

  // A streak stays alive through today until the day is over, so start
  // counting from today when it has a session and from yesterday when it
  // does not.
  let cursor = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  for (;;) {
    if (days.has(cursor)) {
      streak++;
    } else if (!frozen.has(cursor)) {
      break;
    }
    // A frozen day bridges the gap without adding to the count, which is
    // what consuming a freeze has always meant here.
    cursor = addDays(cursor, -1);
  }

  return {
    streak,
    // Kept as a floor rather than recomputed: the session list is capped, so
    // an old peak may have no records left to prove it, and forgetting it
    // would punish longevity.
    longestStreak: Math.max(progress.longestStreak, streak),
    lastActiveDateKey,
    goalMetDateKeys: sorted.slice(-MAX_GOAL_DAYS),
    // Summed rather than carried as a running total, so removing a session
    // removes its XP. The archived figure covers sessions the cap has
    // already trimmed, which are gone from the list but were still earned.
    xp: (progress.xpArchived ?? 0) + sessions.reduce((sum, s) => sum + s.xpEarned, 0),
  };
}
