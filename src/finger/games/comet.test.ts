import { describe, expect, it } from 'vitest';
import { COMET, cometScore, initComet, stepComet, type CometState } from './comet';
import { makeRng } from './control';

const rng = () => 0.5;

/** Step at 50 ms with a force schedule: (t) => fraction of max. */
function run(state: CometState, seconds: number, force: (t: number) => number): CometState {
  let s = state;
  for (let t = 0; t < seconds; t += 0.05) {
    s = stepComet(s, 0.05, force(s.t), rng);
  }
  return s;
}

describe('comet run', () => {
  it('waits on the ground until there is a real pull', () => {
    const s = run(initComet(rng), 2, () => 0.02);
    expect(s.phase).toBe('ready');
    expect(s.t).toBe(0);
  });

  it('launches at contact and altitude settles toward the pull', () => {
    const s = run(initComet(rng), 3, () => 0.44);
    expect(s.phase).toBe('live');
    expect(s.alt).toBeCloseTo(0.44 / COMET.top, 1);
  });

  it('a full pull pins the top rather than flying off screen', () => {
    const s = run(initComet(rng), 4, () => 1.5);
    expect(s.alt).toBeLessThanOrEqual(1.04);
  });

  it('release ends the run through the ground, but a dip does not', () => {
    let s = run(initComet(rng), 2, () => 0.4);
    // Dip shorter than the grace window: still alive.
    s = run(s, 0.1, () => 0);
    const dipped = run(s, 0.15, () => 0.4);
    expect(dipped.phase).toBe('live');
    // A real release: the altitude decays to the ground and stays there.
    const released = run(s, 3, () => 0);
    expect(released.phase).toBe('over');
    expect(released.crash).toBe('ground');
  });

  it('passes a gate inside the gap and crashes outside it', () => {
    const base = initComet(rng);
    const gate = { at: 0.4, center: 0.5, halfGap: 0.15, passed: false };
    const flying: CometState = { ...base, phase: 'live', alt: 0.5, gates: [gate] };

    const through = run({ ...flying }, 0.6, () => 0.5 * COMET.top);
    expect(through.phase).toBe('live');
    expect(through.passed).toBe(1);

    const low: CometState = { ...base, phase: 'live', alt: 0.2, gates: [{ ...gate }] };
    const crashed = run(low, 0.6, () => 0.2 * COMET.top);
    expect(crashed.phase).toBe('over');
    expect(crashed.crash).toBe('gate');
  });

  it('the comet radius narrows the effective gap', () => {
    const base = initComet(rng);
    // Just inside the gap edge, but within a radius of it: still a crash.
    const gate = { at: 0.2, center: 0.5, halfGap: 0.12, passed: false };
    const graze: CometState = {
      ...base,
      phase: 'live',
      alt: 0.5 + 0.12 - COMET.radius / 2,
      gates: [gate],
    };
    const s = stepComet(graze, 0.25, (0.5 + 0.12 - COMET.radius / 2) * COMET.top, rng);
    expect(s.phase).toBe('over');
  });

  it('keeps the horizon stocked with gates as the run goes on', () => {
    const s = run(initComet(rng), 8, (t) => 0.45 + 0.001 * t);
    if (s.phase === 'live') {
      expect(s.gates[s.gates.length - 1].at).toBeGreaterThan(s.t + COMET.horizonSec - 3.5);
    }
  });

  it('gaps shrink with gates spawned but never below the floor', () => {
    let s = initComet(makeRng(7));
    // Spawn far more gates than the shrink needs to hit the floor.
    for (let i = 0; i < 400; i++) {
      s = { ...s, spawned: s.spawned + 1 };
    }
    const next = stepComet({ ...s, phase: 'live', alt: 0.5, t: 100, gates: [] }, 0.05, 0.4, makeRng(8));
    for (const gate of next.gates) {
      expect(gate.halfGap).toBeGreaterThanOrEqual(COMET.gapFloor);
    }
  });

  it('score grows with distance and gates', () => {
    const base = initComet(rng);
    expect(cometScore(base)).toBe(0);
    expect(cometScore({ ...base, t: 10 })).toBe(100);
    expect(cometScore({ ...base, t: 10, passed: 3 })).toBe(100 + 3 * COMET.scorePerGate);
  });

  it('is deterministic for a given seed', () => {
    const a = initComet(makeRng(42));
    const b = initComet(makeRng(42));
    expect(a).toEqual(b);
  });

  it('over is terminal and stops the clock', () => {
    const over: CometState = { ...initComet(rng), phase: 'over', t: 12, crash: 'gate' };
    const s = stepComet(over, 0.05, 0.8, rng);
    expect(s).toBe(over);
    expect(s.t).toBe(12);
  });

  it('active seconds are the run clock', () => {
    const s = run(initComet(rng), 3, () => 0.4);
    expect(s.t).toBeCloseTo(3, 0);
  });
});
