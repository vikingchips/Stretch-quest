import { describe, expect, it } from 'vitest';
import { computeXp, XP_SESSION_CAP } from './xp';

const base = {
  activeSec: 600,
  stepsCompleted: 5,
  stepsTotal: 5,
  firstSessionOfDay: false,
  streakBefore: 3,
  streakAfter: 4,
};

describe('computeXp', () => {
  it('awards base + time + no-skip for a full 10-minute session', () => {
    const r = computeXp(base);
    expect(r.base).toBe(10);
    expect(r.activeTime).toBe(20);
    expect(r.noSkipBonus).toBe(10);
    expect(r.total).toBe(40);
  });

  it('withholds the no-skip bonus when steps were skipped', () => {
    const r = computeXp({ ...base, stepsCompleted: 4 });
    expect(r.noSkipBonus).toBe(0);
    expect(r.total).toBe(30);
  });

  it('adds the goal bonus the first time the daily goal is met', () => {
    const r = computeXp({ ...base, firstSessionOfDay: true });
    expect(r.goalBonus).toBe(15);
    expect(r.total).toBe(55);
  });

  it('pays the 7-day milestone only when the streak increases to 7', () => {
    const hit = computeXp({ ...base, streakBefore: 6, streakAfter: 7 });
    expect(hit.streakMilestoneBonus).toBe(25);
    const repeat = computeXp({ ...base, streakBefore: 7, streakAfter: 7 });
    expect(repeat.streakMilestoneBonus).toBe(0);
  });

  it('pays 50 at day 30 and 100 at day 100', () => {
    expect(computeXp({ ...base, streakBefore: 29, streakAfter: 30 }).streakMilestoneBonus).toBe(50);
    expect(computeXp({ ...base, streakBefore: 99, streakAfter: 100 }).streakMilestoneBonus).toBe(100);
  });

  it('awards nothing below the 60-second qualification floor', () => {
    const r = computeXp({ ...base, activeSec: 59 });
    expect(r.total).toBe(0);
  });

  it('caps the total at 150', () => {
    const r = computeXp({
      activeSec: 3600,
      stepsCompleted: 10,
      stepsTotal: 10,
      firstSessionOfDay: true,
      streakBefore: 99,
      streakAfter: 100,
    });
    expect(r.total).toBe(XP_SESSION_CAP);
  });
});
