import { describe, expect, it } from 'vitest';
import { BONES, blend, buildSkeleton, fit, project, projectSkeleton } from './skeleton';

const NEUTRAL = buildSkeleton({});

function length(a: readonly number[], b: readonly number[]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

describe('buildSkeleton', () => {
  it('places every joint the bone list refers to', () => {
    for (const [from, to] of BONES) {
      expect(NEUTRAL[from]).toBeDefined();
      expect(NEUTRAL[to]).toBeDefined();
    }
  });

  it('keeps bone lengths fixed however the pose is written', () => {
    // Poses are direction vectors, so a limb cannot stretch — this is the
    // property that makes hand-authored poses safe.
    const folded = buildSkeleton({
      thighL: [0.4, 0.2, 0.9],
      shinL: [0.1, 1, -0.6],
      upperArmL: [0.3, -0.9, 0.2],
    });
    expect(length(folded.hipL, folded.kneeL)).toBeCloseTo(
      length(NEUTRAL.hipL, NEUTRAL.kneeL),
      6,
    );
    expect(length(folded.shoulderL, folded.elbowL)).toBeCloseTo(
      length(NEUTRAL.shoulderL, NEUTRAL.elbowL),
      6,
    );
  });

  it('normalises direction vectors, so magnitude does not matter', () => {
    const small = buildSkeleton({ thighL: [0, 1, 0] });
    const large = buildSkeleton({ thighL: [0, 40, 0] });
    expect(small.kneeL).toEqual(large.kneeL);
  });
});

describe('project', () => {
  it('leaves a point untouched from straight on', () => {
    const p = project([3, 5, 7], { azimuth: 0, elevation: 0 });
    expect(p.x).toBeCloseTo(3);
    expect(p.y).toBeCloseTo(5);
  });

  it('turns depth into horizontal offset when viewed from the side', () => {
    // At 90 degrees, what was in front of the body is now across the screen.
    const p = project([0, 0, 10], { azimuth: 90, elevation: 0 });
    expect(p.x).toBeCloseTo(10);
  });

  it('projects equal parallel segments equally, however far away', () => {
    // The orthographic promise: depth changes nothing about size. It does
    // not promise that a segment along the tilt axis keeps its length —
    // that foreshortening is exactly what makes the pose read as 3D.
    const camera = { azimuth: 33, elevation: 12 };
    const near = [project([0, 0, 0], camera), project([0, 10, 0], camera)];
    const far = [project([0, 0, 60], camera), project([0, 10, 60], camera)];
    const span = ([a, b]: ReturnType<typeof project>[]) =>
      Math.hypot(b.x - a.x, b.y - a.y);
    expect(span(far)).toBeCloseTo(span(near), 6);
  });

  it('reports depth so nearer limbs can be drawn differently', () => {
    const near = project([0, 0, 5], { azimuth: 0, elevation: 0 });
    const far = project([0, 0, -5], { azimuth: 0, elevation: 0 });
    expect(near.depth).toBeGreaterThan(far.depth);
  });
});

describe('blend', () => {
  it('returns the endpoints exactly', () => {
    const other = buildSkeleton({ thighL: [1, 0.2, 0] });
    expect(blend(NEUTRAL, other, 0)).toEqual(NEUTRAL);
    expect(blend(NEUTRAL, other, 1)).toEqual(other);
  });

  it('lands halfway at the midpoint', () => {
    const other = buildSkeleton({ root: [10, 0, 0] });
    expect(blend(NEUTRAL, other, 0.5).pelvis[0]).toBeCloseTo(5);
  });
});

describe('fit', () => {
  it('keeps the whole figure inside the box', () => {
    const joints = fit(projectSkeleton(NEUTRAL, { azimuth: 30, elevation: 10 }), 100, 135);
    for (const p of Object.values(joints)) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(100);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(135);
    }
  });

  it('scales without distorting — a limb keeps its proportion', () => {
    const camera = { azimuth: 0, elevation: 0 };
    const joints = fit(projectSkeleton(NEUTRAL, camera), 100, 135);
    const raw = projectSkeleton(NEUTRAL, camera);
    const rawRatio =
      Math.hypot(raw.hipL.x - raw.kneeL.x, raw.hipL.y - raw.kneeL.y) /
      Math.hypot(raw.kneeL.x - raw.ankleL.x, raw.kneeL.y - raw.ankleL.y);
    const fitRatio =
      Math.hypot(joints.hipL.x - joints.kneeL.x, joints.hipL.y - joints.kneeL.y) /
      Math.hypot(joints.kneeL.x - joints.ankleL.x, joints.kneeL.y - joints.ankleL.y);
    expect(fitRatio).toBeCloseTo(rawRatio, 5);
  });
});
