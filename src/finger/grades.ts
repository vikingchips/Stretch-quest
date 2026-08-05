import { GRADE_EDGE_MM, GRADE_EDGE_TOLERANCE_MM } from './constants';
import type { Grip } from './types';

/**
 * Lattice one-arm data, as a percentage of bodyweight on a 20 mm edge in half
 * crimp. Rows marked `medium` are measured datapoints; the rest are linear
 * interpolations between them and are labelled accordingly.
 *
 * The honest framing matters more than the numbers here. Against boulder
 * grade this relationship sits around R² = 0.5 — half the variance, which is
 * a lot for one measurement and nowhere near a prediction. Everything that
 * consumes this table is required to show an interval, the confidence, and
 * GRADE_DISCLAIMER.
 */
export interface GradeRow {
  v: number;
  font?: string;
  /** Two-hand percentage, kept for reference. Unused: this device measures
   *  one hand, and there is no validated conversion between them. */
  pctBw2h?: number;
  pctBw1arm: number;
  confidence: 'medium' | 'low' | 'very-low';
}

export const GRADE_TABLE: GradeRow[] = [
  { v: 4, font: '6B+', pctBw2h: 128, pctBw1arm: 49, confidence: 'medium' },
  { v: 5, pctBw2h: 134, pctBw1arm: 55, confidence: 'low' },
  { v: 6, pctBw2h: 140, pctBw1arm: 61, confidence: 'low' },
  { v: 7, font: '7A+', pctBw2h: 146, pctBw1arm: 67, confidence: 'medium' },
  { v: 8, pctBw2h: 152, pctBw1arm: 73, confidence: 'low' },
  { v: 9, pctBw2h: 158, pctBw1arm: 79, confidence: 'low' },
  { v: 10, pctBw2h: 164, pctBw1arm: 85, confidence: 'low' },
  { v: 11, font: '8A', pctBw2h: 170, pctBw1arm: 91, confidence: 'medium' },
  { v: 12, pctBw1arm: 96, confidence: 'very-low' },
  { v: 13, pctBw1arm: 101, confidence: 'very-low' },
  { v: 14, font: '8B+', pctBw1arm: 106, confidence: 'medium' },
  { v: 15, pctBw1arm: 110, confidence: 'medium' },
  { v: 16, pctBw1arm: 114, confidence: 'medium' },
  { v: 17, pctBw1arm: 118, confidence: 'medium' },
];

export interface GradeEstimate {
  low: number;
  high: number;
  /** The closest row. Never display this on its own. */
  nearest: number;
  confidence: GradeRow['confidence'];
  pctBw: number;
  font?: string;
}

/** Whether an edge counts as "the 20 mm step". */
export function isGradableEdge(edgeMm: number): boolean {
  return Math.abs(edgeMm - GRADE_EDGE_MM) <= GRADE_EDGE_TOLERANCE_MM;
}

/**
 * Why an estimate is unavailable, so the UI can say which rather than going
 * quiet. Smaller edges are fine to train on — there is simply no normative
 * data for them, and inventing some would be worse than saying nothing.
 */
export type GradeBlocker = 'edge' | 'grip' | 'bodyweight' | 'below-table';

export function gradeBlocker(
  peakKg: number,
  bodyweightKg: number,
  edgeMm: number,
  grip: Grip,
): GradeBlocker | null {
  if (grip !== 'half-crimp') return 'grip';
  if (!isGradableEdge(edgeMm)) return 'edge';
  if (!bodyweightKg || bodyweightKg <= 0) return 'bodyweight';
  // The epsilon is float hygiene, not a judgement call: a pull of exactly the
  // bottom row's percentage divides back out a hair under it.
  if ((peakKg / bodyweightKg) * 100 + 1e-9 < GRADE_TABLE[0].pctBw1arm) return 'below-table';
  return null;
}

export function estimateGrade(
  peakKg: number,
  bodyweightKg: number,
  edgeMm: number,
  grip: Grip,
): GradeEstimate | null {
  if (gradeBlocker(peakKg, bodyweightKg, edgeMm, grip) !== null) return null;

  const pctBw = (peakKg / bodyweightKg) * 100;
  let nearest = GRADE_TABLE[0];
  for (const row of GRADE_TABLE) {
    if (Math.abs(row.pctBw1arm - pctBw) < Math.abs(nearest.pctBw1arm - pctBw)) nearest = row;
  }

  // A measured row is worth one grade of doubt; an interpolated one, two.
  const spread = nearest.confidence === 'medium' ? 1 : 2;
  const first = GRADE_TABLE[0].v;
  const last = GRADE_TABLE[GRADE_TABLE.length - 1].v;
  return {
    low: Math.max(first, nearest.v - spread),
    high: Math.min(last, nearest.v + spread),
    nearest: nearest.v,
    confidence: nearest.confidence,
    pctBw,
    font: nearest.font,
  };
}

export function formatGradeRange(estimate: GradeEstimate): string {
  return estimate.low === estimate.high
    ? `v${estimate.low}`
    : `v${estimate.low}–v${estimate.high}`;
}
