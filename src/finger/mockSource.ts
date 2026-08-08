import type { CalibrationResult } from './progressorProtocol';
import { SourceBase, type ForceSource } from './source';

/**
 * A simulated load cell.
 *
 * Built to be believable rather than clean: the level is approached with a
 * time constant and carries noise that grows with load, because a UI tuned
 * against a perfect square wave falls apart the first time it meets a real
 * strain gauge.
 *
 * This is also the only way to use the module without hardware, so it is a
 * product feature, not a test double.
 */

const SAMPLE_INTERVAL_MS = 12.5; // 80 Hz, matching the Progressor
const TIME_CONSTANT_MS = 300;
/** Roughly what a 150 kg cell at gain 128 lands on. Only used to make the
 *  simulated calibration report a believable figure. */
const NOMINAL_COUNTS_PER_KG = 14000;
const NOISE_IDLE_KG = 0.06;
// What a 24-bit ADC on a 150 kg cell actually gives at 80 SPS. Higher would
// make the trace hairier than the hardware it stands in for.
const NOISE_LOADED_KG = 0.25;

/** Box-Muller, so the noise is gaussian rather than uniform. */
function gaussian(rng: () => number): number {
  const u = Math.max(1e-9, rng());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

export interface MockOptions {
  now?: () => number;
  rng?: () => number;
  setInterval?: typeof globalThis.setInterval;
  clearInterval?: typeof globalThis.clearInterval;
}

export class MockForceSource extends SourceBase implements ForceSource {
  readonly kind = 'mock' as const;

  private target = 0;
  private actual = 0;
  private offset = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastT: number | null = null;

  private now: () => number;
  private rng: () => number;
  private start: typeof globalThis.setInterval;
  private stop: typeof globalThis.clearInterval;

  constructor(options: MockOptions = {}) {
    super();
    this.now = options.now ?? (() => performance.now());
    this.rng = options.rng ?? Math.random;
    this.start = options.setInterval ?? globalThis.setInterval.bind(globalThis);
    this.stop = options.clearInterval ?? globalThis.clearInterval.bind(globalThis);
  }

  /** What the person on the board is pulling. Drive this from a slider. */
  setLevel(kg: number): void {
    this.target = Math.max(0, kg);
  }

  get level(): number {
    return this.target;
  }

  async connect(): Promise<void> {
    if (this.timer) return;
    this.setStatus('connecting');
    this.lastT = null;
    this.timer = this.start(() => this.tick(), SAMPLE_INTERVAL_MS);
    this.setStatus('connected');
  }

  disconnect(): void {
    if (this.timer) this.stop(this.timer);
    this.timer = null;
    this.setStatus('disconnected');
  }

  async tare(): Promise<void> {
    this.offset = this.actual;
  }

  /**
   * There is no bridge to scale here, so this reports what a real device
   * would have concluded from the current reading. It exists so the
   * calibration screen can be exercised without hanging weights off a
   * ceiling, and it refuses on a slack rope for the same reason the firmware
   * does.
   */
  async calibrate(knownKg: number): Promise<CalibrationResult | null> {
    const reading = this.actual - this.offset;
    if (knownKg < 0.05 || Math.abs(reading) < 0.5) return { ok: false, countsPerKg: 0 };
    return { ok: true, countsPerKg: (NOMINAL_COUNTS_PER_KG * reading) / knownKg };
  }

  async readCounts(): Promise<number | null> {
    // The simulator works in kilograms, so counts are synthesised from the
    // nominal factor. That keeps the multi-point screen exercisable without
    // a ceiling, a bucket and sixty litres of water.
    return (this.actual - this.offset) * NOMINAL_COUNTS_PER_KG;
  }

  async setFactor(): Promise<boolean> {
    // Nothing to scale here: the simulated cell reports kilograms directly.
    return true;
  }

  async readBattery(): Promise<number | null> {
    return 3.9;
  }

  private tick(): void {
    const t = this.now();
    const dt = this.lastT === null ? SAMPLE_INTERVAL_MS : t - this.lastT;
    this.lastT = t;

    // Exponential approach: force builds and releases over a few hundred
    // milliseconds, never instantly.
    const alpha = 1 - Math.exp(-dt / TIME_CONSTANT_MS);
    this.actual += (this.target - this.actual) * alpha;

    const noise = this.actual > 1 ? NOISE_LOADED_KG : NOISE_IDLE_KG;
    const kg = this.actual - this.offset + gaussian(this.rng) * noise;
    this.emit({ t, kg });
  }
}
