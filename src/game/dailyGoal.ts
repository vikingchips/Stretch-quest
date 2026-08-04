import type { SessionRecord } from '../types';
import { addDays, dateFromKey } from './dates';

/**
 * The daily goal is one session, not a number of minutes.
 *
 * A minutes target measured something arbitrary: routines run 9–13 minutes of
 * work depending on which one you pick, so the same honest effort passed or
 * failed depending on the day. Habit research points the same way — what
 * matters is repeating the behaviour. Volume still matters, but it is a
 * weekly, per-muscle question, which is what `game/dose.ts` answers.
 */

/** Total active seconds recorded on a given local day. */
export function activeSecOnDay(sessions: SessionRecord[], dateKey: string): number {
  let total = 0;
  for (const s of sessions) {
    if (s.dateKey === dateKey) total += s.activeSec;
  }
  return total;
}

export function sessionsOnDay(sessions: SessionRecord[], dateKey: string): number {
  let count = 0;
  for (const s of sessions) {
    if (s.dateKey === dateKey) count++;
  }
  return count;
}

export function goalMetOnDay(sessions: SessionRecord[], dateKey: string): boolean {
  return sessionsOnDay(sessions, dateKey) > 0;
}

export interface DayMark {
  dateKey: string;
  done: boolean;
  /** Held by a streak freeze rather than earned. */
  frozen: boolean;
  isToday: boolean;
  isFuture: boolean;
}

/** The Monday-first calendar week containing `today`. */
export function weekMarks(
  sessions: SessionRecord[],
  frozenDateKeys: string[],
  today: string,
): DayMark[] {
  const frozen = new Set(frozenDateKeys);
  const mondayOffset = (dateFromKey(today).getDay() + 6) % 7;
  const monday = addDays(today, -mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const dateKey = addDays(monday, i);
    return {
      dateKey,
      done: goalMetOnDay(sessions, dateKey),
      frozen: frozen.has(dateKey),
      isToday: dateKey === today,
      isFuture: dateKey > today,
    };
  });
}
