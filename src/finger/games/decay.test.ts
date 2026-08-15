import { describe, expect, it } from 'vitest';
import { DECAY, decayThreshold, initDecay, orbitDecay, stepDecay, type DecayState } from './decay';

/** Step at 50 ms with a force schedule: (t) => fraction of max. */
function run(state: DecayState, seconds: number, force: (t: number) => number): DecayState {
  let s = state;
  for (let t = 0; t < seconds; t += 0.05) {
    s = stepDecay(s, 0.05, force(s.t));
  }
  return s;
}

describe('orbit decay', () => {
  it('the threshold starts at the start fraction and sinks toward the floor', () => {
    expect(decayThreshold(0)).toBeCloseTo(DECAY.startFrac);
    expect(decayThreshold(DECAY.tauSec)).toBeCloseTo(
      DECAY.floorFrac + (DECAY.startFrac - DECAY.floorFrac) / Math.E,
    );
    expect(decayThreshold(100 * DECAY.tauSec)).toBeCloseTo(DECAY.floorFrac, 5);
  });

  it('stays ready below the start line and enters orbit at it', () => {
    const idle = run(initDecay(), 2, () => DECAY.startFrac - 0.05);
    expect(idle.phase).toBe('ready');
    expect(idle.t).toBe(0);
    const live = run(initDecay(), 0.5, () => DECAY.startFrac);
    expect(live.phase).toBe('live');
  });

  it('holding above the line survives and scores whole seconds', () => {
    const s = run(initDecay(), 10, () => 0.8);
    expect(s.phase).toBe('live');
    expect(s.t).toBeCloseTo(10, 0);
    expect(orbitDecay.score(s)).toBe(Math.floor(s.t));
  });

  it('a dip shorter than the grace survives; a longer one loses the orbit', () => {
    const held = run(initDecay(), 3, () => 0.8);
    const dipped = run(run(held, DECAY.graceSec - 0.3, () => 0.1), 1, () => 0.8);
    expect(dipped.phase).toBe('live');
    expect(dipped.below).toBe(0);
    const lost = run(held, DECAY.graceSec + 1, () => 0.1);
    expect(lost.phase).toBe('over');
  });

  it('the demand genuinely eases as the orbit decays', () => {
    // 0.3 straight after entering orbit is far under the line: dead.
    const entered = run(initDecay(), 0.1, () => DECAY.startFrac);
    expect(run(entered, 2, () => 0.3).phase).toBe('over');
    // The same 0.3 keeps the orbit once the threshold has sunk beneath it.
    expect(decayThreshold(70)).toBeLessThan(0.3);
    const late = run(run(initDecay(), 70, () => 0.7), 5, () => 0.3);
    expect(late.phase).toBe('live');
  });

  it('the curve is a 1 Hz mean of the force fraction', () => {
    const s = run(initDecay(), 5.2, () => 0.7);
    const curve = orbitDecay.curve?.(s) ?? [];
    expect(curve.length).toBe(Math.floor(s.t));
    for (const v of curve) expect(v).toBeCloseTo(0.7, 3);
  });

  it('caps the curve at six minutes', () => {
    const s = run(initDecay(), 370, () => 0.8);
    expect(s.phase).toBe('live');
    expect(orbitDecay.curve?.(s).length).toBe(360);
  });

  it('over is terminal and the clock stays frozen', () => {
    const held = run(initDecay(), 2, () => 0.8);
    const over = run(held, 3, () => 0);
    expect(over.phase).toBe('over');
    const s = stepDecay(over, 0.05, 1);
    expect(s).toBe(over);
    expect(s.t).toBe(over.t);
    expect(orbitDecay.score(s)).toBe(Math.floor(over.t));
  });

  it('active seconds are the run clock', () => {
    const s = run(initDecay(), 3, () => 0.8);
    expect(orbitDecay.activeSec(s)).toBe(s.t);
  });
});
