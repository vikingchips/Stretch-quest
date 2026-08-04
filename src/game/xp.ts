import type { XpBreakdown } from '../types';

export const XP_SESSION_CAP = 150;
/** Sessions shorter than this (active seconds) award no XP and no streak credit. */
export const MIN_ACTIVE_SEC = 60;

export const STREAK_MILESTONE_BONUS: Record<number, number> = {
  7: 25,
  30: 50,
  100: 100,
};

export interface XpInput {
  activeSec: number;
  stepsCompleted: number;
  stepsTotal: number;
  /** True when this session pushed today's total over the daily goal for the first time. */
  /** True when this is the first session of the day. */
  firstSessionOfDay: boolean;
  streakBefore: number;
  streakAfter: number;
}

export function sessionQualifies(activeSec: number): boolean {
  return activeSec >= MIN_ACTIVE_SEC;
}

export function computeXp(input: XpInput): XpBreakdown {
  if (!sessionQualifies(input.activeSec)) {
    return { base: 0, activeTime: 0, noSkipBonus: 0, goalBonus: 0, streakMilestoneBonus: 0, total: 0 };
  }
  const base = 10;
  const activeTime = Math.floor(input.activeSec / 30);
  const noSkipBonus =
    input.stepsTotal > 0 && input.stepsCompleted === input.stepsTotal ? 10 : 0;
  const goalBonus = input.firstSessionOfDay ? 15 : 0;
  // Milestones pay only on the session that raises the streak to that exact value.
  const streakMilestoneBonus =
    input.streakAfter > input.streakBefore &&
    input.streakAfter in STREAK_MILESTONE_BONUS
      ? STREAK_MILESTONE_BONUS[input.streakAfter]
      : 0;

  const uncapped = base + activeTime + noSkipBonus + goalBonus + streakMilestoneBonus;
  const total = Math.min(uncapped, XP_SESSION_CAP);
  return { base, activeTime, noSkipBonus, goalBonus, streakMilestoneBonus, total };
}
