import { describe, expect, it } from 'vitest';
import type { Routine } from '../types';
import { buildTimeline, routineActiveSec, timelineDurationSec } from './timeline';

const settings = { prepDurationSec: 5, restDurationSec: 10 };

const routine: Routine = {
  id: 'test',
  name: 'Test',
  description: '',
  category: 'custom',
  isCustom: true,
  steps: [
    { exerciseId: 'prayer-stretch', durationSec: 30 }, // both
    { exerciseId: 'pigeon-pose', durationSec: 45 }, // per-side
  ],
};

describe('buildTimeline', () => {
  it('expands per-side exercises into left/switch/right', () => {
    const t = buildTimeline(routine, settings);
    expect(t.map((s) => s.kind)).toEqual([
      'prep',
      'stretch', // prayer both
      'rest',
      'stretch', // pigeon left
      'switch',
      'stretch', // pigeon right
    ]);
    expect(t[3].sideLabel).toBe('Left');
    expect(t[5].sideLabel).toBe('Right');
  });

  it('omits the rest after the final step', () => {
    const t = buildTimeline(routine, settings);
    expect(t[t.length - 1].kind).toBe('stretch');
  });

  it('uses settings-driven prep and rest durations', () => {
    const t = buildTimeline(routine, { prepDurationSec: 8, restDurationSec: 20 });
    expect(t[0].durationSec).toBe(8);
    expect(t[2].durationSec).toBe(20);
  });

  it('sums the total duration', () => {
    const t = buildTimeline(routine, settings);
    // 5 prep + 30 prayer + 10 rest + 45 left + 3 switch + 45 right
    expect(timelineDurationSec(t)).toBe(138);
  });

  it('returns an empty timeline for an empty routine', () => {
    expect(buildTimeline({ ...routine, steps: [] }, settings)).toEqual([]);
  });
});

describe('routineActiveSec', () => {
  it('doubles per-side durations', () => {
    expect(routineActiveSec(routine)).toBe(30 + 45 * 2);
  });
});
