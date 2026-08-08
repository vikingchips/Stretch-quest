/**
 * Multi-point calibration of the load cell.
 *
 * A strain gauge bridge is linear by construction, so one weight and a tare
 * already determine the line. What more points buy is not a better number —
 * it is evidence. Five points that all sit within half a percent of the fit
 * say the cell is linear and the reference weights are consistent; one point
 * two percent out has found something worth understanding.
 *
 * The trap this is built around: points clustered at 3-20 kg say nothing
 * about 70 kg, however many of them there are. Range beats count, and
 * `coverageWarning` is the part that actually answers "is this trustworthy
 * where I train?".
 */

export interface CalibrationPoint {
  /** The reference weight, in kilograms. */
  kg: number;
  /** Tared ADC counts measured with that weight hanging. */
  counts: number;
  /** ISO timestamp, so an old point can be recognised as old. */
  at: string;
}

export interface CalibrationFit {
  countsPerKg: number;
  points: number;
  /** Per point, signed error as a percentage of that point's own load. */
  residualsPct: number[];
  /** The largest absolute residual. The number worth looking at. */
  worstResidualPct: number;
  /** Heaviest reference weight in the set. */
  maxKg: number;
}

/**
 * Least squares through the tared origin: slope = Σ(kg·counts) / Σ(kg²).
 *
 * Forced through zero on purpose. The tare already established where zero
 * is, and letting the fit invent an intercept would quietly absorb a bad
 * tare into the calibration instead of showing it as drift.
 */
export function fitCalibration(points: CalibrationPoint[]): CalibrationFit | null {
  const usable = points.filter((p) => p.kg > 0 && Number.isFinite(p.counts));
  if (usable.length === 0) return null;

  let sumKgCounts = 0;
  let sumKgSquared = 0;
  for (const p of usable) {
    sumKgCounts += p.kg * p.counts;
    sumKgSquared += p.kg * p.kg;
  }
  if (sumKgSquared === 0) return null;
  const countsPerKg = sumKgCounts / sumKgSquared;
  if (!Number.isFinite(countsPerKg) || countsPerKg === 0) return null;

  // Expressed against each point's own load rather than against full scale:
  // "this point is 2% out" is a sentence you can act on.
  const residualsPct = usable.map((p) => ((p.counts / countsPerKg - p.kg) / p.kg) * 100);

  return {
    countsPerKg,
    points: usable.length,
    residualsPct,
    worstResidualPct: Math.max(...residualsPct.map(Math.abs)),
    maxKg: Math.max(...usable.map((p) => p.kg)),
  };
}

/**
 * Whether the reference weights reach the loads actually being trained at.
 *
 * This is the question multi-point calibration exists to answer, and the one
 * a fit alone cannot: residuals only describe the range they were measured
 * over. Past the heaviest point everything is extrapolation, however tidy
 * the numbers look.
 */
export function coverageWarning(fit: CalibrationFit | null, trainingKg: number): string | null {
  if (!fit || trainingKg <= 0) return null;
  if (fit.maxKg >= trainingKg) return null;
  const factor = trainingKg / fit.maxKg;
  return (
    `Your heaviest reference weight is ${fit.maxKg.toFixed(1)} kg, but you train up to ` +
    `${trainingKg.toFixed(0)} kg — ${factor.toFixed(1)}× beyond it. Everything above ` +
    `${fit.maxKg.toFixed(1)} kg is extrapolation. Water is the easy fix: a litre is a ` +
    `kilogram, so a bucket filled in stages reaches any load you like.`
  );
}

/** How much to trust the fit, in one word, for the summary line. */
export function fitQuality(fit: CalibrationFit): 'good' | 'fair' | 'suspect' {
  if (fit.points < 2) return 'fair';
  if (fit.worstResidualPct <= 1) return 'good';
  if (fit.worstResidualPct <= 3) return 'fair';
  return 'suspect';
}
