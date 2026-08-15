import { describe, expect, it } from 'vitest';
import { mergeFinger } from './merge';
import { INITIAL_FINGER_DATA, MAX_GAME_RUNS, type FingerData } from '../store/fingerStore';
import type { FingerMax, FingerSessionRecord, FingerTestRecord } from '../finger/types';
import type { GameRun } from '../finger/games/types';

function max(over: Partial<FingerMax> = {}): FingerMax {
  return {
    hand: 'left',
    grip: 'half-crimp',
    kg: 40,
    edgeMm: 20,
    testedAt: '2026-06-01T00:00:00.000Z',
    ...over,
  };
}

function test(id: string, testedAt: string): FingerTestRecord {
  return {
    id,
    testedAt,
    dateKey: testedAt.slice(0, 10),
    hand: 'left',
    grip: 'half-crimp',
    edgeMm: 20,
    bodyweightKg: 70,
    attemptsKg: [40],
  };
}

function session(id: string, startedAt: string): FingerSessionRecord {
  return {
    id,
    programId: 'abrahangs',
    startedAt,
    dateKey: startedAt.slice(0, 10),
    activeSec: 240,
    setsCompleted: 24,
    setsTotal: 24,
    sets: [],
    edgeMm: 20,
    maxSnapshotKg: { left: 40 },
  };
}

function data(over: Partial<FingerData> = {}): FingerData {
  return { ...INITIAL_FINGER_DATA, ...over };
}

describe('mergeFinger', () => {
  it('never drops a session either side has', () => {
    // The whole point of the additive merge: a second device cannot delete
    // history by syncing.
    const merged = mergeFinger(
      data({ sessions: [session('a', '2026-06-01T08:00:00.000Z')] }),
      { sessions: [session('b', '2026-06-02T08:00:00.000Z')] },
    );
    expect(merged.sessions.map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('does not duplicate a session both sides have', () => {
    const merged = mergeFinger(data({ sessions: [session('a', '2026-06-01T08:00:00.000Z')] }), {
      sessions: [session('a', '2026-06-01T08:00:00.000Z')],
    });
    expect(merged.sessions).toHaveLength(1);
  });

  it('unions tests and keeps them in order', () => {
    const merged = mergeFinger(data({ tests: [test('t2', '2026-06-05T00:00:00.000Z')] }), {
      tests: [test('t1', '2026-06-01T00:00:00.000Z')],
    });
    expect(merged.tests.map((t) => t.id)).toEqual(['t1', 't2']);
  });

  it('takes the newer max even when it is lower', () => {
    const merged = mergeFinger(
      data({ maxes: [max({ kg: 38, testedAt: '2026-07-01T00:00:00.000Z' })] }),
      { maxes: [max({ kg: 44, testedAt: '2026-06-01T00:00:00.000Z' })] },
    );
    expect(merged.maxes).toHaveLength(1);
    expect(merged.maxes[0].kg).toBe(38);
  });

  it('keeps a remote max the local device has never seen', () => {
    const merged = mergeFinger(data({ maxes: [max({ hand: 'left' })] }), {
      maxes: [max({ hand: 'right', kg: 45 })],
    });
    expect(merged.maxes).toHaveLength(2);
  });

  it('treats hand, grip and edge as different measurements', () => {
    const merged = mergeFinger(data({ maxes: [max()] }), {
      maxes: [max({ grip: 'front-3-drag', kg: 30 }), max({ edgeMm: 12, kg: 28 })],
    });
    expect(merged.maxes).toHaveLength(3);
  });

  it('fills in settings the local device has not set', () => {
    const merged = mergeFinger(data(), { bodyweightKg: 72, edges: [12, 20], activeEdgeMm: 20 });
    expect(merged.bodyweightKg).toBe(72);
    expect(merged.edges).toEqual([12, 20]);
    expect(merged.activeEdgeMm).toBe(20);
  });

  it('keeps the local answer when there is one', () => {
    const merged = mergeFinger(data({ bodyweightKg: 70, edges: [20] }), {
      bodyweightKg: 90,
      edges: [8, 10],
    });
    expect(merged.bodyweightKg).toBe(70);
    expect(merged.edges).toEqual([20]);
  });

  it('survives a row written before the module existed', () => {
    const local = data({ bodyweightKg: 70, sessions: [session('a', '2026-06-01T08:00:00.000Z')] });
    expect(mergeFinger(local, null)).toEqual(local);
    expect(mergeFinger(local, {})).toEqual(local);
  });

  it('takes the later abrahangs timestamp', () => {
    const merged = mergeFinger(data({ lastAbrahangsAt: '2026-06-01T08:00:00.000Z' }), {
      lastAbrahangsAt: '2026-06-02T08:00:00.000Z',
    });
    expect(merged.lastAbrahangsAt).toBe('2026-06-02T08:00:00.000Z');
  });
});

function run(id: string, at: string, over: Partial<GameRun> = {}): GameRun {
  return {
    id,
    gameId: 'comet-run',
    hand: 'left',
    score: 100,
    calibKg: 40,
    at,
    dateKey: at.slice(0, 10),
    activeSec: 45,
    ...over,
  };
}

describe('mergeFinger · games', () => {
  it('unions runs from both devices without duplicates', () => {
    const merged = mergeFinger(
      data({ gameRuns: [run('a', '2026-08-01T08:00:00.000Z')] }),
      { gameRuns: [run('a', '2026-08-01T08:00:00.000Z'), run('b', '2026-08-02T08:00:00.000Z')] },
    );
    expect(merged.gameRuns.map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('caps merged runs at the store limit, dropping oldest first', () => {
    const local = Array.from({ length: MAX_GAME_RUNS }, (_, i) =>
      run(`l${i}`, `2026-08-02T${String(i % 24).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00.000Z`),
    );
    const merged = mergeFinger(data({ gameRuns: local }), {
      gameRuns: [run('old', '2026-07-01T08:00:00.000Z')],
    });
    expect(merged.gameRuns).toHaveLength(MAX_GAME_RUNS);
    expect(merged.gameRuns.some((r) => r.id === 'old')).toBe(false);
  });

  it('keeps the higher best per game and hand', () => {
    const merged = mergeFinger(
      data({ gameBests: { 'comet-run:left': { score: 120, at: '2026-08-02T08:00:00.000Z' } } }),
      { gameBests: { 'comet-run:left': { score: 300, at: '2026-08-01T08:00:00.000Z' } } },
    );
    expect(merged.gameBests['comet-run:left'].score).toBe(300);
  });

  it('a best survives even when the run that set it fell off the cap', () => {
    // The reason bests are stored separately at all.
    const merged = mergeFinger(
      data({ gameBests: { 'pulsar:right': { score: 900, at: '2026-07-01T08:00:00.000Z' } } }),
      { gameBests: {} },
    );
    expect(merged.gameBests['pulsar:right'].score).toBe(900);
  });

  it('a tied best keeps the earlier date', () => {
    const merged = mergeFinger(
      data({ gameBests: { 'comet-run:left': { score: 200, at: '2026-08-05T08:00:00.000Z' } } }),
      { gameBests: { 'comet-run:left': { score: 200, at: '2026-08-01T08:00:00.000Z' } } },
    );
    expect(merged.gameBests['comet-run:left'].at).toBe('2026-08-01T08:00:00.000Z');
  });

  it('bests for different hands and games never collide', () => {
    const merged = mergeFinger(
      data({ gameBests: { 'comet-run:left': { score: 100, at: '2026-08-01T00:00:00.000Z' } } }),
      { gameBests: { 'comet-run:right': { score: 90, at: '2026-08-01T00:00:00.000Z' } } },
    );
    expect(Object.keys(merged.gameBests).sort()).toEqual(['comet-run:left', 'comet-run:right']);
  });

  it('survives a remote row from before the games existed', () => {
    const local = data({ gameRuns: [run('a', '2026-08-01T08:00:00.000Z')] });
    expect(mergeFinger(local, { sessions: [] }).gameRuns.map((r) => r.id)).toEqual(['a']);
  });
});
