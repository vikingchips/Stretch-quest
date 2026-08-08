import { describe, expect, it } from 'vitest';
import {
  coverageWarning,
  fitCalibration,
  fitQuality,
  type CalibrationPoint,
} from './calibration';

const AT = '2026-08-07T10:00:00.000Z';

/** A point from a perfectly linear cell at `factor` counts per kg. */
function point(kg: number, factor = 14000, errorPct = 0): CalibrationPoint {
  return { kg, counts: kg * factor * (1 + errorPct / 100), at: AT };
}

describe('fitCalibration', () => {
  it('recovers the slope of a perfectly linear cell', () => {
    const fit = fitCalibration([point(8.5), point(12.1), point(20.6)])!;
    expect(fit.countsPerKg).toBeCloseTo(14000, 6);
    expect(fit.worstResidualPct).toBeCloseTo(0, 6);
    expect(fit.points).toBe(3);
  });

  it('reduces to plain division for a single point', () => {
    // The one-weight path has to keep working, and it is the same formula:
    // one point through the origin is a line.
    const fit = fitCalibration([{ kg: 20.6, counts: 288400, at: AT }])!;
    expect(fit.countsPerKg).toBeCloseTo(288400 / 20.6, 6);
    expect(fit.worstResidualPct).toBeCloseTo(0, 6);
  });

  it('reports which point disagrees, and by how much', () => {
    // This is the whole reason for multi-point: a weight that is not what it
    // says, or a cell that bends, shows up as a residual instead of quietly
    // shifting the slope.
    const fit = fitCalibration([point(8.5), point(12.1), point(20.6, 14000, 5)])!;
    expect(fit.worstResidualPct).toBeGreaterThan(2);
    expect(fit.residualsPct).toHaveLength(3);
    // The heaviest point carries the most weight in the fit, so the error
    // lands partly on it and partly on the others.
    expect(Math.abs(fit.residualsPct[2])).toBeGreaterThan(0);
  });

  it('weights heavy points more than light ones', () => {
    // Least squares through the origin scales with kg², which is the right
    // behaviour: the same absolute reading error matters less at 20 kg.
    const heavyOff = fitCalibration([point(3.3), point(20.6, 14000, 10)])!;
    const lightOff = fitCalibration([point(3.3, 14000, 10), point(20.6)])!;
    expect(heavyOff.countsPerKg).toBeGreaterThan(lightOff.countsPerKg);
  });

  it('ignores nonsense points rather than poisoning the fit', () => {
    const fit = fitCalibration([
      point(20.6),
      { kg: 0, counts: 500, at: AT },
      { kg: -5, counts: 100, at: AT },
    ])!;
    expect(fit.points).toBe(1);
    expect(fit.countsPerKg).toBeCloseTo(14000, 6);
  });

  it('returns nothing when there is nothing to fit', () => {
    expect(fitCalibration([])).toBeNull();
    expect(fitCalibration([{ kg: 0, counts: 0, at: AT }])).toBeNull();
  });
});

describe('coverageWarning', () => {
  it('warns when the training load sits beyond every reference weight', () => {
    // The failure this whole feature exists to prevent: five tidy points
    // between 3 and 20 kg, and no idea what happens at 45.
    const fit = fitCalibration([point(3.3), point(8.5), point(20.6)]);
    const warning = coverageWarning(fit, 45)!;
    expect(warning).toContain('20.6');
    expect(warning).toContain('45');
    expect(warning).toMatch(/extrapolation/i);
  });

  it('says nothing once the weights reach the training load', () => {
    const fit = fitCalibration([point(20.6), point(60)]);
    expect(coverageWarning(fit, 45)).toBeNull();
  });

  it('says nothing without a fit or without a load to compare against', () => {
    expect(coverageWarning(null, 45)).toBeNull();
    expect(coverageWarning(fitCalibration([point(20)]), 0)).toBeNull();
  });
});

describe('fitQuality', () => {
  it('calls a tight multi-point fit good', () => {
    expect(fitQuality(fitCalibration([point(8.5), point(20.6)])!)).toBe('good');
  });

  it('never calls a single point good — there is nothing to disagree with', () => {
    expect(fitQuality(fitCalibration([point(20.6)])!)).toBe('fair');
  });

  it('flags a scattered fit as suspect', () => {
    expect(fitQuality(fitCalibration([point(8.5), point(20.6, 14000, 10)])!)).toBe('suspect');
  });
});
