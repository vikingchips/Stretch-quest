/**
 * The calibration pull that opens every game visit.
 *
 * One hard pull sets what 100% means for this hand today. It replaces any
 * dependency on the max test: the games scale to the pull you actually showed
 * up with, and they never write back to the training max — that number only
 * ever comes from the proper test.
 *
 * The machine watches the smoothed force: it arms on first contact, tracks
 * the peak, and settles once the pull has clearly fallen away from it. A
 * token pull is rejected rather than accepted as a scale — a 3 kg "max"
 * would make every game trivial and every score meaningless.
 */

export const CALIBRATION = {
  /** Contact: below this the hand is not on the board yet. */
  armKg: 2,
  /** A peak under this is not a calibration, it is a touch. */
  minPeakKg: 8,
  /** Settled: the pull has dropped to this fraction of the peak... */
  dropFrac: 0.55,
  /** ...for this long. */
  settleSec: 0.7,
  /** Hard stop — nobody holds a true max longer than this. */
  maxPullSec: 12,
} as const;

export interface CalibrationState {
  phase: 'waiting' | 'pulling' | 'done';
  /** Seconds since the pull armed. */
  t: number;
  peakKg: number;
  /** Consecutive seconds spent below dropFrac of the peak. */
  settledSec: number;
  /** Set when a pull ended below minPeakKg, so the UI can say "properly". */
  rejected: boolean;
}

export function initCalibration(): CalibrationState {
  return { phase: 'waiting', t: 0, peakKg: 0, settledSec: 0, rejected: false };
}

export function stepCalibration(
  state: CalibrationState,
  dt: number,
  kg: number,
): CalibrationState {
  if (state.phase === 'done') return state;

  if (state.phase === 'waiting') {
    if (kg < CALIBRATION.armKg) return state;
    return { ...state, phase: 'pulling', t: 0, peakKg: kg, settledSec: 0 };
  }

  const t = state.t + dt;
  const peakKg = Math.max(state.peakKg, kg);
  const settled = kg < peakKg * CALIBRATION.dropFrac;
  const settledSec = settled ? state.settledSec + dt : 0;

  const finished = settledSec >= CALIBRATION.settleSec || t >= CALIBRATION.maxPullSec;
  if (!finished) return { ...state, t, peakKg, settledSec };

  if (peakKg < CALIBRATION.minPeakKg) {
    // Back to waiting rather than done: a touch is not a scale. The flag
    // lets the screen ask for a proper pull instead of silently looping.
    return { phase: 'waiting', t: 0, peakKg: 0, settledSec: 0, rejected: true };
  }
  return { ...state, phase: 'done', t, peakKg, settledSec };
}
