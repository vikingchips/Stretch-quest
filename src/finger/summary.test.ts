import { describe, expect, it } from 'vitest';
import { executionScore, handIndicators, scoreLabel } from './summary';
import type { FingerSessionRecord, FingerSetResult, Hand } from './types';

const HANG_SEC = 10;

function set(hand: Hand, meanKg: number, timeInZone: number): FingerSetResult {
  return {
    hand,
    grip: 'half-crimp',
    targetLoKg: 14,
    targetHiKg: 24,
    meanKg,
    peakKg: meanKg + 1,
    timeInZone,
  };
}

function record(sets: FingerSetResult[]): FingerSessionRecord {
  return {
    id: 'r',
    programId: 'abrahangs',
    startedAt: '2026-08-07T08:00:00.000Z',
    dateKey: '2026-08-07',
    activeSec: sets.length * HANG_SEC,
    setsCompleted: sets.length,
    setsTotal: sets.length,
    sets,
    edgeMm: 20,
    maxSnapshotKg: { left: 48, right: 50 },
  };
}

describe('handIndicators', () => {
  it('keeps the hands apart rather than averaging them', () => {
    // The protocol treats them as separate limbs with separate maxes, and an
    // average would hide exactly the asymmetry worth watching.
    const indicators = handIndicators(
      record([set('left', 18, 0.9), set('right', 22, 0.5)]),
      HANG_SEC,
    );
    expect(indicators.map((h) => h.hand)).toEqual(['left', 'right']);
    expect(indicators[0].meanKg).toBe(18);
    expect(indicators[1].meanKg).toBe(22);
  });

  it('converts time in band from a fraction to seconds', () => {
    const [left] = handIndicators(record([set('left', 18, 0.8), set('left', 18, 0.6)]), HANG_SEC);
    expect(left.timeSec).toBe(20);
    expect(left.inZoneSec).toBeCloseTo(14, 6);
    expect(left.inZoneFraction).toBeCloseTo(0.7, 6);
  });

  it('expresses average force against that hand own max', () => {
    const [left, right] = handIndicators(
      record([set('left', 24, 1), set('right', 25, 1)]),
      HANG_SEC,
    );
    expect(left.meanOfMax).toBeCloseTo(24 / 48, 6);
    expect(right.meanOfMax).toBeCloseTo(25 / 50, 6);
  });

  it('reports no percentage when there was no max to compare against', () => {
    const r = { ...record([set('left', 20, 1)]), maxSnapshotKg: {} };
    expect(handIndicators(r, HANG_SEC)[0].meanOfMax).toBeNull();
  });

  it('integrates force over time for the work figure', () => {
    const [left] = handIndicators(record([set('left', 20, 1), set('left', 30, 1)]), HANG_SEC);
    expect(left.impulseKgS).toBe(500);
  });

  it('omits a hand that was never worked', () => {
    expect(handIndicators(record([set('left', 20, 1)]), HANG_SEC)).toHaveLength(1);
  });
});

describe('executionScore', () => {
  it('scores time in the band and nothing else', () => {
    // Rewarding force would push the wrong way on the light daily work,
    // where staying low is the discipline.
    expect(executionScore(handIndicators(record([set('left', 18, 1)]), HANG_SEC))).toBe(5);
    expect(executionScore(handIndicators(record([set('left', 40, 1)]), HANG_SEC))).toBe(5);
    expect(executionScore(handIndicators(record([set('left', 18, 0)]), HANG_SEC))).toBe(0);
  });

  it('averages the hands', () => {
    const score = executionScore(
      handIndicators(record([set('left', 18, 1), set('right', 18, 0.5)]), HANG_SEC),
    );
    expect(score).toBeCloseTo(3.8, 1);
  });

  it('is zero with nothing to score', () => {
    expect(executionScore([])).toBe(0);
  });
});

describe('scoreLabel', () => {
  it('names each band', () => {
    expect(scoreLabel(5)).toBe('excellent');
    expect(scoreLabel(4)).toBe('very good');
    expect(scoreLabel(3)).toBe('fair');
    expect(scoreLabel(2)).toBe('loose');
    expect(scoreLabel(0.5)).toBe('off band');
  });
});
