import type { SessionRecord, UserProgress } from '../types';
import { addDays } from './dates';

export interface AchievementContext {
  progress: UserProgress;
  sessions: SessionRecord[];
  /** The session just completed (already included in `sessions`), or null when
   * checking outside a session (e.g. after saving a custom routine). */
  newSession: SessionRecord | null;
  /** True when a streak freeze was consumed during this evaluation. */
  freezeConsumed: boolean;
  /** True when the user has saved at least one custom routine. */
  hasCustomRoutine: boolean;
}

type Check = (ctx: AchievementContext) => boolean;

function sessionCount(ctx: AchievementContext): number {
  return ctx.sessions.length;
}

function categoryCount(ctx: AchievementContext, category: string): number {
  return ctx.sessions.filter((s) => s.category === category).length;
}

function startHour(record: SessionRecord): number {
  return new Date(record.startedAt).getHours();
}

function goalMetConsecutive(ctx: AchievementContext, days: number): boolean {
  const met = new Set(ctx.progress.goalMetDateKeys);
  const latest = ctx.newSession?.dateKey;
  if (!latest || !met.has(latest)) return false;
  for (let i = 1; i < days; i++) {
    if (!met.has(addDays(latest, -i))) return false;
  }
  return true;
}

const CHECKS: Record<string, Check> = {
  'first-stretch': (ctx) => sessionCount(ctx) >= 1,
  'ten-sessions': (ctx) => sessionCount(ctx) >= 10,
  'fifty-sessions': (ctx) => sessionCount(ctx) >= 50,
  'hundred-sessions': (ctx) => sessionCount(ctx) >= 100,
  'week-streak': (ctx) => ctx.progress.streak >= 7,
  'month-streak': (ctx) => ctx.progress.streak >= 30,
  'freeze-used': (ctx) => ctx.freezeConsumed,
  'early-bird': (ctx) => ctx.newSession !== null && startHour(ctx.newSession) < 8,
  'night-owl': (ctx) => ctx.newSession !== null && startHour(ctx.newSession) >= 21,
  'crimp-saver': (ctx) => categoryCount(ctx, 'climbing') >= 10,
  'road-runner': (ctx) => categoryCount(ctx, 'running') >= 10,
  architect: (ctx) => ctx.hasCustomRoutine,
  'all-rounder': (ctx) =>
    categoryCount(ctx, 'climbing') >= 1 &&
    categoryCount(ctx, 'running') >= 1 &&
    categoryCount(ctx, 'full-body') >= 1,
  'perfect-week': (ctx) => goalMetConsecutive(ctx, 7),
};

/** Returns ids of achievements newly unlocked in this context. */
export function checkAchievements(ctx: AchievementContext): string[] {
  const unlocked: string[] = [];
  for (const [id, check] of Object.entries(CHECKS)) {
    if (ctx.progress.unlockedBadges[id]) continue;
    if (check(ctx)) unlocked.push(id);
  }
  return unlocked;
}
