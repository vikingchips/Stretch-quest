/**
 * A pose is fourteen points in space, not a model.
 *
 * Storing joints in 3D and projecting them means one pose definition serves
 * every camera angle — front, three-quarter, side — instead of needing a
 * separate drawing per view. There is no mesh, no texture and no asset: a
 * pose is about a dozen direction vectors, so the whole system costs nothing
 * in bundle size and works offline like everything else.
 *
 * Axes: x right, y down (matching SVG), z toward the viewer.
 */

export type Vec3 = readonly [number, number, number];

export type JointName =
  | 'pelvis'
  | 'chest'
  | 'neck'
  | 'head'
  | 'shoulderL'
  | 'shoulderR'
  | 'elbowL'
  | 'elbowR'
  | 'handL'
  | 'handR'
  | 'hipL'
  | 'hipR'
  | 'kneeL'
  | 'kneeR'
  | 'ankleL'
  | 'ankleR'
  | 'toeL'
  | 'toeR';

export type Skeleton = Record<JointName, Vec3>;

/**
 * Fixed proportions. Poses specify directions only, so limbs can never
 * stretch or shrink — the figure stays anatomically consistent by
 * construction rather than by careful authoring.
 */
const BONE = {
  spine: 20,
  neck: 5,
  head: 6,
  shoulderSpan: 11,
  upperArm: 12,
  foreArm: 11,
  hipSpan: 8,
  thigh: 16,
  shin: 15,
  foot: 6,
} as const;

/** Direction vectors need not be unit length; they are normalised here. */
function step(from: Vec3, dir: Vec3, length: number): Vec3 {
  const [dx, dy, dz] = dir;
  const mag = Math.hypot(dx, dy, dz) || 1;
  return [
    from[0] + (dx / mag) * length,
    from[1] + (dy / mag) * length,
    from[2] + (dz / mag) * length,
  ];
}

/** One side of the body, or the torso, described as directions. */
export interface PoseSpec {
  /** Where the pelvis sits. Use it to plant the figure on the floor. */
  root?: Vec3;
  spine?: Vec3;
  neck?: Vec3;
  head?: Vec3;
  /** Direction the shoulder line points, from centre to the left shoulder. */
  shoulderLine?: Vec3;
  hipLine?: Vec3;
  upperArmL?: Vec3;
  upperArmR?: Vec3;
  foreArmL?: Vec3;
  foreArmR?: Vec3;
  thighL?: Vec3;
  thighR?: Vec3;
  shinL?: Vec3;
  shinR?: Vec3;
  footL?: Vec3;
  footR?: Vec3;
}

/** Standing upright, arms down, feet under hips. Every pose starts here. */
const NEUTRAL: Required<PoseSpec> = {
  root: [0, 0, 0],
  spine: [0, -1, 0],
  neck: [0, -1, 0],
  head: [0, -1, 0],
  shoulderLine: [1, 0, 0],
  hipLine: [1, 0, 0],
  upperArmL: [0.25, 1, 0],
  upperArmR: [-0.25, 1, 0],
  foreArmL: [0.1, 1, 0],
  foreArmR: [-0.1, 1, 0],
  thighL: [0.1, 1, 0],
  thighR: [-0.1, 1, 0],
  shinL: [0, 1, 0],
  shinR: [0, 1, 0],
  footL: [0, 0.15, 1],
  footR: [0, 0.15, 1],
};

export function buildSkeleton(spec: PoseSpec): Skeleton {
  const s = { ...NEUTRAL, ...spec };
  const pelvis = s.root;
  const chest = step(pelvis, s.spine, BONE.spine);
  const neck = step(chest, s.neck, BONE.neck);
  const head = step(neck, s.head, BONE.head);

  const half = BONE.shoulderSpan / 2;
  const shoulderL = step(chest, s.shoulderLine, half);
  const shoulderR = step(chest, s.shoulderLine, -half);
  const elbowL = step(shoulderL, s.upperArmL, BONE.upperArm);
  const elbowR = step(shoulderR, s.upperArmR, BONE.upperArm);
  const handL = step(elbowL, s.foreArmL, BONE.foreArm);
  const handR = step(elbowR, s.foreArmR, BONE.foreArm);

  const hipHalf = BONE.hipSpan / 2;
  const hipL = step(pelvis, s.hipLine, hipHalf);
  const hipR = step(pelvis, s.hipLine, -hipHalf);
  const kneeL = step(hipL, s.thighL, BONE.thigh);
  const kneeR = step(hipR, s.thighR, BONE.thigh);
  const ankleL = step(kneeL, s.shinL, BONE.shin);
  const ankleR = step(kneeR, s.shinR, BONE.shin);
  const toeL = step(ankleL, s.footL, BONE.foot);
  const toeR = step(ankleR, s.footR, BONE.foot);

  return {
    pelvis, chest, neck, head,
    shoulderL, shoulderR, elbowL, elbowR, handL, handR,
    hipL, hipR, kneeL, kneeR, ankleL, ankleR, toeL, toeR,
  };
}

/** Bones as joint pairs, in draw order. */
export const BONES: ReadonlyArray<readonly [JointName, JointName]> = [
  ['pelvis', 'chest'],
  ['chest', 'neck'],
  ['shoulderL', 'shoulderR'],
  ['hipL', 'hipR'],
  ['shoulderL', 'elbowL'],
  ['elbowL', 'handL'],
  ['shoulderR', 'elbowR'],
  ['elbowR', 'handR'],
  ['hipL', 'kneeL'],
  ['kneeL', 'ankleL'],
  ['ankleL', 'toeL'],
  ['hipR', 'kneeR'],
  ['kneeR', 'ankleR'],
  ['ankleR', 'toeR'],
];

export interface Camera {
  /** Degrees around the vertical axis. 0 faces you, 90 is a side view. */
  azimuth: number;
  /** Degrees above the horizon. A little looks natural; a lot looks aerial. */
  elevation: number;
}

export interface Projected {
  x: number;
  y: number;
  /** Depth after rotation. Positive is nearer; used only for depth cueing. */
  depth: number;
}

/** Orthographic projection — no perspective, which suits flat line art. */
export function project(point: Vec3, camera: Camera): Projected {
  const az = (camera.azimuth * Math.PI) / 180;
  const el = (camera.elevation * Math.PI) / 180;
  const [x, y, z] = point;

  const rx = x * Math.cos(az) + z * Math.sin(az);
  const rz = -x * Math.sin(az) + z * Math.cos(az);
  const ry = y * Math.cos(el) - rz * Math.sin(el);
  const depth = y * Math.sin(el) + rz * Math.cos(el);

  return { x: rx, y: ry, depth };
}

export function projectSkeleton(
  skeleton: Skeleton,
  camera: Camera,
): Record<JointName, Projected> {
  const out = {} as Record<JointName, Projected>;
  for (const name of Object.keys(skeleton) as JointName[]) {
    out[name] = project(skeleton[name], camera);
  }
  return out;
}

/** Straight-line blend between two poses. Bone lengths survive it closely
 *  enough at these amplitudes, and it avoids quaternion machinery for what
 *  is ultimately a stick figure. */
export function blend(a: Skeleton, b: Skeleton, t: number): Skeleton {
  // The animation turns around at exactly these values, and p + (q - p) is
  // not bit-identical to q, so return the keyframes themselves.
  if (t <= 0) return a;
  if (t >= 1) return b;
  const out = {} as Skeleton;
  for (const name of Object.keys(a) as JointName[]) {
    const p = a[name];
    const q = b[name];
    out[name] = [
      p[0] + (q[0] - p[0]) * t,
      p[1] + (q[1] - p[1]) * t,
      p[2] + (q[2] - p[2]) * t,
    ];
  }
  return out;
}

/** Fit a projected figure into a viewBox, preserving aspect. */
export function fit(
  joints: Record<JointName, Projected>,
  width: number,
  height: number,
  padding = 6,
): Record<JointName, Projected> {
  const values = Object.values(joints);
  const xs = values.map((p) => p.x);
  const ys = values.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const scale = Math.min(
    (width - padding * 2) / Math.max(1, maxX - minX),
    (height - padding * 2) / Math.max(1, maxY - minY),
  );
  const offsetX = (width - (maxX - minX) * scale) / 2 - minX * scale;
  const offsetY = (height - (maxY - minY) * scale) / 2 - minY * scale;

  const out = {} as Record<JointName, Projected>;
  for (const name of Object.keys(joints) as JointName[]) {
    const p = joints[name];
    out[name] = { x: p.x * scale + offsetX, y: p.y * scale + offsetY, depth: p.depth };
  }
  return out;
}
