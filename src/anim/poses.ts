import { buildSkeleton, type JointName, type PoseSpec, type Skeleton, type Vec3 } from './skeleton';

/**
 * Poses for the Daily Warp exercises.
 *
 * Each is a short loop of two keyframes that the figure eases between, which
 * is what most mobility work actually is: an oscillation into and out of a
 * position. Poses are written as direction vectors, so limb lengths are fixed
 * by the rig and cannot drift.
 *
 * Axes: x right, y down, z toward the viewer. The figure faces +z, so "in
 * front of the body" is +z and "overhead" is -y.
 */

export interface ExerciseAnimation {
  keyframes: Skeleton[];
  /** One full there-and-back cycle, in milliseconds. */
  cycleMs: number;
  /** The angle this movement reads best from, used as the default. */
  bestAzimuth: number;
  /** Floor and seated work needs the camera looking down to be legible. */
  bestElevation?: number;
}

const FLOOR = 31;

/** How far the two floor exercises are turned on the spot. See turned(). */
const BRIDGE_TURN = 35;
const NINETY_TURN = 20;

function pose(spec: PoseSpec): Skeleton {
  return buildSkeleton(spec);
}

/** Rotate a direction about the vertical axis. Body +x swings toward +z. */
function rotY(v: Vec3, deg: number): Vec3 {
  const a = (deg * Math.PI) / 180;
  const [x, y, z] = v;
  return [x * Math.cos(a) - z * Math.sin(a), y, x * Math.sin(a) + z * Math.cos(a)];
}

/**
 * Turn a whole pose on the spot.
 *
 * Written for the poses that happen on the floor. The three view buttons are
 * absolute angles, so a body laid out along one world axis is inevitably
 * end-on from one of them — a bridge seen down its own length is a scribble.
 * Laying it on a diagonal instead costs the same nothing and leaves the long
 * axis 82%, 100% and 71% of its true length across the three views, so all
 * three stay readable.
 */
function turned(spec: PoseSpec, deg: number): PoseSpec {
  const out: Record<string, Vec3> = {};
  for (const [key, value] of Object.entries(spec)) {
    out[key] = rotY(value as Vec3, deg);
  }
  return out as PoseSpec;
}

/**
 * Drop every keyframe onto a shared floor.
 *
 * Poses are authored as angles, so the height the chain of bones happens to
 * end at is an accident of those angles — a squat keyframe would hang below
 * the standing one it eases from, and the figure would sink through the
 * ground and bob back out. Planting each keyframe's lowest point on the same
 * line means the feet stay put and the body moves over them.
 */
function grounded(keyframes: Skeleton[]): Skeleton[] {
  return keyframes.map((k) => {
    const lowest = Math.max(...Object.values(k).map((p) => p[1]));
    const shift = FLOOR - lowest;
    if (shift === 0) return k;
    const out = {} as Skeleton;
    for (const name of Object.keys(k) as JointName[]) {
      const [x, y, z] = k[name];
      out[name] = [x, y + shift, z];
    }
    return out;
  });
}

const RAW: Record<string, ExerciseAnimation> = {
  // Standing, one leg swinging like a pendulum. Reads from the side.
  'leg-swings-sagittal': {
    bestAzimuth: 78,
    cycleMs: 2600,
    keyframes: [
      pose({
        thighL: [0.1, -0.15, 1], shinL: [0.05, 0.95, 0.35],
        thighR: [-0.1, 1, 0], shinR: [0, 1, 0],
        upperArmL: [0.35, 0.85, 0.3], foreArmL: [0.2, 0.9, 0.3],
        upperArmR: [-0.3, 0.9, 0.2], foreArmR: [-0.15, 1, 0.1],
      }),
      pose({
        thighL: [0.1, 0.85, -0.75], shinL: [0, 1, -0.25],
        thighR: [-0.1, 1, 0], shinR: [0, 1, 0],
        upperArmL: [0.35, 0.85, 0.3], foreArmL: [0.2, 0.9, 0.3],
        upperArmR: [-0.3, 0.9, 0.2], foreArmR: [-0.15, 1, 0.1],
      }),
    ],
  },

  // Facing a wall, the leg sweeps across the body and back out.
  'leg-swings-lateral': {
    bestAzimuth: 0,
    cycleMs: 2600,
    keyframes: [
      pose({
        thighL: [-0.95, 0.75, 0.1], shinL: [-0.3, 1, 0],
        thighR: [-0.1, 1, 0], shinR: [0, 1, 0],
        upperArmL: [0.6, -0.15, 0.75], foreArmL: [0.3, -0.1, 0.95],
        upperArmR: [-0.6, -0.15, 0.75], foreArmR: [-0.3, -0.1, 0.95],
      }),
      pose({
        thighL: [0.95, 0.6, 0.1], shinL: [0.35, 1, 0],
        thighR: [-0.1, 1, 0], shinR: [0, 1, 0],
        upperArmL: [0.6, -0.15, 0.75], foreArmL: [0.3, -0.1, 0.95],
        upperArmR: [-0.6, -0.15, 0.75], foreArmR: [-0.3, -0.1, 0.95],
      }),
    ],
  },

  // Deep lunge, inside hand down, outside arm opening to the ceiling.
  'worlds-greatest-stretch': {
    bestAzimuth: 38,
    cycleMs: 3400,
    keyframes: [
      pose({
        root: [0, 13, 0],
        spine: [0, -1, 0.4],
        thighL: [0.3, 0.35, 1.05], shinL: [0.05, 1, -0.2],
        thighR: [-0.25, 0.8, -0.95], shinR: [0, 0.85, -0.65],
        footR: [0, -0.2, -1],
        upperArmL: [0.4, 1, 0.35], foreArmL: [0.05, 1, 0.05],
        upperArmR: [-0.35, 1, 0.4], foreArmR: [-0.05, 1, 0.05],
      }),
      pose({
        root: [0, 13, 0],
        spine: [0, -1, 0.4],
        shoulderLine: [0.55, -0.35, -0.75],
        thighL: [0.3, 0.35, 1.05], shinL: [0.05, 1, -0.2],
        thighR: [-0.25, 0.8, -0.95], shinR: [0, 0.85, -0.65],
        footR: [0, -0.2, -1],
        upperArmL: [0.4, 1, 0.35], foreArmL: [0.05, 1, 0.05],
        upperArmR: [-0.45, -0.9, -0.2], foreArmR: [-0.25, -1, -0.1],
      }),
    ],
  },

  // Standing tall, then stepping wide to one side and sitting into that hip.
  'step-out-side-lunge': {
    // Slightly turned: the step is lateral, so a true side view collapses it,
    // but a little rotation keeps the bent knee readable against the torso.
    bestAzimuth: 20,
    cycleMs: 3400,
    keyframes: [
      pose({
        thighL: [0.12, 1, 0], shinL: [0, 1, 0],
        thighR: [-0.12, 1, 0], shinR: [0, 1, 0],
        upperArmL: [0.22, 1, 0.08], foreArmL: [0.1, 1, 0.12],
        upperArmR: [-0.22, 1, 0.08], foreArmR: [-0.1, 1, 0.12],
      }),
      pose({
        // The trailing foot stays where it was and the body travels out over
        // the stepping leg — that is the difference between stepping out and
        // simply sinking into a wide stance.
        root: [8, 6, -4],
        spine: [0.04, -1, 0.34],
        // Pelvis tilts down toward the loaded side, which is what lets both
        // feet stay flat with one leg bent and the other long.
        hipLine: [1, 0.3, 0],
        thighL: [0.66, 0.66, 0.3], shinL: [-0.3, 0.93, -0.2],
        thighR: [-0.5, 0.86, -0.06], shinR: [-0.4, 0.92, 0.1],
        // Hands counterbalance forward as the hips travel back.
        upperArmL: [0.24, 0.62, 0.75], foreArmL: [0.1, 0.5, 0.86],
        upperArmR: [-0.24, 0.62, 0.75], foreArmR: [-0.1, 0.5, 0.86],
      }),
    ],
  },

  // Bottom of a squat, elbows inside the knees, rocking side to side.
  'deep-squat-pry': {
    bestAzimuth: 26,
    bestElevation: 14,
    cycleMs: 3200,
    keyframes: [
      pose({
        root: [-2, 19, 0],
        spine: [0, -1, 0.18],
        thighL: [0.42, 0.2, 0.95], shinL: [0.1, 1, -0.55],
        thighR: [-0.42, 0.2, 0.95], shinR: [-0.1, 1, -0.55],
        upperArmL: [0.28, 0.7, 0.7], foreArmL: [-0.5, 0.2, 0.85],
        upperArmR: [-0.28, 0.7, 0.7], foreArmR: [0.5, 0.2, 0.85],
      }),
      pose({
        root: [2, 19, 0],
        spine: [0, -1, 0.18],
        thighL: [0.42, 0.2, 0.95], shinL: [0.1, 1, -0.55],
        thighR: [-0.42, 0.2, 0.95], shinR: [-0.1, 1, -0.55],
        upperArmL: [0.28, 0.7, 0.7], foreArmL: [-0.5, 0.2, 0.85],
        upperArmR: [-0.28, 0.7, 0.7], foreArmR: [0.5, 0.2, 0.85],
      }),
    ],
  },

  // On the back, one knee held to the chest, hips driving up and lowering
  // on the single planted foot.
  // Written along the body's own axis and then turned, so no view is end-on.
  'single-leg-glute-bridge': {
    bestAzimuth: 35,
    bestElevation: 30,
    cycleMs: 3000,
    keyframes: [
      pose(
        turned(
          {
            // Bottom: pelvis back down on the floor the shoulders never left,
            // so the spine lies flat along it.
            root: [0, 31, 0],
            spine: [-1, 0, 0],
            neck: [-1, 0, 0],
            head: [-0.9, -0.3, 0],
            shoulderLine: [0, 0, 1],
            hipLine: [0, 0, 1],
            // Folded over the chest, not flat on the floor: floor-level arms
            // run parallel to the torso and the thighs from every raised
            // camera, and the pose turned into four overlapping diagonals.
            upperArmL: [0.2, -0.85, 0.45], foreArmL: [-0.15, 0.4, -0.9],
            upperArmR: [0.2, -0.85, -0.45], foreArmR: [-0.15, 0.4, 0.9],
            // Knee up, foot flat: with the pelvis down, the thigh rises from
            // it and the shin comes back down to the same floor.
            thighL: [0.72, -0.7, 0.06], shinL: [0.62, 0.79, 0.02],
            // The free leg is held there throughout — this is one long hold on
            // one leg, not the alternating march it replaced.
            thighR: [0.28, -1, -0.1], shinR: [0.78, 0.62, 0],
            footL: [1, 0.06, 0], footR: [0.5, 0.5, 0],
          },
          BRIDGE_TURN,
        ),
      ),
      pose(
        turned(
          {
            // Top: pelvis a spine's worth of lift above shoulders on the floor.
            root: [0, 19, 0],
            spine: [-0.8, 0.6, 0],
            neck: [-1, 0, 0],
            head: [-0.9, -0.3, 0],
            shoulderLine: [0, 0, 1],
            hipLine: [0, 0, 1],
            upperArmL: [0.2, -0.85, 0.45], foreArmL: [-0.15, 0.4, -0.9],
            upperArmR: [0.2, -0.85, -0.45], foreArmR: [-0.15, 0.4, 0.9],
            thighL: [0.99, -0.16, 0.06], shinL: [0.26, 0.967, 0.02],
            thighR: [0.22, -1, -0.1], shinR: [0.72, 0.69, 0],
            footL: [1, 0.06, 0], footR: [0.5, 0.5, 0],
          },
          BRIDGE_TURN,
        ),
      ),
    ],
  },

  // Seated with both knees at ninety degrees, rotating through to swap.
  'ninety-ninety-switches': {
    bestAzimuth: 35,
    bestElevation: 40,
    cycleMs: 3800,
    keyframes: [
      pose(
        turned(
          {
            root: [0, 31, 0],
            spine: [0, -1, 0.08],
            // Front leg: thigh out to the front corner, shin across the body.
            thighL: [0.6, 0, 0.8], shinL: [-0.95, 0, -0.3],
            footL: [-0.9, 0, 0.4],
            // Back leg: thigh out to the side, shin folded back behind it.
            thighR: [-0.95, 0, -0.3], shinR: [0.3, 0, -0.95],
            footR: [0.2, 0, -0.98],
            // Hands down to the floor beside the hips. Kept out of the depth
            // axis so the arms do not cross the legs into an unreadable knot.
            upperArmL: [0.55, 0.83, 0.1], foreArmL: [0.45, 0.89, 0.1],
            upperArmR: [-0.55, 0.83, 0.1], foreArmR: [-0.45, 0.89, 0.1],
          },
          NINETY_TURN,
        ),
      ),
      pose(
        turned(
          {
            root: [0, 31, 0],
            spine: [0, -1, 0.08],
            thighL: [0.95, 0, -0.3], shinL: [-0.3, 0, -0.95],
            footL: [-0.2, 0, -0.98],
            thighR: [-0.6, 0, 0.8], shinR: [0.95, 0, -0.3],
            footR: [0.9, 0, 0.4],
            upperArmL: [0.45, 0.9, 0.2], foreArmL: [0.35, 0.9, 0.25],
            upperArmR: [-0.45, 0.9, 0.2], foreArmR: [-0.35, 0.9, 0.25],
          },
          NINETY_TURN,
        ),
      ),
    ],
  },

  // Long split stance sinking until the back knee is near the floor and the
  // front knee is well past the toes. Reads from the side, where the depth
  // axis carries the whole movement.
  'atg-split-squat': {
    bestAzimuth: 78,
    cycleMs: 3400,
    keyframes: [
      pose({
        thighL: [0.12, 0.86, 0.5], shinL: [0, 1, -0.12],
        thighR: [-0.12, 0.62, -0.78], shinR: [0, 0.9, -0.05],
        // Back heel is up from the start — the toes are the only contact
        // behind, which is what allows the stance to be this long.
        footR: [0, 0.62, -0.79],
        upperArmL: [0.28, 0.92, 0.2], foreArmL: [0.12, 0.96, 0.24],
        upperArmR: [-0.28, 0.92, 0.2], foreArmR: [-0.12, 0.96, 0.24],
      }),
      pose({
        root: [0, 13, -1],
        spine: [0, -1, 0.08],
        // Shin raked forward past vertical: the knee ends up ahead of the
        // toes, which is the position the whole exercise is named for.
        thighL: [0.1, 0.34, 0.94], shinL: [0, 0.82, -0.57],
        footL: [0, 0.1, 1],
        // Back knee dropping to just off the floor, shin running back to the
        // raised heel behind it.
        thighR: [-0.1, 0.9, -0.43], shinR: [0, -0.12, -0.99],
        footR: [0, 0.94, -0.34],
        upperArmL: [0.28, 0.9, 0.28], foreArmL: [0.12, 0.94, 0.3],
        upperArmR: [-0.28, 0.9, 0.28], foreArmR: [-0.12, 0.94, 0.3],
      }),
    ],
  },
};

const ANIMATIONS: Record<string, ExerciseAnimation> = Object.fromEntries(
  Object.entries(RAW).map(([id, anim]) => [id, { ...anim, keyframes: grounded(anim.keyframes) }]),
);

/** Degrees for each named view. 'auto' defers to the exercise. */
export const VIEW_AZIMUTH = {
  front: 0,
  'three-quarter': 35,
  side: 80,
} as const;

export function animationFor(exerciseId: string): ExerciseAnimation | undefined {
  return ANIMATIONS[exerciseId];
}

export function hasAnimation(exerciseId: string): boolean {
  return exerciseId in ANIMATIONS;
}

export const ANIMATED_EXERCISE_IDS = Object.keys(ANIMATIONS);

export { FLOOR };
