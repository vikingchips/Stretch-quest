import { describe, expect, it } from 'vitest';
import {
  initPulsar,
  PULSAR,
  pulsarActiveSec,
  pulsarScore,
  stepPulsar,
  type PulsarState,
} from './pulsar';

/** Step at 50 ms with a force schedule: (t) => fraction of max. */
function run(state: PulsarState, seconds: number, force: (t: number) => number): PulsarState {
  let s = state;
  for (let t = 0; t < seconds; t += 0.05) {
    s = stepPulsar(s, 0.05, force(s.t));
  }
  return s;
}

/** The whole protocol as a force script: `on` during blocks, `off` in gaps. */
function protocol(on: number, off: number): (t: number) => number {
  return (t) => {
    if (t < PULSAR.prepSec) return 0;
    const rel = (t - PULSAR.prepSec) % (PULSAR.onSec + PULSAR.offSec);
    return rel < PULSAR.onSec ? on : off;
  };
}

/** A short pull to go live, then hands off — prep is already running. */
function launch(): PulsarState {
  return run(initPulsar(), 0.2, () => 0.3);
}

describe('pulsar', () => {
  it('waits for contact, then goes live', () => {
    const idle = run(initPulsar(), 2, () => 0.08);
    expect(idle.phase).toBe('ready');
    expect(idle.t).toBe(0);
    const live = run(initPulsar(), 0.2, () => 0.2);
    expect(live.phase).toBe('live');
  });

  it('prep asks for nothing', () => {
    let s = launch();
    s = run(s, 4.5, () => 0);
    expect(s.phase).toBe('live');
    expect(s.blockScores).toHaveLength(0);
    expect(s.gapScores).toHaveLength(0);
    expect(pulsarScore(s)).toBe(0);
  });

  it('a clean protocol scores 1000 with a full streak', () => {
    const s = run(launch(), 63, protocol(0.45, 0));
    expect(s.phase).toBe('over');
    expect(s.blockScores).toHaveLength(PULSAR.blocks);
    expect(s.gapScores).toHaveLength(PULSAR.blocks - 1);
    expect(pulsarScore(s)).toBe(1000);
    expect(s.bestStreak).toBe(PULSAR.blocks);
  });

  it('holding through the gaps tanks the gaps, not the blocks', () => {
    const s = run(launch(), 63, protocol(0.45, 0.45));
    expect(s.phase).toBe('over');
    expect(s.blockScores.every((b) => b > 0.99)).toBe(true);
    expect(s.gapScores).toHaveLength(PULSAR.blocks - 1);
    expect(s.gapScores.every((g) => g === 0)).toBe(true);
    expect(pulsarScore(s)).toBe(800);
  });

  it('a release mid-block zeroes that block and resets the streak', () => {
    const period = PULSAR.onSec + PULSAR.offSec;
    const drop = (t: number): number => {
      if (t < PULSAR.prepSec) return 0;
      const rel = t - PULSAR.prepSec;
      const inOn = rel % period < PULSAR.onSec;
      return inOn && Math.floor(rel / period) !== 2 ? 0.45 : 0;
    };
    const s = run(launch(), 63, drop);
    expect(s.phase).toBe('over');
    expect(s.blockScores[2]).toBeLessThan(0.1);
    expect(s.bestStreak).toBe(3);
    expect(s.streak).toBe(3);
  });

  it('entering the band 0.3 s late still scores the block fully', () => {
    const late = (t: number): number => {
      if (t < PULSAR.prepSec) return 0;
      const rel = (t - PULSAR.prepSec) % (PULSAR.onSec + PULSAR.offSec);
      return rel >= 0.3 && rel < PULSAR.onSec ? 0.45 : 0;
    };
    const s = run(launch(), 63, late);
    expect(s.phase).toBe('over');
    expect(pulsarScore(s)).toBe(1000);
    expect(s.bestStreak).toBe(PULSAR.blocks);
  });

  it('ends right after the last block, with only the blocks as tension', () => {
    let s = run(launch(), 61.5, protocol(0.45, 0));
    expect(s.phase).toBe('live');
    s = run(s, 1, protocol(0.45, 0));
    expect(s.phase).toBe('over');
    expect(pulsarActiveSec(s)).toBe(PULSAR.blocks * PULSAR.onSec);
  });

  it('score stays 0 until a segment completes', () => {
    let s = launch();
    s = run(s, 3, () => 0.45);
    expect(pulsarScore(s)).toBe(0);
    // Mid first block: still nothing pushed, still zero.
    s = run(s, 5, protocol(0.45, 0));
    expect(pulsarScore(s)).toBe(0);
    s = run(s, 4.5, protocol(0.45, 0));
    expect(pulsarScore(s)).toBeGreaterThan(0);
  });

  it('over is terminal', () => {
    const s = run(launch(), 63, protocol(0.45, 0));
    expect(s.phase).toBe('over');
    const again = stepPulsar(s, 0.05, 0.8);
    expect(again).toBe(s);
  });
});
