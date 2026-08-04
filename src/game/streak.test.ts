import { describe, expect, it } from 'vitest';
import { countActiveDay, evaluateStreak } from './streak';

const base = { streak: 5, streakFreezes: 1, lastActiveDateKey: '2026-08-01' };

describe('evaluateStreak', () => {
  it('keeps the streak on a same-day repeat', () => {
    const r = evaluateStreak(base, '2026-08-01');
    expect(r).toMatchObject({ streak: 5, streakFreezes: 1, streakLost: false });
    expect(r.newlyFrozenDateKeys).toEqual([]);
  });

  it('keeps the streak on the next day', () => {
    const r = evaluateStreak(base, '2026-08-02');
    expect(r).toMatchObject({ streak: 5, streakFreezes: 1, streakLost: false });
  });

  it('consumes one freeze for a single missed day', () => {
    const r = evaluateStreak(base, '2026-08-03');
    expect(r.streak).toBe(5);
    expect(r.streakFreezes).toBe(0);
    expect(r.newlyFrozenDateKeys).toEqual(['2026-08-02']);
    expect(r.streakLost).toBe(false);
  });

  it('consumes two freezes for two missed days', () => {
    const r = evaluateStreak({ ...base, streakFreezes: 2 }, '2026-08-04');
    expect(r.streakFreezes).toBe(0);
    expect(r.newlyFrozenDateKeys).toEqual(['2026-08-02', '2026-08-03']);
    expect(r.streakLost).toBe(false);
  });

  it('resets the streak when freezes are insufficient, without spending them', () => {
    const r = evaluateStreak(base, '2026-08-04'); // 2 missed days, 1 freeze
    expect(r.streak).toBe(0);
    expect(r.streakFreezes).toBe(1);
    expect(r.newlyFrozenDateKeys).toEqual([]);
    expect(r.streakLost).toBe(true);
  });

  it('handles a fresh profile', () => {
    const r = evaluateStreak(
      { streak: 0, streakFreezes: 1, lastActiveDateKey: null },
      '2026-08-02',
    );
    expect(r).toMatchObject({ streak: 0, streakFreezes: 1, streakLost: false });
  });

  it('works across month boundaries', () => {
    const r = evaluateStreak(
      { streak: 3, streakFreezes: 1, lastActiveDateKey: '2026-07-31' },
      '2026-08-01',
    );
    expect(r.streak).toBe(3);
  });

  it('works across year boundaries with a freeze', () => {
    const r = evaluateStreak(
      { streak: 10, streakFreezes: 1, lastActiveDateKey: '2025-12-31' },
      '2026-01-02',
    );
    expect(r.streakFreezes).toBe(0);
    expect(r.newlyFrozenDateKeys).toEqual(['2026-01-01']);
  });
});

describe('countActiveDay', () => {
  it('extends the streak on a new day', () => {
    const r = countActiveDay({ streak: 5, streakFreezes: 1 }, '2026-08-01', '2026-08-02');
    expect(r).toEqual({ streak: 6, streakFreezes: 1, extended: true });
  });

  it('does not extend twice on the same day', () => {
    const r = countActiveDay({ streak: 5, streakFreezes: 1 }, '2026-08-02', '2026-08-02');
    expect(r).toEqual({ streak: 5, streakFreezes: 1, extended: false });
  });

  it('awards a freeze at each 7-day milestone', () => {
    const r = countActiveDay({ streak: 6, streakFreezes: 0 }, '2026-08-01', '2026-08-02');
    expect(r.streak).toBe(7);
    expect(r.streakFreezes).toBe(1);
  });

  it('caps freezes at 2', () => {
    const r = countActiveDay({ streak: 13, streakFreezes: 2 }, '2026-08-01', '2026-08-02');
    expect(r.streak).toBe(14);
    expect(r.streakFreezes).toBe(2);
  });

  it('starts a first streak from zero', () => {
    const r = countActiveDay({ streak: 0, streakFreezes: 1 }, null, '2026-08-02');
    expect(r).toEqual({ streak: 1, streakFreezes: 1, extended: true });
  });
});
