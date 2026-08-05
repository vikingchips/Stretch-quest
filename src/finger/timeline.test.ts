import { describe, expect, it } from 'vitest';
import { PROGRAMS } from './programs';
import {
  buildHangTimeline,
  hangCount,
  hangTimelineActiveSec,
  type HangSegment,
} from './timeline';

const BOTH = { left: 40, right: 44 };

describe('buildHangTimeline', () => {
  it('covers every grip and both hands', () => {
    const segments = buildHangTimeline(PROGRAMS.abrahangs, BOTH);
    // Two grips, two hands, six reps.
    expect(hangCount(segments)).toBe(2 * 2 * 6);
    const blocks = new Set(
      segments.filter((s) => s.kind === 'hang').map((s) => `${s.grip}:${s.hand}`),
    );
    expect(blocks).toEqual(
      new Set([
        'half-crimp:left',
        'half-crimp:right',
        'front-3-drag:left',
        'front-3-drag:right',
      ]),
    );
  });

  it('gives max hangs one grip only', () => {
    const segments = buildHangTimeline(PROGRAMS['max-hangs'], BOTH);
    expect(hangCount(segments)).toBe(2 * 6);
    for (const s of segments) {
      if (s.kind === 'hang') expect(s.grip).toBe('half-crimp');
    }
  });

  it('scales each hand against its own max', () => {
    // The hands are never mixed: there is no validated conversion between
    // them, so a stronger right hand must not raise the left hand's load.
    const segments = buildHangTimeline(PROGRAMS['max-hangs'], BOTH);
    const left = segments.find((s) => s.kind === 'hang' && s.hand === 'left')!;
    const right = segments.find((s) => s.kind === 'hang' && s.hand === 'right')!;
    expect(left.targetLoKg).toBeCloseTo(40 * 0.85, 1);
    expect(right.targetLoKg).toBeCloseTo(44 * 0.85, 1);
    expect(left.targetHiKg).toBeCloseTo(40 * 0.95, 1);
  });

  it('skips a hand with no measured max rather than guessing one', () => {
    const segments = buildHangTimeline(PROGRAMS['max-hangs'], { right: 44 });
    expect(hangCount(segments)).toBe(6);
    expect(segments.every((s) => s.hand !== 'left')).toBe(true);
  });

  it('returns nothing when no max exists at all', () => {
    expect(buildHangTimeline(PROGRAMS.abrahangs, {})).toEqual([]);
  });

  it('opens with prep and separates blocks with a switch', () => {
    const segments = buildHangTimeline(PROGRAMS.abrahangs, BOTH);
    expect(segments[0].kind).toBe('prep');
    expect(segments.filter((s) => s.kind === 'prep')).toHaveLength(1);
    // Four blocks, so three switches after the opening prep.
    expect(segments.filter((s) => s.kind === 'switch')).toHaveLength(3);
  });

  it('rests between reps but not after the last one', () => {
    const segments = buildHangTimeline(PROGRAMS['max-hangs'], { left: 40 });
    expect(segments.filter((s) => s.kind === 'rest')).toHaveLength(5);
    expect(segments[segments.length - 1].kind).toBe('hang');
  });

  it('counts only hang time as active', () => {
    const segments = buildHangTimeline(PROGRAMS.abrahangs, BOTH);
    expect(hangTimelineActiveSec(segments)).toBe(24 * 10);
  });

  it('rounds targets to a tenth of a kilo', () => {
    const segments = buildHangTimeline(PROGRAMS.abrahangs, { left: 37.77 });
    const hang = segments.find((s: HangSegment) => s.kind === 'hang')!;
    expect(hang.targetLoKg).toBe(11.3);
  });
});
