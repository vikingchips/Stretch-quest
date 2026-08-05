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
let offStatus: (() => void) | null = null;

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
  current = source;
  offStatus = source.onStatus(publish);
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

/** Must be called from a user gesture — Web Bluetooth requires one. */
export async function useBleDevice(): Promise<void> {
  const source = new BleForceSource();
  if (current) current.disconnect();
  adopt(source);
  await source.connect();
}

export function disconnectSource(): void {
  current?.disconnect();
  offStatus?.();
  offStatus = null;
  current = null;
  publish();
}

/** Subscribe to the stream regardless of which source is active. */
export function onForceSample(cb: (sample: ForceSample) => void): () => void {
  return current ? current.onSample(cb) : () => {};
}
