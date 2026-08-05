import { describe, expect, it } from 'vitest';
import { PROGRAMS } from './programs';
import { buildHangTimeline } from './timeline';
import {
  abrahangsTooHeavy,
  classify,
  hangReducer,
  hangSummary,
  initHang,
  type HangState,
} from './engine';

const SEGMENTS = buildHangTimeline(PROGRAMS['max-hangs'], { left: 40 }, 5);

function run(state: HangState, events: Parameters<typeof hangReducer>[1][]): HangState {
  return events.reduce(hangReducer, state);
}

/** Feed a steady pull at `kg` for `ms`, one sample every 12.5 ms (80 SPS). */
function pull(state: HangState, kg: number, ms: number, fromT = 0): HangState {
  let next = state;
  for (let t = fromT; t <= fromT + ms; t += 12.5) {
    next = hangReducer(next, { type: 'FORCE', sample: { t, kg } });
  }
  return next;
}

describe('classify', () => {
  it('treats the band as inclusive at both edges', () => {
    expect(classify(29.9, 30, 50)).toBe('under');
    expect(classify(30, 30, 50)).toBe('in');
    expect(classify(50, 30, 50)).toBe('in');
    expect(classify(50.1, 30, 50)).toBe('over');
  });
});

describe('hangReducer', () => {
  it('starts on the prep segment, not on a hang', () => {
    const state = initHang(SEGMENTS);
    expect(state.segments[state.index].kind).toBe('prep');
    expect(state.status).toBe('running');
  });

  it('records nothing while resting', () => {
    // Leaning on the board between reps is not training data.
    let state = initHang(SEGMENTS);
    state = pull(state, 35, 2000);
    expect(state.acc.n).toBe(0);
    expect(state.currentKg).toBe(35);
  });

  it('accumulates only during a hang', () => {
    let state = initHang(SEGMENTS);
    state = hangReducer(state, { type: 'TICK', deltaMs: 5000 }); // through prep
    expect(state.segments[state.index].kind).toBe('hang');
    state = pull(state, 36, 1000);
    expect(state.acc.n).toBeGreaterThan(70);
    expect(state.acc.peakKg).toBe(36);
  });

  it('measures time in the zone against time measured, not wall clock', () => {
    let state = initHang(SEGMENTS);
    state = hangReducer(state, { type: 'TICK', deltaMs: 5000 });
    // Band for a 40 kg max is 34–38. Half the hang under it, half inside.
    state = pull(state, 20, 1000, 0);
    state = pull(state, 36, 1000, 1000);
    state = hangReducer(state, { type: 'TICK', deltaMs: 10_000 });
    const set = state.results[0];
    expect(set.timeInZone).toBeGreaterThan(0.45);
    expect(set.timeInZone).toBeLessThan(0.55);
  });

  it('caps the gap a single sample can claim', () => {
    // A throttled tab can deliver two samples a second apart; neither of them
    // describes the second in between.
    let state = initHang(SEGMENTS);
    state = hangReducer(state, { type: 'TICK', deltaMs: 5000 });
    state = hangReducer(state, { type: 'FORCE', sample: { t: 0, kg: 36 } });
    state = hangReducer(state, { type: 'FORCE', sample: { t: 5000, kg: 36 } });
    expect(state.acc.msTotal).toBe(100);
  });

  it('ignores force while paused and does not count the gap', () => {
    let state = initHang(SEGMENTS);
    state = hangReducer(state, { type: 'TICK', deltaMs: 5000 });
    state = pull(state, 36, 500, 0);
    const before = state.acc.msTotal;
    state = hangReducer(state, { type: 'PAUSE' });
    state = pull(state, 36, 2000, 1000);
    expect(state.acc.msTotal).toBe(before);
    state = hangReducer(state, { type: 'RESUME' });
    state = hangReducer(state, { type: 'FORCE', sample: { t: 9000, kg: 36 } });
    // First sample after resuming starts a fresh clock rather than claiming
    // the whole pause.
    expect(state.acc.msTotal).toBe(before);
  });

  it('does not advance the clock while paused', () => {
    let state = initHang(SEGMENTS);
    state = run(state, [{ type: 'PAUSE' }, { type: 'TICK', deltaMs: 60_000 }]);
    expect(state.index).toBe(0);
    expect(state.status).toBe('paused');
  });

  it('folds each hang into a result as it ends', () => {
    let state = initHang(SEGMENTS);
    state = hangReducer(state, { type: 'TICK', deltaMs: 5000 });
    state = pull(state, 36, 5000);
    state = hangReducer(state, { type: 'TICK', deltaMs: 10_000 });
    expect(state.results).toHaveLength(1);
    expect(state.results[0].meanKg).toBeCloseTo(36, 5);
    expect(state.results[0].hand).toBe('left');
    expect(state.results[0].grip).toBe('half-crimp');
    // The accumulator resets for the next hang.
    expect(state.acc.n).toBe(0);
  });

  it('counts only hang seconds as active time', () => {
    let state = initHang(SEGMENTS);
    // Prep 5 s, hang 10 s, rest 120 s.
    state = run(state, [
      { type: 'TICK', deltaMs: 5000 },
      { type: 'TICK', deltaMs: 10_000 },
      { type: 'TICK', deltaMs: 120_000 },
    ]);
    expect(state.activeMs).toBe(10_000);
  });

  it('finishes after the last segment', () => {
    let state = initHang(SEGMENTS);
    for (let i = 0; i < SEGMENTS.length; i++) {
      state = hangReducer(state, { type: 'TICK', deltaMs: 200_000 });
    }
    expect(state.status).toBe('finished');
    expect(hangReducer(state, { type: 'TICK', deltaMs: 1000 })).toBe(state);
  });

  it('keeps what a skipped hang did measure', () => {
    let state = initHang(SEGMENTS);
    state = hangReducer(state, { type: 'TICK', deltaMs: 5000 });
    state = pull(state, 36, 2000);
    state = hangReducer(state, { type: 'SKIP' });
    expect(state.results).toHaveLength(1);
  });

  /** Play through hang 0 and its rest, landing at the start of hang 1. */
  function atSecondHang(): HangState {
    let state = initHang(SEGMENTS);
    state = hangReducer(state, { type: 'TICK', deltaMs: 5000 });
    state = pull(state, 36, 3000);
    state = hangReducer(state, { type: 'TICK', deltaMs: 10_000 });
    return hangReducer(state, { type: 'TICK', deltaMs: 120_000 });
  }

  it('goes back to redo the previous hang when one has barely started', () => {
    let state = atSecondHang();
    state = pull(state, 20, 500);
    state = hangReducer(state, { type: 'BACK' });
    expect(state.segments[state.index].setIndex).toBe(0);
    // Hang 0 is being redone, so its result goes with it.
    expect(state.results).toHaveLength(0);
  });

  it('restarts the current hang once it is under way, keeping earlier ones', () => {
    let state = atSecondHang();
    state = hangReducer(state, { type: 'TICK', deltaMs: 3000 });
    state = pull(state, 20, 1000);
    state = hangReducer(state, { type: 'BACK' });
    expect(state.segments[state.index].setIndex).toBe(1);
    expect(state.results).toHaveLength(1);
    // The abandoned half-hang is discarded rather than folded in.
    expect(state.acc.n).toBe(0);
  });
});

describe('hangSummary', () => {
  it('reports what was completed against what was planned', () => {
    let state = initHang(SEGMENTS);
    state = hangReducer(state, { type: 'TICK', deltaMs: 5000 });
    state = pull(state, 36, 5000);
    state = hangReducer(state, { type: 'TICK', deltaMs: 10_000 });

    const record = hangSummary({
      state,
      program: PROGRAMS['max-hangs'],
      edgeMm: 20,
      maxByHand: { left: 40 },
      startedAt: '2026-08-05T10:00:00.000Z',
      dateKey: '2026-08-05',
      id: 'test-id',
    });
    expect(record.setsCompleted).toBe(1);
    expect(record.setsTotal).toBe(6);
    expect(record.activeSec).toBe(10);
    expect(record.maxSnapshotKg).toEqual({ left: 40 });
  });
});

describe('abrahangsTooHeavy', () => {
  const set = (meanKg: number) => ({
    hand: 'left' as const,
    grip: 'half-crimp' as const,
    targetLoKg: 12,
    targetHiKg: 20,
    meanKg,
    peakKg: meanKg,
    timeInZone: 1,
  });

  it('flags a session pulled above the band', () => {
    expect(abrahangsTooHeavy([set(24), set(26)])).toBe(true);
  });

  it('stays quiet inside the band', () => {
    expect(abrahangsTooHeavy([set(16), set(17)])).toBe(false);
  });

  it('says nothing about an empty session', () => {
    expect(abrahangsTooHeavy([])).toBe(false);
  });
});
