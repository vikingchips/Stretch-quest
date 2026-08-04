import { describe, expect, it } from 'vitest';
import type { Segment } from './timeline';
import { initSession, sessionReducer, type SessionState } from './sessionReducer';

const segments: Segment[] = [
  { kind: 'prep', durationSec: 5, stepIndex: 0 },
  { kind: 'stretch', durationSec: 30, stepIndex: 0, exerciseId: 'a' },
  { kind: 'rest', durationSec: 10, stepIndex: 1 },
  { kind: 'stretch', durationSec: 20, stepIndex: 1, exerciseId: 'b', sideLabel: 'Left' },
  { kind: 'switch', durationSec: 3, stepIndex: 1, exerciseId: 'b' },
  { kind: 'stretch', durationSec: 20, stepIndex: 1, exerciseId: 'b', sideLabel: 'Right' },
];

function tick(state: SessionState, ms: number): SessionState {
  return sessionReducer(state, { type: 'TICK', deltaMs: ms });
}

describe('sessionReducer', () => {
  it('advances through segments as time is consumed', () => {
    let s = initSession(segments, 2);
    expect(s.index).toBe(0);
    s = tick(s, 5000);
    expect(s.index).toBe(1);
    expect(s.remainingMs).toBe(30000);
  });

  it('accumulates activeMs only during stretch segments', () => {
    let s = initSession(segments, 2);
    s = tick(s, 5000); // prep done
    expect(s.activeMs).toBe(0);
    s = tick(s, 10000); // 10s into stretch a
    expect(s.activeMs).toBe(10000);
    s = tick(s, 20000); // stretch a done -> rest
    expect(s.activeMs).toBe(30000);
    s = tick(s, 10000); // rest done -> stretch b left
    expect(s.activeMs).toBe(30000);
  });

  it('marks a step complete only after its last stretch segment', () => {
    let s = initSession(segments, 2);
    s = tick(s, 5000);
    s = tick(s, 30000); // stretch a finished
    expect(s.completedSteps).toEqual([0]);
    s = tick(s, 10000); // rest
    s = tick(s, 20000); // left finished — step 1 not yet complete
    expect(s.completedSteps).toEqual([0]);
    s = tick(s, 3000); // switch
    s = tick(s, 20000); // right finished
    expect(s.completedSteps).toEqual([0, 1]);
    expect(s.status).toBe('finished');
  });

  it('pause freezes time and activeMs until resume', () => {
    let s = initSession(segments, 2);
    s = tick(s, 5000);
    s = sessionReducer(s, { type: 'PAUSE' });
    const before = s;
    s = tick(s, 60000);
    expect(s).toEqual(before);
    s = sessionReducer(s, { type: 'RESUME' });
    expect(s.status).toBe('running');
  });

  it('skip jumps to the next step without completing the current one', () => {
    let s = initSession(segments, 2);
    s = tick(s, 5000); // in stretch a
    s = sessionReducer(s, { type: 'SKIP' });
    expect(s.index).toBe(3); // stretch b left
    expect(s.completedSteps).toEqual([]);
  });

  it('skip on the last step finishes the session', () => {
    let s = initSession(segments, 2);
    s = tick(s, 5000);
    s = sessionReducer(s, { type: 'SKIP' });
    s = sessionReducer(s, { type: 'SKIP' });
    expect(s.status).toBe('finished');
    expect(s.completedSteps).toEqual([]);
  });

  it('back restarts the current step after 2 seconds', () => {
    let s = initSession(segments, 2);
    s = tick(s, 5000);
    s = tick(s, 10000); // 10s into stretch a
    s = sessionReducer(s, { type: 'BACK' });
    expect(s.index).toBe(1);
    expect(s.remainingMs).toBe(30000);
  });

  it('back near a step start jumps to the previous step', () => {
    let s = initSession(segments, 2);
    s = tick(s, 5000);
    s = tick(s, 30000); // -> rest, step 0 complete
    s = tick(s, 10000); // -> stretch b left
    s = tick(s, 1000); // 1s in
    s = sessionReducer(s, { type: 'BACK' });
    expect(s.index).toBe(1); // back at stretch a
    expect(s.completedSteps).toEqual([]); // step 0 must be redone
  });

  it('ends in finished status with full progress', () => {
    let s = initSession(segments, 2);
    for (const seg of segments) {
      s = tick(s, seg.durationSec * 1000);
    }
    expect(s.status).toBe('finished');
    expect(s.activeMs).toBe(70000);
  });
});
