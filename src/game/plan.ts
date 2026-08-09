import type { FingerSessionRecord } from '../finger/types';
import type { SessionRecord } from '../types';
import { addDays } from './dates';

/**
 * What the plan actually asks for, split by the period it is measured over.
 *
 * The distinction matters and the app used to blur it. Showing up is a daily
 * question and it is what the streak protects. Finishing the plan is a
 * different question, and it was previously answered by "did anything happen
 * today" — so one Abrahangs out of two, with no stretching at all, reported
 * the day as done.
 *
 * The heavy sessions and max hangs are weekly on purpose: two or three a
 * week, not something to be behind on every morning.
 */

export type PlanPeriod = 'day' | 'week';

export interface PlanTarget {
  key: string;
  label: string;
  period: PlanPeriod;
  done: number;
  target: number;
  /** Upper end when the protocol gives a range, e.g. 2-3 a week. */
  targetMax?: number;
  to: string;
  /** Why it cannot be started right now, if it cannot. */
  blocked?: string;
}

export const DAILY_ROUTINE_ID = 'daily-warp';
export const ABRAHANGS_PER_DAY = 2;
export const ABRAHANGS_MIN_GAP_HOURS = 6;
export const HEAVY_PER_WEEK = { lo: 2, hi: 3 } as const;
export const MAX_HANGS_PER_WEEK = { lo: 2, hi: 3 } as const;

export interface PlanInput {
  sessions: SessionRecord[];
  fingerSessions: FingerSessionRecord[];
  today: string;
  fingerEnabled: boolean;
  /** False until a max test exists — every hangboard band depends on it. */
  hasMax: boolean;
  lastAbrahangsAt: string | null;
  /** Injected so the six-hour gap is testable without faking the clock. */
  now?: number;
}

function countToday(sessions: SessionRecord[], today: string, routineId: string): number {
  return sessions.filter((s) => s.dateKey === today && s.routineId === routineId).length;
}

function countWeek<T extends { dateKey: string }>(
  items: T[],
  today: string,
  match: (item: T) => boolean,
): number {
  const from = addDays(today, -6);
  return items.filter((i) => i.dateKey >= from && i.dateKey <= today && match(i)).length;
}

export function buildPlan(input: PlanInput): PlanTarget[] {
  const { sessions, fingerSessions, today, fingerEnabled, hasMax } = input;
  const targets: PlanTarget[] = [];

  targets.push({
    key: 'daily-warp',
    label: 'daily warp',
    period: 'day',
    done: countToday(sessions, today, DAILY_ROUTINE_ID),
    target: 1,
    to: `/routines/${DAILY_ROUTINE_ID}`,
  });

  targets.push({
    key: 'heavy',
    label: 'heavy session',
    period: 'week',
    done: countWeek(sessions, today, (s) => s.category === 'heavy'),
    target: HEAVY_PER_WEEK.lo,
    targetMax: HEAVY_PER_WEEK.hi,
    to: '/routines',
  });

  if (!fingerEnabled) return targets;

  const abrahangsToday = fingerSessions.filter(
    (s) => s.dateKey === today && s.programId === 'abrahangs',
  ).length;
  const hoursSince =
    input.lastAbrahangsAt === null
      ? null
      : ((input.now ?? Date.now()) - new Date(input.lastAbrahangsAt).getTime()) / 3_600_000;
  // Only a gap that started today should hold you back: yesterday evening's
  // session is not a reason to skip this morning's.
  const tooSoon =
    abrahangsToday > 0 && hoursSince !== null && hoursSince < ABRAHANGS_MIN_GAP_HOURS;

  targets.push({
    key: 'abrahangs',
    label: 'abrahangs',
    period: 'day',
    done: abrahangsToday,
    target: ABRAHANGS_PER_DAY,
    to: '/finger/session/abrahangs',
    blocked: !hasMax
      ? 'needs a max test first'
      : tooSoon
        ? `${Math.ceil(ABRAHANGS_MIN_GAP_HOURS - hoursSince!)} h until the next one`
        : undefined,
  });

  targets.push({
    key: 'max-hangs',
    label: 'max hangs',
    period: 'week',
    done: countWeek(fingerSessions, today, (s) => s.programId === 'max-hangs'),
    target: MAX_HANGS_PER_WEEK.lo,
    targetMax: MAX_HANGS_PER_WEEK.hi,
    to: '/finger/session/max-hangs',
    blocked: hasMax ? undefined : 'needs a max test first',
  });

  return targets;
}

export function isTargetDone(target: PlanTarget): boolean {
  return target.done >= target.target;
}

/**
 * Whether today's plan is finished — every daily target met.
 *
 * Deliberately not the same thing as the streak, which only asks whether you
 * turned up. A day can hold the streak and still be unfinished, and saying
 * so is the point.
 */
export function dayComplete(targets: PlanTarget[]): boolean {
  const daily = targets.filter((t) => t.period === 'day');
  return daily.length > 0 && daily.every(isTargetDone);
}

/** "1 of 2" or "2 of 2–3", whichever the target is measured in. */
export function targetProgress(target: PlanTarget): string {
  const of = target.targetMax
    ? `${target.target}–${target.targetMax}`
    : String(target.target);
  return `${target.done} of ${of}`;
}
