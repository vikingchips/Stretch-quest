import { describe, expect, it } from 'vitest';
import { ANIMATED_EXERCISE_IDS, animationFor } from './poses';
import { BONES, buildSkeleton, type JointName } from './skeleton';
import { EXERCISE_BY_ID } from '../data/exercises';

const NEUTRAL = buildSkeleton({});

function length(a: readonly number[], b: readonly number[]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

describe('poses', () => {
  it('animates only exercises that exist', () => {
    for (const id of ANIMATED_EXERCISE_IDS) {
      expect(EXERCISE_BY_ID[id], id).toBeDefined();
    }
  });

  it.each(ANIMATED_EXERCISE_IDS)('%s keeps every bone its own length', (id) => {
    // Turning a pose and dropping it onto the floor are a rotation and a
    // translation, so neither may stretch the figure.
    for (const frame of animationFor(id)!.keyframes) {
      for (const [from, to] of BONES) {
        expect(length(frame[from as JointName], frame[to as JointName])).toBeCloseTo(
          length(NEUTRAL[from as JointName], NEUTRAL[to as JointName]),
          6,
        );
      }
    }
  });

  it.each(ANIMATED_EXERCISE_IDS)('%s stands every keyframe on the same floor', (id) => {
    // Otherwise the figure sinks through the ground and bobs back out as the
    // animation eases from one keyframe to the other.
    const floors = animationFor(id)!.keyframes.map((frame) =>
      Math.max(...Object.values(frame).map((p) => p[1])),
    );
    for (const floor of floors) expect(floor).toBeCloseTo(floors[0], 6);
  });

  it.each(ANIMATED_EXERCISE_IDS)('%s is a two-keyframe loop', (id) => {
    const animation = animationFor(id)!;
    expect(animation.keyframes).toHaveLength(2);
    expect(animation.cycleMs).toBeGreaterThan(0);
  });
});
