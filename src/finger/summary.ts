import type { FingerSessionRecord, FingerSetResult, Hand } from './types';

/**
 * What a hang session actually produced, per hand.
 *
 * Deliberately reported per hand rather than averaged: the whole protocol
 * treats them as separate limbs with separate maxes, and an average would
 * hide the asymmetry that is worth watching.
 */
export interface HandIndicators {
  hand: Hand;
  sets: number;
  /** Seconds under tension. */
  timeSec: number;
  /** Seconds spent inside the target band. */
  inZoneSec: number;
  /** Share of the hang time inside the band, 0..1. */
  inZoneFraction: number;
  /** Mean force across the hangs, kg. */
  meanKg: number;
  /** Highest force reached, kg. */
  peakKg: number;
  /** Mean force as a share of that hand's max, or null without one. */
  meanOfMax: number | null;
  /**
   * Force integrated over time, kg·s. The closest single number to "how much
   * work was done", and the one that separates a long light session from a
   * short heavy one when both sit in the band.
   */
  impulseKgS: number;
}

function forHand(sets: FingerSetResult[], hand: Hand, hangSec: number, maxKg?: number) {
  const own = sets.filter((s) => s.hand === hand);
  if (own.length === 0) return null;

  const timeSec = own.length * hangSec;
  const inZoneSec = own.reduce((sum, s) => sum + s.timeInZone * hangSec, 0);
  const meanKg = own.reduce((sum, s) => sum + s.meanKg, 0) / own.length;

  return {
    hand,
    sets: own.length,
    timeSec,
    inZoneSec,
    inZoneFraction: timeSec > 0 ? inZoneSec / timeSec : 0,
    meanKg,
    peakKg: Math.max(...own.map((s) => s.peakKg)),
    meanOfMax: maxKg && maxKg > 0 ? meanKg / maxKg : null,
    impulseKgS: own.reduce((sum, s) => sum + s.meanKg * hangSec, 0),
  } satisfies HandIndicators;
}

export function handIndicators(
  record: FingerSessionRecord,
  hangSec: number,
): HandIndicators[] {
  return (['left', 'right'] as const)
    .map((hand) => forHand(record.sets, hand, hangSec, record.maxSnapshotKg[hand]))
    .filter((h): h is HandIndicators => h !== null);
}

/**
 * How well the session was executed, 0-5.
 *
 * Time in the band is the whole of it. Not how hard you pulled — the band
 * already encodes that, and rewarding force would push exactly the wrong way
 * on the light daily work, where staying low is the discipline.
 */
export function executionScore(indicators: HandIndicators[]): number {
  if (indicators.length === 0) return 0;
  const mean =
    indicators.reduce((sum, h) => sum + h.inZoneFraction, 0) / indicators.length;
  return Math.round(mean * 5 * 10) / 10;
}

export function scoreLabel(score: number): string {
  if (score >= 4.5) return 'excellent';
  if (score >= 3.5) return 'very good';
  if (score >= 2.5) return 'fair';
  if (score >= 1.5) return 'loose';
  return 'off band';
}
