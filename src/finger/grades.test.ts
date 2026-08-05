import { describe, expect, it } from 'vitest';
import { GRADE_TABLE, estimateGrade, gradeBlocker, isGradableEdge } from './grades';

const BW = 70;
/** Body weight percentage -> the kilograms a one-arm pull would show. */
const kgFor = (pct: number) => (pct / 100) * BW;

describe('estimateGrade', () => {
  it('lands on each measured Lattice datapoint', () => {
    for (const row of GRADE_TABLE.filter((r) => r.confidence === 'medium')) {
      const estimate = estimateGrade(kgFor(row.pctBw1arm), BW, 20, 'half-crimp');
      expect(estimate?.nearest, `V${row.v}`).toBe(row.v);
    }
  });

  it('widens the interval where the row is interpolated', () => {
    // V7 is measured, V8 is not. Doubt should show in the interval width.
    const measured = estimateGrade(kgFor(67), BW, 20, 'half-crimp')!;
    const interpolated = estimateGrade(kgFor(73), BW, 20, 'half-crimp')!;
    expect(measured.confidence).toBe('medium');
    expect(measured.high - measured.low).toBe(2);
    expect(interpolated.confidence).toBe('low');
    expect(interpolated.high - interpolated.low).toBe(4);
  });

  it('never claims a grade off the twenty millimetre edge', () => {
    // Smaller edges are fine to train on; there is simply no data to grade
    // them against, and an invented number is worse than none.
    expect(estimateGrade(kgFor(91), BW, 15, 'half-crimp')).toBeNull();
    expect(estimateGrade(kgFor(91), BW, 30, 'half-crimp')).toBeNull();
    expect(gradeBlocker(kgFor(91), BW, 15, 'half-crimp')).toBe('edge');
  });

  it('accepts the tolerance around twenty millimetres', () => {
    expect(isGradableEdge(18)).toBe(true);
    expect(isGradableEdge(22)).toBe(true);
    expect(isGradableEdge(17.9)).toBe(false);
    expect(estimateGrade(kgFor(91), BW, 21, 'half-crimp')).not.toBeNull();
  });

  it('never claims a grade for the open drag', () => {
    expect(estimateGrade(kgFor(91), BW, 20, 'front-3-drag')).toBeNull();
    expect(gradeBlocker(kgFor(91), BW, 20, 'front-3-drag')).toBe('grip');
  });

  it('says nothing below the bottom of the table', () => {
    expect(estimateGrade(kgFor(30), BW, 20, 'half-crimp')).toBeNull();
    expect(gradeBlocker(kgFor(30), BW, 20, 'half-crimp')).toBe('below-table');
  });

  it('needs a bodyweight to divide by', () => {
    expect(estimateGrade(40, 0, 20, 'half-crimp')).toBeNull();
    expect(gradeBlocker(40, 0, 20, 'half-crimp')).toBe('bodyweight');
  });

  it('clamps at the top of the table instead of extrapolating', () => {
    const estimate = estimateGrade(kgFor(200), BW, 20, 'half-crimp')!;
    expect(estimate.high).toBe(17);
    expect(estimate.nearest).toBe(17);
  });

  it('reads a midpoint as the nearer of its neighbours', () => {
    // 52% sits between V4 (49) and V5 (55) — closer to V4.
    expect(estimateGrade(kgFor(51), BW, 20, 'half-crimp')!.nearest).toBe(4);
    expect(estimateGrade(kgFor(53), BW, 20, 'half-crimp')!.nearest).toBe(5);
  });
});

describe('GRADE_TABLE', () => {
  it('increases monotonically', () => {
    for (let i = 1; i < GRADE_TABLE.length; i++) {
      expect(GRADE_TABLE[i].pctBw1arm).toBeGreaterThan(GRADE_TABLE[i - 1].pctBw1arm);
      expect(GRADE_TABLE[i].v).toBe(GRADE_TABLE[i - 1].v + 1);
    }
  });
});
