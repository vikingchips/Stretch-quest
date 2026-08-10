import { BleForceSource } from './bleSource';
import { MockForceSource } from './mockSource';
import type { ForceSource } from './source';
import type { ForceSample, SourceStatus } from './types';

/**
 * The one active force source, held outside React.
 *
 * Samples arrive at eighty a second. Nothing on that path may touch component
 * state or a store: the graph subscribes and draws imperatively, and the
 * session reducer is fed directly. Only status changes — a handful over a
 * session — are worth a re-render, and those go through useSyncExternalStore.
 */

let current: ForceSource | null = null;
let mock: MockForceSource | null = null;
const listeners = new Set<() => void>();
const sampleListeners = new Set<(sample: ForceSample) => void>();
let offStatus: (() => void) | null = null;
let offSamples: (() => void) | null = null;

interface Snapshot {
  kind: 'mock' | 'ble' | null;
  status: SourceStatus;
}

// Replaced only when a value actually changes: useSyncExternalStore compares
// snapshots by identity, and a fresh object every read re-renders forever.
let snapshot: Snapshot = { kind: null, status: 'disconnected' };

export function sourceSnapshot(): Snapshot {
  return snapshot;
}

export function onSourceChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function publish(): void {
  const next: Snapshot = {
    kind: current?.kind ?? null,
    status: current?.status ?? 'disconnected',
  };
  if (next.kind === snapshot.kind && next.status === snapshot.status) return;
  snapshot = next;
  for (const fn of listeners) fn();
}

function adopt(source: ForceSource): void {
  offStatus?.();
  offSamples?.();
  current = source;
  offStatus = source.onStatus(publish);
  // The manager forwards samples rather than handing out the source's own
  // subscription. A screen that subscribed before a device was picked would
  // otherwise hold a subscription to nothing for its whole life.
  offSamples = source.onSample((sample) => {
    for (const cb of sampleListeners) cb(sample);
  });
  publish();
}

export function activeSource(): ForceSource | null {
  return current;
}

/** The simulated device, created on first use and kept for the session. */
export function mockSource(): MockForceSource {
  mock ??= new MockForceSource();
  return mock;
}

export async function useMockDevice(): Promise<void> {
  const source = mockSource();
  if (current && current !== source) current.disconnect();
  adopt(source);
  await source.connect();
}

/**
 * Must be called from a user gesture — Web Bluetooth requires one.
 *
 * With a device from knownDevices() this reconnects silently; without one the
 * browser's chooser opens, which is the only way to reach a device this
 * browser has never been given permission for.
 */
export async function useBleDevice(known?: BluetoothDevice): Promise<void> {
  const source = new BleForceSource();
  if (current) current.disconnect();
  adopt(source);
  await source.connect(known);
}

export function disconnectSource(): void {
  current?.disconnect();
  offStatus?.();
  offSamples?.();
  offStatus = null;
  offSamples = null;
  current = null;
  publish();
}

/** Subscribe to the stream regardless of which source is active, or when. */
export function onForceSample(cb: (sample: ForceSample) => void): () => void {
  sampleListeners.add(cb);
  return () => sampleListeners.delete(cb);
}
