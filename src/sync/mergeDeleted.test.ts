import { describe, expect, it } from 'vitest';
import { mergeFinger, mergeProgress, mergeSessions } from './merge';
import { INITIAL_FINGER_DATA } from '../store/fingerStore';
import type { SessionRecord, UserProgress } from '../types';

/** Distinct start times, so assertions about order mean something. */
const STARTED_AT: Record<string, string> = {
  a: '2026-08-04T08:00:00.000Z',
  b: '2026-08-04T18:00:00.000Z',
};

function session(id: string): SessionRecord {
  return {
    id,
    routineId: 'daily-warp',
    routineName: 'daily warp',
    category: 'hybrid',
    startedAt: STARTED_AT[id] ?? '2026-08-04T12:00:00.000Z',
    dateKey: '2026-08-04',
    activeSec: 600,
    stepsCompleted: 8,
    stepsTotal: 8,
    xpEarned: 30,
  };
}

function progress(over: Partial<UserProgress> = {}): UserProgress {
  return {
    xp: 0,
    streak: 0,
    longestStreak: 0,
    lastActiveDateKey: null,
    streakFreezes: 1,
    frozenDateKeys: [],
    unlockedBadges: {},
    goalMetDateKeys: [],
    ...over,
  };
}

/**
 * The merge is additive on purpose, which is exactly why deletion needs
 * tombstones: without them the union hands a deliberately removed session
 * straight back from whichever device synced last.
 */
describe('deletion across devices', () => {
  it('keeps a deleted session deleted even though the remote still has it', () => {
    const merged = mergeSessions([], [session('a'), session('b')], ['a']);
    expect(merged.map((s) => s.id)).toEqual(['b']);
  });

  it('deletes a session this device still holds locally', () => {
    // The other device did the deleting; the tombstone arrives before the
    // session is gone from here.
    const merged = mergeSessions([session('a')], [session('a')], ['a']);
    expect(merged).toEqual([]);
  });

  it('leaves everything alone when nothing was deleted', () => {
    expect(mergeSessions([session('a')], [session('b')]).map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('accumulates tombstones from both sides', () => {
    const merged = mergeProgress(
      progress({ deletedSessionIds: ['a'] }),
      progress({ deletedSessionIds: ['b'] }),
    );
    expect([...merged.deletedSessionIds!].sort()).toEqual(['a', 'b']);
  });

  it('survives a remote written before tombstones existed', () => {
    const merged = mergeProgress(progress({ deletedSessionIds: ['a'] }), progress());
    expect(merged.deletedSessionIds).toEqual(['a']);
  });

  it('removes the finger detail under the same id', () => {
    // A finger session's sets live in the finger blob keyed by the same id
    // the SessionRecord uses, so one deletion has to reach both.
    const detail = {
      id: 'a',
      programId: 'abrahangs' as const,
      startedAt: '2026-08-04T08:00:00.000Z',
      dateKey: '2026-08-04',
      activeSec: 240,
      setsCompleted: 24,
      setsTotal: 24,
      sets: [],
      edgeMm: 20,
      maxSnapshotKg: {},
    };
    const merged = mergeFinger(
      { ...INITIAL_FINGER_DATA, sessions: [] },
      { sessions: [detail] },
      ['a'],
    );
    expect(merged.sessions).toEqual([]);
  });
});
