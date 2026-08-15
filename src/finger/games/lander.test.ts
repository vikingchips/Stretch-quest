import { describe, expect, it } from 'vitest';
import { LANDER, initLander, landerGravity, softLanding, stepLander, type LanderState } from './lander';

/** Step at 50 ms with a force schedule reading the live state. */
function run(state: LanderState, seconds: number, force: (s: LanderState) => number): LanderState {
  let s = state;
  for (let t = 0; t < seconds; t += 0.05) {
    s = stepLander(s, 0.05, force(s));
  }
  return s;
}

describe('soft landing', () => {
  it('waits at the top until there is a real pull', () => {
    const idle = run(initLander(), 2, () => 0.02);
    expect(idle.phase).toBe('ready');
    expect(idle.t).toBe(0);
    expect(idle.alt).toBe(LANDER.startAlt);

    const lit = stepLander(idle, 0.05, LANDER.ignitionFrac);
    expect(lit.phase).toBe('live');
  });

  it('the hover fraction exactly cancels gravity at round one', () => {
    const s = run(initLander(), 4, () => LANDER.hoverFrac);
    expect(s.phase).toBe('live');
    expect(Math.abs(s.v)).toBeLessThan(1e-6);
    expect(s.alt).toBeCloseTo(LANDER.startAlt, 5);
  });

  it('a free fall from the top lands too hard and banks nothing', () => {
    const s = run(initLander(), 8, (st) => (st.phase === 'ready' ? 0.06 : 0));
    expect(s.phase).toBe('over');
    expect(s.crashed).toBe(true);
    expect(s.score).toBe(0);
    expect(s.lastLanding).toBeNull();
    expect(s.lastTouchdownV).toBeGreaterThan(LANDER.vHard);
  });

  it('a braked descent touches down soft, scores and starts the pad rest', () => {
    // Drift down slowly, braking whenever the descent runs past 0.1 units/s.
    const s = run(initLander(), 18, (st) => (st.v > 0.1 ? 0.6 : 0.9 * LANDER.hoverFrac));
    expect(s.lastLanding).toBe('soft');
    expect(s.score).toBe(LANDER.pointsSoft);
    expect(s.round).toBe(2);
    expect(s.crashed).toBe(false);
    expect(s.lastTouchdownV).not.toBeNull();
    expect(s.lastTouchdownV!).toBeLessThanOrEqual(LANDER.vSoft);
  });

  it('gravity climbs the ladder with completed rounds', () => {
    expect(landerGravity(1)).toBeCloseTo(LANDER.gravity0, 10);
    expect(landerGravity(2) / landerGravity(1)).toBeCloseTo(LANDER.gravityGrowth, 10);
    expect(landerGravity(3)).toBeCloseTo(LANDER.gravity0 * LANDER.gravityGrowth ** 2, 10);
  });

  it('after the rest the next drop waits for a fresh ignition', () => {
    const rested: LanderState = {
      ...initLander(),
      phase: 'live',
      round: 2,
      alt: 0,
      v: 0,
      resting: LANDER.restSec,
    };
    const waiting = run(rested, LANDER.restSec + 1, () => 0);
    expect(waiting.phase).toBe('live');
    expect(waiting.resting).toBe(0);
    expect(waiting.alt).toBe(0);

    const dropped = stepLander(waiting, 0.05, 0.2);
    expect(dropped.alt).toBe(LANDER.startAlt);
    expect(dropped.v).toBe(0);
    expect(dropped.round).toBe(2);
  });

  it('max thrust cannot fly off the top', () => {
    const s = run(initLander(), 5, () => 1);
    expect(s.phase).toBe('live');
    expect(s.alt).toBeLessThanOrEqual(LANDER.maxAlt);
    expect(s.v).toBe(0);
  });

  it('active seconds accrue only under tension', () => {
    const fall = run({ ...initLander(), phase: 'live' }, 2, () => 0);
    expect(fall.activeSec).toBe(0);

    const held = run({ ...initLander(), phase: 'live' }, 1, () => 0.6);
    expect(held.activeSec).toBeCloseTo(1, 5);

    const resting: LanderState = {
      ...initLander(),
      phase: 'live',
      alt: 0,
      resting: LANDER.restSec,
      activeSec: 3,
    };
    const after = run(resting, 2, () => 0.8);
    expect(after.activeSec).toBe(3);
  });

  it('the overspeed warning fires once and resets with the round', () => {
    const diving: LanderState = { ...initLander(), phase: 'live', alt: 0.301, v: 0.4 };
    const schedule = (st: LanderState) => (st.v > 0.11 ? 1 : LANDER.hoverFrac);

    const warned = run(diving, 0.1, schedule);
    expect(warned.warned).toBe(true);

    // The same descent, braked in time: the flag holds through the landing.
    const landed = run(warned, 2.5, schedule);
    expect(landed.lastLanding).toBe('soft');
    expect(landed.round).toBe(2);
    expect(landed.resting).toBeGreaterThan(0);
    expect(landed.warned).toBe(true);

    const rested = run(landed, LANDER.restSec, () => 0);
    const dropped = stepLander(rested, 0.05, 0.2);
    expect(dropped.warned).toBe(false);
    expect(dropped.alt).toBe(LANDER.startAlt);
  });

  it('a late crash keeps the banked score', () => {
    const banked: LanderState = {
      ...initLander(),
      phase: 'live',
      round: 2,
      score: LANDER.pointsSoft,
      alt: 0.5,
      v: 0.5,
    };
    const s = run(banked, 3, () => 0);
    expect(s.phase).toBe('over');
    expect(s.crashed).toBe(true);
    expect(s.score).toBe(LANDER.pointsSoft);
  });

  it('cues the transitions', () => {
    const ready = initLander();
    const live = stepLander(ready, 0.05, 0.2);
    expect(softLanding.cue?.(ready, live)).toBe('start');

    const padWait: LanderState = { ...initLander(), phase: 'live', round: 2, alt: 0, v: 0 };
    const dropped = stepLander(padWait, 0.05, 0.2);
    expect(softLanding.cue?.(padWait, dropped)).toBe('start');

    const falling: LanderState = { ...initLander(), phase: 'live', alt: 0.29, v: 0.4 };
    const warned = stepLander(falling, 0.05, 0);
    expect(softLanding.cue?.(falling, warned)).toBe('tick');
    expect(softLanding.cue?.(warned, stepLander(warned, 0.05, 0))).toBeNull();

    const touching: LanderState = { ...initLander(), phase: 'live', alt: 0.004, v: 0.1 };
    const scored = stepLander(touching, 0.05, LANDER.hoverFrac);
    expect(scored.round).toBe(2);
    expect(softLanding.cue?.(touching, scored)).toBe('good');

    const doomed: LanderState = { ...initLander(), phase: 'live', alt: 0.004, v: 0.5 };
    const over = stepLander(doomed, 0.05, 0);
    expect(over.phase).toBe('over');
    expect(softLanding.cue?.(doomed, over)).toBe('over');
  });

  it('over is terminal', () => {
    const over: LanderState = { ...initLander(), phase: 'over', crashed: true, score: 60 };
    const s = stepLander(over, 0.05, 0.9);
    expect(s).toBe(over);
  });

  it('score and active seconds read straight from the state', () => {
    const s: LanderState = { ...initLander(), score: 185, activeSec: 12.5 };
    expect(softLanding.score(s)).toBe(185);
    expect(softLanding.activeSec(s)).toBe(12.5);
  });
});
