import { describe, expect, it } from 'vitest';
import { MockForceSource } from './mockSource';
import type { ForceSample } from './types';

/**
 * A controllable clock and scheduler, so the simulated cell can be stepped
 * deterministically rather than waited on.
 */
/** Box-Muller lands exactly on zero here, for assertions about the signal
 *  rather than about the noise riding on it. */
const NO_NOISE = 0.25;

function harness(rngValue = 0.5) {
  let now = 0;
  const timers: Array<{ fn: () => void; every: number }> = [];
  const source = new MockForceSource({
    now: () => now,
    rng: () => rngValue,
    setInterval: ((fn: () => void, every: number) => {
      timers.push({ fn, every });
      return timers.length as unknown as ReturnType<typeof setInterval>;
    }) as typeof globalThis.setInterval,
    clearInterval: (() => {
      timers.length = 0;
    }) as typeof globalThis.clearInterval,
  });
  const samples: ForceSample[] = [];
  source.onSample((s) => samples.push(s));

  return {
    source,
    samples,
    advance(ms: number) {
      const step = timers[0]?.every ?? 12.5;
      for (let elapsed = 0; elapsed < ms; elapsed += step) {
        now += step;
        for (const timer of timers) timer.fn();
      }
    },
  };
}

describe('MockForceSource', () => {
  it('reports itself as simulated', () => {
    expect(new MockForceSource().kind).toBe('mock');
  });

  it('emits nothing until connected', () => {
    const { samples, advance } = harness();
    advance(500);
    expect(samples).toHaveLength(0);
  });

  it('streams at about eighty samples a second once connected', async () => {
    const { source, samples, advance } = harness();
    await source.connect();
    advance(1000);
    expect(samples.length).toBeGreaterThan(75);
    expect(samples.length).toBeLessThan(85);
  });

  it('reports connected status to subscribers', async () => {
    const { source } = harness();
    const seen: string[] = [];
    source.onStatus((s) => seen.push(s));
    await source.connect();
    expect(seen).toContain('connected');
    source.disconnect();
    expect(seen[seen.length - 1]).toBe('disconnected');
  });

  it('approaches a new level instead of jumping to it', async () => {
    // A UI tuned against a perfect square wave falls apart the first time it
    // meets a real strain gauge.
    const { source, samples, advance } = harness(NO_NOISE);
    await source.connect();
    source.setLevel(40);
    advance(50);
    const early = samples[samples.length - 1].kg;
    expect(early).toBeGreaterThan(0);
    expect(early).toBeLessThan(30);
    advance(2000);
    expect(samples[samples.length - 1].kg).toBeCloseTo(40, 1);
  });

  it('rides noise on top of the signal, and more of it under load', async () => {
    const { source, samples, advance } = harness();
    await source.connect();
    advance(200);
    const idle = Math.abs(samples[samples.length - 1].kg);
    expect(idle).toBeGreaterThan(0);
    expect(idle).toBeLessThan(0.2);

    source.setLevel(40);
    advance(3000);
    expect(Math.abs(samples[samples.length - 1].kg - 40)).toBeGreaterThan(0.2);
  });

  it('never sets a negative level', async () => {
    const { source } = harness();
    await source.connect();
    source.setLevel(-10);
    expect(source.level).toBe(0);
  });

  it('re-zeroes on tare', async () => {
    const { source, samples, advance } = harness();
    await source.connect();
    source.setLevel(12);
    advance(3000);
    await source.tare();
    advance(100);
    expect(Math.abs(samples[samples.length - 1].kg)).toBeLessThan(1);
  });

  it('stops emitting after disconnect', async () => {
    const { source, samples, advance } = harness();
    await source.connect();
    advance(200);
    const count = samples.length;
    source.disconnect();
    advance(500);
    expect(samples).toHaveLength(count);
  });

  it('reports a battery level', async () => {
    const { source } = harness();
    expect(await source.readBattery()).toBe(3.9);
  });
});
