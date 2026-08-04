import { describe, expect, it } from 'vitest';
import type { SessionRecord } from '../types';
import { goalMetOnDay, sessionsOnDay, weekMarks } from './dailyGoal';

function session(dateKey: string, activeSec = 600): SessionRecord {
  return {
    id: `s-${dateKey}-${activeSec}`,
    routineId: 'daily-warp',
    routineName: 'Daily Warp',
    category: 'hybrid',
    startedAt: `${dateKey}T08:00:00.000Z`,
    dateKey,
    activeSec,
    stepsCompleted: 8,
    stepsTotal: 8,
    xpEarned: 40,
  };
}

// 2026-03-11 is a Wednesday; that week runs Mon 09 to Sun 15.
const WEDNESDAY = '2026-03-11';

describe('goalMetOnDay', () => {
  it('is met by a single session, however short', () => {
    expect(goalMetOnDay([session(WEDNESDAY, 60)], WEDNESDAY)).toBe(true);
  });

  it('is not met by a session on another day', () => {
    expect(goalMetOnDay([session('2026-03-10')], WEDNESDAY)).toBe(false);
  });

  it('counts multiple sessions on the same day', () => {
    expect(sessionsOnDay([session(WEDNESDAY, 600), session(WEDNESDAY, 300)], WEDNESDAY)).toBe(2);
  });
});

describe('weekMarks', () => {
  it('runs Monday to Sunday around the given day', () => {
    const marks = weekMarks([], [], WEDNESDAY);
    expect(marks).toHaveLength(7);
    expect(marks[0].dateKey).toBe('2026-03-09');
    expect(marks[6].dateKey).toBe('2026-03-15');
  });

  it('treats Sunday as the last day of its week, not the first', () => {
    const marks = weekMarks([], [], '2026-03-15');
    expect(marks[0].dateKey).toBe('2026-03-09');
    expect(marks[6].isToday).toBe(true);
  });

  it('marks done, frozen and future days apart', () => {
    const marks = weekMarks([session('2026-03-09')], ['2026-03-10'], WEDNESDAY);
    expect(marks[0].done).toBe(true);
    expect(marks[1].frozen).toBe(true);
    expect(marks[1].done).toBe(false);
    expect(marks[2].done).toBe(false); // today, not done yet
    expect(marks[3].isFuture).toBe(true);
    expect(marks[2].isFuture).toBe(false);
  });
});
