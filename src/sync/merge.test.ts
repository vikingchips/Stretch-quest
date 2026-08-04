import { describe, expect, it } from 'vitest';
import type { Routine, SessionRecord, UserProgress } from '../types';
import { mergeProgress, mergeRoutines, mergeSessions } from './merge';

function session(id: string, startedAt: string): SessionRecord {
  return {
    id,
    routineId: 'daily-warp',
    routineName: 'Daily Warp',
    category: 'hybrid',
    startedAt,
    dateKey: startedAt.slice(0, 10),
    activeSec: 600,
    stepsCompleted: 8,
    stepsTotal: 8,
    xpEarned: 40,
  };
}

function progress(overrides: Partial<UserProgress> = {}): UserProgress {
  return {
    xp: 0,
    streak: 0,
    longestStreak: 0,
    lastActiveDateKey: null,
    streakFreezes: 0,
    frozenDateKeys: [],
    unlockedBadges: {},
    goalMetDateKeys: [],
    ...overrides,
  };
}

describe('mergeSessions', () => {
  it('unions both sides and never drops history', () => {
    const merged = mergeSessions(
      [session('a', '2026-03-01T08:00:00Z')],
      [session('b', '2026-03-02T08:00:00Z')],
    );
    expect(merged.map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('deduplicates by id, keeping the local copy', () => {
    const local = { ...session('a', '2026-03-01T08:00:00Z'), xpEarned: 99 };
    const merged = mergeSessions([local], [session('a', '2026-03-01T08:00:00Z')]);
    expect(merged).toHaveLength(1);
    expect(merged[0].xpEarned).toBe(99);
  });

  it('sorts chronologically', () => {
    const merged = mergeSessions(
      [session('late', '2026-03-05T08:00:00Z')],
      [session('early', '2026-03-01T08:00:00Z')],
    );
    expect(merged.map((s) => s.id)).toEqual(['early', 'late']);
  });
});

describe('mergeProgress', () => {
  it('takes the larger scalars', () => {
    const merged = mergeProgress(
      progress({ xp: 100, longestStreak: 3, streakFreezes: 1 }),
      progress({ xp: 250, longestStreak: 9, streakFreezes: 2 }),
    );
    expect(merged.xp).toBe(250);
    expect(merged.longestStreak).toBe(9);
    expect(merged.streakFreezes).toBe(2);
  });

  it('takes the current streak from whichever side was active most recently', () => {
    const stale = progress({ streak: 40, lastActiveDateKey: '2026-01-01' });
    const fresh = progress({ streak: 2, lastActiveDateKey: '2026-03-10' });
    expect(mergeProgress(stale, fresh).streak).toBe(2);
    expect(mergeProgress(fresh, stale).streak).toBe(2);
  });

  it('unions frozen and goal-met days without duplicates', () => {
    const merged = mergeProgress(
      progress({ frozenDateKeys: ['2026-03-01'], goalMetDateKeys: ['2026-03-01'] }),
      progress({
        frozenDateKeys: ['2026-03-01', '2026-03-02'],
        goalMetDateKeys: ['2026-03-02'],
      }),
    );
    expect(merged.frozenDateKeys).toEqual(['2026-03-01', '2026-03-02']);
    expect(merged.goalMetDateKeys).toEqual(['2026-03-01', '2026-03-02']);
  });

  it('keeps the earliest unlock time for a badge earned on both devices', () => {
    const merged = mergeProgress(
      progress({ unlockedBadges: { 'first-stretch': '2026-03-05T00:00:00Z' } }),
      progress({ unlockedBadges: { 'first-stretch': '2026-01-01T00:00:00Z' } }),
    );
    expect(merged.unlockedBadges['first-stretch']).toBe('2026-01-01T00:00:00Z');
  });

  it('keeps badges that exist on only one side', () => {
    const merged = mergeProgress(
      progress({ unlockedBadges: { architect: '2026-03-05T00:00:00Z' } }),
      progress({ unlockedBadges: { 'early-bird': '2026-01-01T00:00:00Z' } }),
    );
    expect(Object.keys(merged.unlockedBadges).sort()).toEqual(['architect', 'early-bird']);
  });
});

describe('mergeRoutines', () => {
  function routine(id: string, name: string, createdAt?: string): Routine {
    return {
      id,
      name,
      description: '',
      category: 'custom',
      isCustom: true,
      steps: [],
      createdAt,
    };
  }

  it('keeps the most recently created version of the same routine', () => {
    const merged = mergeRoutines(
      [routine('r1', 'newer', '2026-03-05T00:00:00Z')],
      [routine('r1', 'older', '2026-01-01T00:00:00Z')],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].name).toBe('newer');
  });

  it('unions routines that exist on only one side', () => {
    const merged = mergeRoutines([routine('a', 'a')], [routine('b', 'b')]);
    expect(merged.map((r) => r.id).sort()).toEqual(['a', 'b']);
  });
});
