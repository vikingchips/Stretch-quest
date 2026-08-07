import type { CalibrationResult } from './progressorProtocol';
import type { ForceSample, SourceStatus } from './types';

/**
 * Anything that can produce a force stream.
 *
 * Two implementations satisfy it: a real Progressor-compatible device over
 * Web Bluetooth, and a simulated one. The simulated source is not a test
 * fixture hidden behind a flag — it is how anyone without the hardware uses
 * the module, and it ships.
 */
export interface ForceSource {
  readonly kind: 'mock' | 'ble';
  readonly status: SourceStatus;
  /** Web Bluetooth requires this to come from a user gesture. */
  connect(): Promise<void>;
  disconnect(): void;
  tare(): Promise<void>;
  /**
   * Calibrate against a known weight hanging right now. Returns the factor
   * the device settled on, or null if it refused — which it does when the
   * reading barely moved, meaning the weight is not on or the tare was taken
   * with it already hanging.
   */
  calibrate(knownKg: number): Promise<CalibrationResult | null>;
  /** Volts, or null if the source cannot say. */
  readBattery(): Promise<number | null>;
  /** Returns its own unsubscribe. */
  onSample(cb: (sample: ForceSample) => void): () => void;
  onStatus(cb: (status: SourceStatus) => void): () => void;
}

/** Shared subscription plumbing, so neither implementation reinvents it. */
export class SourceBase {
  protected sampleListeners = new Set<(s: ForceSample) => void>();
  protected statusListeners = new Set<(s: SourceStatus) => void>();
  protected _status: SourceStatus = 'disconnected';

  get status(): SourceStatus {
    return this._status;
  }

  onSample(cb: (sample: ForceSample) => void): () => void {
    this.sampleListeners.add(cb);
    return () => this.sampleListeners.delete(cb);
  }

  onStatus(cb: (status: SourceStatus) => void): () => void {
    this.statusListeners.add(cb);
    return () => this.statusListeners.delete(cb);
  }

  protected emit(sample: ForceSample): void {
    for (const cb of this.sampleListeners) cb(sample);
  }

  protected setStatus(status: SourceStatus): void {
    if (this._status === status) return;
    this._status = status;
    for (const cb of this.statusListeners) cb(status);
  }
}
