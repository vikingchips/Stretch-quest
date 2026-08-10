import { describe, expect, it } from 'vitest';
import type { SessionRecord } from '../types';
import { WEEKLY_TARGET_SEC, weeklyDose } from './dose';

const TODAY = '2026-03-15';

function session(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: 's1',
    routineId: 'daily-warp',
    routineName: 'Daily Warp',
    category: 'hybrid',
    startedAt: `${TODAY}T08:00:00.000Z`,
    dateKey: TODAY,
    activeSec: 360,
    stepsCompleted: 6,
    stepsTotal: 6,
    xpEarned: 40,
    ...overrides,
  };
}

describe('weeklyDose', () => {
  it('credits every area an exercise targets', () => {
    const areas = weeklyDose([session()], TODAY).map((d) => d.area);
    // The primer is hip-led, but the frog rock also credits adductors and the
    // split squat credits ankles — one session, several areas.
    expect(areas).toContain('hips');
    expect(areas).toContain('adductors');
    expect(areas).toContain('ankles');
  });

  it('accumulates across sessions in the window', () => {
    const one = weeklyDose([session()], TODAY);
    const three = weeklyDose(
      [session({ id: 'a' }), session({ id: 'b' }), session({ id: 'c' })],
      TODAY,
    );
    const hipsOne = one.find((d) => d.area === 'hips')!.sec;
    const hipsThree = three.find((d) => d.area === 'hips')!.sec;
    expect(hipsThree).toBe(hipsOne * 3);
  });

  it('excludes sessions older than seven days', () => {
    expect(weeklyDose([session({ dateKey: '2026-03-08' })], TODAY)).toEqual([]);
    expect(weeklyDose([session({ dateKey: '2026-03-09' })], TODAY)).not.toEqual([]);
  });

  it('excludes future-dated sessions', () => {
    expect(weeklyDose([session({ dateKey: '2026-03-16' })], TODAY)).toEqual([]);
  });

  it('scales a partly completed session by how much was done', () => {
    const full = weeklyDose([session()], TODAY).find((d) => d.area === 'hips')!.sec;
    const half = weeklyDose([session({ stepsCompleted: 3 })], TODAY).find(
      (d) => d.area === 'hips',
    )!.sec;
    expect(half).toBe(Math.round(full / 2));
  });

  it('ignores sessions where nothing was completed', () => {
    expect(weeklyDose([session({ stepsCompleted: 0 })], TODAY)).toEqual([]);
  });

  it('cannot attribute areas for custom routines', () => {
    expect(weeklyDose([session({ routineId: 'custom-abc' })], TODAY)).toEqual([]);
  });

  it('flags an area as met only at the weekly target', () => {
    const dose = weeklyDose([session(), session({ id: 'b' })], TODAY);
    for (const d of dose) {
      expect(d.met).toBe(d.sec >= WEEKLY_TARGET_SEC);
      expect(d.fraction).toBeLessThanOrEqual(1);
    }
  });

  it('sorts by seconds, most-worked first', () => {
    const dose = weeklyDose([session()], TODAY);
    const secs = dose.map((d) => d.sec);
    expect([...secs].sort((a, b) => b - a)).toEqual(secs);
  });
});
