import { describe, expect, it } from 'vitest';
import { CALIBRATION, initCalibration, stepCalibration, type CalibrationState } from './calibrate';

/** Run a scripted pull: [seconds, kg] pairs at 50 ms steps. */
function run(segments: Array<[number, number]>, from = initCalibration()): CalibrationState {
  let state = from;
  for (const [sec, kg] of segments) {
    for (let t = 0; t < sec; t += 0.05) state = stepCalibration(state, 0.05, kg);
  }
  return state;
}

describe('calibration', () => {
  it('waits until there is contact', () => {
    const state = run([[2, 0.5]]);
    expect(state.phase).toBe('waiting');
  });

  it('captures the peak and settles once the pull falls away', () => {
    const state = run([
      [0.5, 10],
      [1, 42],
      [1, 5],
    ]);
    expect(state.phase).toBe('done');
    expect(state.peakKg).toBe(42);
  });

  it('does not settle while the pull is still near the peak', () => {
    const state = run([
      [0.5, 20],
      [2, 40],
      [1, 30], // 75% of peak — above dropFrac, still pulling
    ]);
    expect(state.phase).toBe('pulling');
  });

  it('a momentary dip does not settle it', () => {
    const state = run([
      [1, 40],
      [0.3, 10], // shorter than settleSec
      [0.5, 40],
    ]);
    expect(state.phase).toBe('pulling');
  });

  it('rejects a token pull and returns to waiting with the flag set', () => {
    const state = run([
      [1, 4],
      [1.5, 0],
    ]);
    expect(state.phase).toBe('waiting');
    expect(state.rejected).toBe(true);
    expect(state.peakKg).toBe(0);
  });

  it('a real pull after a rejected one succeeds', () => {
    const rejected = run([
      [1, 4],
      [1.5, 0],
    ]);
    const state = run(
      [
        [1, 35],
        [1.5, 2],
      ],
      rejected,
    );
    expect(state.phase).toBe('done');
    expect(state.peakKg).toBe(35);
  });

  it('hard-stops a pull that never lets go', () => {
    const state = run([[CALIBRATION.maxPullSec + 1, 30]]);
    expect(state.phase).toBe('done');
    expect(state.peakKg).toBe(30);
  });

  it('done is terminal', () => {
    const done = run([
      [1, 40],
      [1, 2],
    ]);
    expect(stepCalibration(done, 0.05, 60)).toBe(done);
  });
});
