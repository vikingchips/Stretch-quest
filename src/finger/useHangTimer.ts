import { useEffect, useReducer, useRef } from 'react';
import { hangReducer, initHang } from './engine';
import { onForceSample } from './sourceManager';
import type { HangSegment } from './timeline';
import type { ForceSample } from './types';

const TICK_INTERVAL_MS = 200;

/**
 * Drives the hang state machine with real Date.now() deltas, the same way
 * useSessionTimer drives a stretch session, so timing survives interval
 * jitter and background-tab throttling.
 *
 * Force is buffered in a ref and handed over a tick at a time. Dispatching
 * each of the eighty samples a second would re-render the player eighty times
 * a second for no gain: the reducer measures with the sample timestamps, not
 * with when the samples happened to arrive.
 */
export function useHangTimer(segments: HangSegment[]) {
  const [state, dispatch] = useReducer(hangReducer, undefined, () => initHang(segments));
  const lastTickRef = useRef<number>(Date.now());
  const bufferRef = useRef<ForceSample[]>([]);

  useEffect(() => {
    return onForceSample((sample) => {
      bufferRef.current.push(sample);
    });
  }, []);

  const running = state.status === 'running';

  useEffect(() => {
    if (!running) return;
    lastTickRef.current = Date.now();
    const id = setInterval(() => {
      if (bufferRef.current.length > 0) {
        const samples = bufferRef.current;
        bufferRef.current = [];
        dispatch({ type: 'FORCE_BATCH', samples });
      }
      const now = Date.now();
      const deltaMs = now - lastTickRef.current;
      lastTickRef.current = now;
      dispatch({ type: 'TICK', deltaMs });
    }, TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [running]);

  return { state, dispatch };
}
