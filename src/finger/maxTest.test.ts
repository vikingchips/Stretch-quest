import { describe, expect, it } from 'vitest';
import {
  applyTestResult,
  bestOf,
  endAttempt,
  feedAttempt,
  initAttempt,
  initMaxTest,
  maxByHand,
  skipToNextHand,
  type AttemptState,
} from './maxTest';
import type { FingerMax } from './types';

/** Steady pull at 80 SPS. */
function feed(state: AttemptState, kg: number, ms: number, fromT = 0): AttemptState {
  let next = state;
  for (let t = fromT; t <= fromT + ms; t += 12.5) {
    next = feedAttempt(next, { t, kg });
  }
  return next;
}

describe('feedAttempt', () => {
  it('smooths away a single-sample spike', () => {
    // An unsmoothed peak would enshrine one bad ADC reading as the max and
    // then set every future session's load from it.
    let state = initAttempt();
    state = feed(state, 40, 500);
    state = feedAttempt(state, { t: 600, kg: 400 });
    expect(state.peakKg).toBeLessThan(120);
    expect(state.peakKg).toBeGreaterThan(40);
  });

  it('tracks the peak of a real pull', () => {
    let state = initAttempt();
    state = feed(state, 30, 400, 0);
    state = feed(state, 46, 400, 400);
    state = feed(state, 38, 400, 800);
    expect(state.peakKg).toBeCloseTo(46, 0);
  });

  it('does not arm on noise around zero', () => {
    let state = initAttempt();
    state = feed(state, 0.4, 2000);
    expect(state.started).toBe(false);
    expect(state.done).toBe(false);
  });

  it('ends itself once the pull is released', () => {
    let state = initAttempt();
    state = feed(state, 45, 3000, 0);
    expect(state.done).toBe(false);
    state = feed(state, 1, 1200, 3000);
    expect(state.done).toBe(true);
  });

  it('keeps its peak after ending', () => {
    let state = initAttempt();
    state = feed(state, 45, 3000, 0);
    state = feed(state, 0, 1500, 3000);
    const peak = state.peakKg;
    state = feed(state, 90, 1000, 5000);
    expect(state.peakKg).toBe(peak);
  });
});

describe('max test flow', () => {
  it('works through three attempts on each hand in turn', () => {
    let state = initMaxTest('half-crimp');
    expect(state.hand).toBe('left');
    for (let i = 0; i < 3; i++) {
      state = { ...state, attempt: { ...state.attempt, peakKg: 40 + i } };
      state = endAttempt(state);
    }
    expect(state.hand).toBe('right');
    expect(state.attempts.left).toEqual([40, 41, 42]);
    for (let i = 0; i < 3; i++) {
      state = { ...state, attempt: { ...state.attempt, peakKg: 45 } };
      state = endAttempt(state);
    }
    expect(state.phase).toBe('done');
  });

  it('rests between attempts', () => {
    let state = initMaxTest('half-crimp');
    state = endAttempt({ ...state, attempt: { ...state.attempt, peakKg: 40 } });
    expect(state.phase).toBe('resting');
    expect(state.restRemainingMs).toBe(120_000);
  });

  it('can cut a hand short', () => {
    let state = initMaxTest('half-crimp');
    state = endAttempt({ ...state, attempt: { ...state.attempt, peakKg: 40 } });
    state = skipToNextHand(state);
    expect(state.hand).toBe('right');
    expect(state.attempts.left).toEqual([40]);
  });

  it('takes the best of the attempts', () => {
    expect(bestOf([40, 44, 41])).toBe(44);
    expect(bestOf([])).toBe(0);
  });
});

describe('applyTestResult', () => {
  const base = {
    edgeMm: 20,
    bodyweightKg: 70,
    testedAt: '2026-08-05T10:00:00.000Z',
    dateKey: '2026-08-05',
    makeId: (() => {
      let n = 0;
      return () => `id-${n++}`;
    })(),
  };

  function finished(left: number[], right: number[]) {
    return {
      ...initMaxTest('half-crimp' as const),
      phase: 'done' as const,
      attempts: { left, right },
    };
  }

  it('stores one test per hand and keeps every attempt', () => {
    const { tests } = applyTestResult({
      ...base,
      state: finished([40, 42], [45, 44]),
      existing: [],
    });
    expect(tests).toHaveLength(2);
    expect(tests[0].hand).toBe('left');
    expect(tests[0].attemptsKg).toEqual([40, 42]);
  });

  it('keeps the hands separate', () => {
    const { maxes } = applyTestResult({
      ...base,
      state: finished([40, 42], [45, 44]),
      existing: [],
    });
    expect(maxes.find((m) => m.hand === 'left')!.kg).toBe(42);
    expect(maxes.find((m) => m.hand === 'right')!.kg).toBe(45);
  });

  it('lets a newer test lower the max', () => {
    // The entire point of retesting. Nothing is lost: the old test stays in
    // history either way.
    const existing: FingerMax[] = [
      { hand: 'left', grip: 'half-crimp', kg: 50, edgeMm: 20, testedAt: '2026-01-01T00:00:00.000Z' },
    ];
    const { maxes } = applyTestResult({ ...base, state: finished([42], []), existing });
    expect(maxes).toHaveLength(1);
    expect(maxes[0].kg).toBe(42);
  });

  it('does not let a stale test overwrite a newer max', () => {
    const existing: FingerMax[] = [
      { hand: 'left', grip: 'half-crimp', kg: 50, edgeMm: 20, testedAt: '2027-01-01T00:00:00.000Z' },
    ];
    const { maxes } = applyTestResult({ ...base, state: finished([42], []), existing });
    expect(maxes[0].kg).toBe(50);
  });

  it('keeps a different edge as a different number', () => {
    const existing: FingerMax[] = [
      { hand: 'left', grip: 'half-crimp', kg: 30, edgeMm: 12, testedAt: '2026-01-01T00:00:00.000Z' },
    ];
    const { maxes } = applyTestResult({ ...base, state: finished([42], []), existing });
    expect(maxes).toHaveLength(2);
  });

  it('skips a hand that was never tested', () => {
    const { tests, maxes } = applyTestResult({
      ...base,
      state: finished([42], []),
      existing: [],
    });
    expect(tests).toHaveLength(1);
    expect(maxes).toHaveLength(1);
  });
});

describe('maxByHand', () => {
  const maxes: FingerMax[] = [
    { hand: 'left', grip: 'half-crimp', kg: 42, edgeMm: 20, testedAt: '2026-08-05T00:00:00.000Z' },
    { hand: 'right', grip: 'half-crimp', kg: 45, edgeMm: 20, testedAt: '2026-08-05T00:00:00.000Z' },
    { hand: 'left', grip: 'front-3-drag', kg: 33, edgeMm: 20, testedAt: '2026-08-05T00:00:00.000Z' },
  ];

  it('picks out one grip on one edge', () => {
    expect(maxByHand(maxes, 'half-crimp', 20)).toEqual({ left: 42, right: 45 });
    expect(maxByHand(maxes, 'front-3-drag', 20)).toEqual({ left: 33 });
  });

  it('returns nothing for an edge that was never tested', () => {
    expect(maxByHand(maxes, 'half-crimp', 12)).toEqual({});
  });
});
