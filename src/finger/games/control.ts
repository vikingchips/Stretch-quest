import type { ForceSample } from '../types';
import type { Rng } from './types';

/** Same value the session engine caps sample gaps at, for the same reason. */
const MAX_SAMPLE_GAP_MS = 100;

/**
 * The smoothed pull, fed by samples and read by the rAF loop.
 *
 * Smoothing runs on the samples' own timestamps, never on wall-clock reads:
 * a BLE device stamps with its own clock and the mock with performance.now(),
 * and mixing either with the render clock would bend the time constant. The
 * render loop only ever reads the latest value.
 */
export class ForceFollower {
  private value = 0;
  private lastT: number | null = null;

  constructor(private readonly tauMs = 120) {}

  push(sample: ForceSample): void {
    const kg = Math.max(0, sample.kg);
    if (this.lastT === null) {
      this.value = kg;
      this.lastT = sample.t;
      return;
    }
    // The same cap the session engine uses: a throttled tab must not turn its
    // gap into one giant step that teleports the smoothed value.
    const dt = Math.min(MAX_SAMPLE_GAP_MS, Math.max(0, sample.t - this.lastT));
    this.lastT = sample.t;
    this.value += (kg - this.value) * (1 - Math.exp(-dt / this.tauMs));
  }

  get kg(): number {
    return this.value;
  }

  reset(): void {
    this.value = 0;
    this.lastT = null;
  }
}

/** mulberry32 — tiny, seedable, plenty for gate layouts. */
export function makeRng(seed: number): Rng {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
