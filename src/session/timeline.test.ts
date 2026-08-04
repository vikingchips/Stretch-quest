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

describe('sets', () => {
  const multiSet: Routine = {
    ...routine,
    steps: [
      { exerciseId: 'prayer-stretch', durationSec: 30, sets: 2 },
      { exerciseId: 'pigeon-pose', durationSec: 45 },
    ],
  };

  it('repeats a step once per set with rest between sets', () => {
    const t = buildTimeline(multiSet, settings);
    expect(t.map((s) => s.kind)).toEqual([
      'prep',
      'stretch', // prayer set 1
      'rest', // between sets
      'stretch', // prayer set 2
      'rest', // between exercises
      'stretch', // pigeon left
      'switch',
      'stretch', // pigeon right
    ]);
  });

  it('labels each set and keeps the between-set rest on the same step', () => {
    const t = buildTimeline(multiSet, settings);
    expect(t[1].setIndex).toBe(1);
    expect(t[1].setTotal).toBe(2);
    expect(t[2].stepIndex).toBe(0); // rest belongs to the step being repeated
    expect(t[3].setIndex).toBe(2);
    expect(t[4].stepIndex).toBe(1); // rest hands over to the next step
  });

  it('leaves single-set steps unlabelled', () => {
    const t = buildTimeline(routine, settings);
    expect(t[1].setIndex).toBeUndefined();
  });

  it('counts every set toward active seconds', () => {
    expect(routineActiveSec(multiSet)).toBe(30 * 2 + 45 * 2);
  });
});

describe('rep-based work', () => {
  const repRoutine: Routine = {
    ...routine,
    steps: [{ exerciseId: 'nordic-hamstring', durationSec: 40, sets: 2, reps: 5 }],
  };

  it('marks rep segments self-paced and carries the rep count', () => {
    const t = buildTimeline(repRoutine, settings);
    const work = t.filter((s) => s.kind === 'stretch');
    expect(work).toHaveLength(2);
    expect(work.every((s) => s.selfPaced)).toBe(true);
    expect(work[0].reps).toBe(5);
  });

  it('falls back to the exercise default rep count', () => {
    const t = buildTimeline(
      { ...routine, steps: [{ exerciseId: 'nordic-hamstring', durationSec: 40 }] },
      settings,
    );
    expect(t[1].reps).toBe(5);
  });
});
