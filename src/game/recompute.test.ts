import { describe, expect, it } from 'vitest';
import { recomputeProgress } from './recompute';
import type { SessionRecord, UserProgress } from '../types';

const TODAY = '2026-08-05';

function session(dateKey: string, xpEarned = 30, id = dateKey): SessionRecord {
  return {
    id,
    routineId: 'daily-warp',
    routineName: 'daily warp',
    category: 'hybrid',
    startedAt: `${dateKey}T08:00:00.000Z`,
    dateKey,
    activeSec: 600,
    stepsCompleted: 8,
    stepsTotal: 8,
    xpEarned,
  };
}

function progress(over: Partial<UserProgress> = {}): UserProgress {
  return {
    xp: 0,
    xpArchived: 0,
    streak: 0,
    longestStreak: 0,
    lastActiveDateKey: null,
    streakFreezes: 1,
    frozenDateKeys: [],
    unlockedBadges: {},
    goalMetDateKeys: [],
    deletedSessionIds: [],
    ...over,
  };
}

describe('recomputeProgress', () => {
  it('counts consecutive days ending today', () => {
    const sessions = ['2026-08-03', '2026-08-04', TODAY].map((d) => session(d));
    expect(recomputeProgress(progress(), sessions, TODAY).streak).toBe(3);
  });

  it('keeps a streak alive on a day that has not been used yet', () => {
    // The day is not over. A streak that ended yesterday is still running.
    const sessions = ['2026-08-03', '2026-08-04'].map((d) => session(d));
    expect(recomputeProgress(progress(), sessions, TODAY).streak).toBe(2);
  });

  it('stops at a gap', () => {
    const sessions = ['2026-08-01', '2026-08-04', TODAY].map((d) => session(d));
    expect(recomputeProgress(progress(), sessions, TODAY).streak).toBe(2);
  });

  it('lets a frozen day bridge without counting itself', () => {
    // Consuming a freeze has always preserved the streak rather than adding
    // to it, and recomputing has to agree with that.
    const sessions = ['2026-08-02', '2026-08-04', TODAY].map((d) => session(d));
    const result = recomputeProgress(
      progress({ frozenDateKeys: ['2026-08-03'] }),
      sessions,
      TODAY,
    );
    expect(result.streak).toBe(3);
  });

  it('drops to zero when the history is emptied', () => {
    const result = recomputeProgress(progress({ streak: 40 }), [], TODAY);
    expect(result.streak).toBe(0);
    expect(result.lastActiveDateKey).toBeNull();
    expect(result.xp).toBe(0);
  });

  it('sums xp from the sessions that remain', () => {
    const sessions = [session('2026-08-04', 30), session(TODAY, 45)];
    expect(recomputeProgress(progress(), sessions, TODAY).xp).toBe(75);
  });

  it('keeps xp from sessions the cap has trimmed', () => {
    // Otherwise passing the history cap would quietly delete XP.
    const result = recomputeProgress(progress({ xpArchived: 5000 }), [session(TODAY, 40)], TODAY);
    expect(result.xp).toBe(5040);
  });

  it('holds the best streak as a floor', () => {
    // The session list is capped, so an old peak may have no records left to
    // prove it. Forgetting it would punish longevity.
    const result = recomputeProgress(progress({ longestStreak: 90 }), [session(TODAY)], TODAY);
    expect(result.longestStreak).toBe(90);
  });

  it('raises the best streak when the current one passes it', () => {
    const sessions = ['2026-08-03', '2026-08-04', TODAY].map((d) => session(d));
    expect(recomputeProgress(progress({ longestStreak: 2 }), sessions, TODAY).longestStreak).toBe(
      3,
    );
  });

  it('reports the met-goal days from the sessions themselves', () => {
    const sessions = [session('2026-08-04'), session(TODAY, 30, 'a'), session(TODAY, 30, 'b')];
    expect(recomputeProgress(progress(), sessions, TODAY).goalMetDateKeys).toEqual([
      '2026-08-04',
      TODAY,
    ]);
  });

  it('points last-active at the newest remaining day', () => {
    const sessions = ['2026-07-01', '2026-08-04'].map((d) => session(d));
    expect(recomputeProgress(progress(), sessions, TODAY).lastActiveDateKey).toBe('2026-08-04');
  });
});
