import { useEffect, useReducer, useRef } from 'react';
import type { Segment } from './timeline';
import { initSession, sessionReducer } from './sessionReducer';

const TICK_INTERVAL_MS = 200;

/**
 * Drives the session state machine with real Date.now() deltas so timing
 * stays correct through interval jitter and background-tab throttling.
 */
export function useSessionTimer(segments: Segment[], stepsTotal: number) {
  const [state, dispatch] = useReducer(
    sessionReducer,
    undefined,
    () => initSession(segments, stepsTotal),
  );
  const lastTickRef = useRef<number>(Date.now());

  const running = state.status === 'running';

  useEffect(() => {
    if (!running) return;
    lastTickRef.current = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const deltaMs = now - lastTickRef.current;
      lastTickRef.current = now;
      dispatch({ type: 'TICK', deltaMs });
    }, TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [running]);

  return { state, dispatch };
}
