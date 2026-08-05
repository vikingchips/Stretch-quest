/**
 * Every number the finger protocol depends on, in one place.
 *
 * On the Abrahangs intensity, because it is the one figure most likely to be
 * "corrected" by someone who has watched the video: the band is ~40% of a
 * one-hand max, per the Gilmore/Baar study this protocol comes from. The
 * 70-80% quoted elsewhere is a percentage of pull force with both feet on the
 * floor, which is a different measurement of a different thing. Low load is
 * the point of the protocol, not a compromise in it.
 */

/** Abrahangs: the daily, low-load base. Aim for the middle. */
export const ABRAHANGS_BAND = { lo: 0.3, hi: 0.5, target: 0.4 } as const;

/** Max hangs: the strength stimulus, kept away from the daily work. */
export const MAX_HANGS_BAND = { lo: 0.85, hi: 0.95 } as const;

export const MAX_TEST = {
  pullSecLo: 5,
  pullSecHi: 7,
  attempts: 3,
  restSec: 120,
} as const;

export const RETEST_DEFAULT_DAYS = 28;
export const RETEST_MIN_DAYS = 28;
export const RETEST_MAX_DAYS = 56;

/** Two Abrahangs sessions a day, this far apart at least. */
export const ABRAHANGS_MIN_GAP_HOURS = 6;

/** Max hangs, sessions per week. Below this is under-dosed, above is not more. */
export const MAX_HANGS_PER_WEEK = { lo: 2, hi: 3 } as const;

/**
 * Grade estimates exist only for the ~20 mm edge. There is no normative data
 * for anything smaller, so an estimate off a 15 mm edge would be invented.
 */
export const GRADE_EDGE_MM = 20;
export const GRADE_EDGE_TOLERANCE_MM = 2;

/** Shown with every grade estimate, without exception. */
export const GRADE_DISCLAIMER =
  'finger strength explains about half the variance in boulder grade.';

/** Smoothing window for peak detection, in samples. ~62 ms at 80 SPS. */
export const PEAK_SMOOTHING_SAMPLES = 5;
