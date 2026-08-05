import { useSyncExternalStore } from 'react';
import { onSourceChange, sourceSnapshot } from './sourceManager';

/**
 * The active source's identity and connection state — a handful of changes
 * per session, and the only part of the force pipeline React needs to know
 * about. The samples themselves never come through here.
 */
export function useSource() {
  return useSyncExternalStore(onSourceChange, sourceSnapshot, sourceSnapshot);
}
