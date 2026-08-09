import { describe, expect, it } from 'vitest';
import { buildPlan, dayComplete, targetProgress, type PlanInput } from './plan';
import type { FingerSessionRecord } from '../finger/types';
import type { SessionRecord } from '../types';

const TODAY = '2026-08-07';
const NOW = new Date(`${TODAY}T20:00:00.000Z`).getTime();

function stretch(dateKey: string, routineId: string, category = 'hybrid'): SessionRecord {
  return {
    id: `${routineId}-${dateKey}-${Math.random()}`,
    routineId,
    routineName: routineId,
    category: category as SessionRecord['category'],
    startedAt: `${dateKey}T08:00:00.000Z`,
    dateKey,
    activeSec: 360,
    stepsCompleted: 6,
    stepsTotal: 6,
    xpEarned: 28,
  };
}

function hang(dateKey: string, programId: 'abrahangs' | 'max-hangs'): FingerSessionRecord {
  return {
    id: `${programId}-${dateKey}-${Math.random()}`,
    programId,
    startedAt: `${dateKey}T07:00:00.000Z`,
    dateKey,
    activeSec: 240,
    setsCompleted: 24,
    setsTotal: 24,
    sets: [],
    edgeMm: 20,
    maxSnapshotKg: { left: 48 },
  };
}

function input(over: Partial<PlanInput> = {}): PlanInput {
  return {
    sessions: [],
    fingerSessions: [],
    today: TODAY,
    fingerEnabled: true,
    hasMax: true,
    lastAbrahangsAt: null,
    now: NOW,
    ...over,
  };
}

describe('buildPlan', () => {
  it('splits the plan into daily and weekly targets', () => {
    const plan = buildPlan(input());
    const daily = plan.filter((t) => t.period === 'day').map((t) => t.key);
    const weekly = plan.filter((t) => t.period === 'week').map((t) => t.key);
    expect(daily).toEqual(['daily-warp', 'abrahangs']);
    expect(weekly).toEqual(['heavy', 'max-hangs']);
  });

  it('leaves out the hangboard entirely when the module is off', () => {
    const plan = buildPlan(input({ fingerEnabled: false }));
    expect(plan.map((t) => t.key)).toEqual(['daily-warp', 'heavy']);
  });

  it('asks for two abrahangs a day', () => {
    const plan = buildPlan(input({ fingerSessions: [hang(TODAY, 'abrahangs')] }));
    const abrahangs = plan.find((t) => t.key === 'abrahangs')!;
    expect(abrahangs.done).toBe(1);
    expect(abrahangs.target).toBe(2);
  });

  it('counts weekly targets over a rolling seven days', () => {
    const plan = buildPlan(
      input({
        sessions: [
          // The window is today and the six days before it.
          stretch('2026-08-01', 'hip-nebula', 'heavy'), // six days back, inside
          stretch('2026-07-31', 'lower-orbit', 'heavy'), // seven days back, outside
        ],
      }),
    );
    expect(plan.find((t) => t.key === 'heavy')!.done).toBe(1);
  });

  it('blocks the hangboard targets until a max exists', () => {
    const plan = buildPlan(input({ hasMax: false }));
    expect(plan.find((t) => t.key === 'abrahangs')!.blocked).toMatch(/max test/);
    expect(plan.find((t) => t.key === 'max-hangs')!.blocked).toMatch(/max test/);
  });

  it('holds the second abrahangs until six hours have passed', () => {
    const plan = buildPlan(
      input({
        fingerSessions: [hang(TODAY, 'abrahangs')],
        lastAbrahangsAt: `${TODAY}T18:00:00.000Z`, // two hours ago
      }),
    );
    expect(plan.find((t) => t.key === 'abrahangs')!.blocked).toBe('4 h until the next one');
  });

  it('does not hold this morning against yesterday evening', () => {
    // Nothing done today, so the gap from last night is not a reason to wait.
    const plan = buildPlan(
      input({ lastAbrahangsAt: '2026-08-06T22:00:00.000Z', fingerSessions: [] }),
    );
    expect(plan.find((t) => t.key === 'abrahangs')!.blocked).toBeUndefined();
  });
});

describe('dayComplete', () => {
  it('is false after one abrahangs and no stretching', () => {
    // The bug this exists to fix: the app called that day finished.
    const plan = buildPlan(input({ fingerSessions: [hang(TODAY, 'abrahangs')] }));
    expect(dayComplete(plan)).toBe(false);
  });

  it('is false with the stretching done but only one abrahangs', () => {
    const plan = buildPlan(
      input({
        sessions: [stretch(TODAY, 'daily-warp')],
        fingerSessions: [hang(TODAY, 'abrahangs')],
      }),
    );
    expect(dayComplete(plan)).toBe(false);
  });

  it('is true once both dailies are met', () => {
    const plan = buildPlan(
      input({
        sessions: [stretch(TODAY, 'daily-warp')],
        fingerSessions: [hang(TODAY, 'abrahangs'), hang(TODAY, 'abrahangs')],
      }),
    );
    expect(dayComplete(plan)).toBe(true);
  });

  it('ignores the weekly targets — they are not a daily debt', () => {
    const plan = buildPlan(input({ fingerEnabled: false, sessions: [stretch(TODAY, 'daily-warp')] }));
    expect(plan.find((t) => t.key === 'heavy')!.done).toBe(0);
    expect(dayComplete(plan)).toBe(true);
  });

  it('needs only the stretching when the module is off', () => {
    expect(dayComplete(buildPlan(input({ fingerEnabled: false })))).toBe(false);
    expect(
      dayComplete(
        buildPlan(input({ fingerEnabled: false, sessions: [stretch(TODAY, 'daily-warp')] })),
      ),
    ).toBe(true);
  });
});

describe('targetProgress', () => {
  it('reads as a count against a single target', () => {
    const plan = buildPlan(input({ fingerSessions: [hang(TODAY, 'abrahangs')] }));
    expect(targetProgress(plan.find((t) => t.key === 'abrahangs')!)).toBe('1 of 2');
  });

  it('reads as a count against a range', () => {
    expect(targetProgress(buildPlan(input()).find((t) => t.key === 'heavy')!)).toBe('0 of 2–3');
  });
});
