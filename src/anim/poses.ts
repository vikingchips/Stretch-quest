import { buildSkeleton, type PoseSpec, type Skeleton } from './skeleton';

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

function pose(spec: PoseSpec): Skeleton {
  return buildSkeleton(spec);
}

const ANIMATIONS: Record<string, ExerciseAnimation> = {
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

  // Wide stance, weight sinking over one bent leg while the other stays long.
  'cossack-squat': {
    bestAzimuth: 12,
    cycleMs: 3600,
    keyframes: [
      pose({
        thighL: [0.7, 0.85, 0], shinL: [-0.1, 1, 0],
        thighR: [-0.7, 0.85, 0], shinR: [0.1, 1, 0],
        upperArmL: [0.3, 0.35, 0.85], foreArmL: [0.05, 0.1, 1],
        upperArmR: [-0.3, 0.35, 0.85], foreArmR: [-0.05, 0.1, 1],
      }),
      pose({
        root: [6, 12, 0],
        spine: [0, -1, 0.2],
        thighL: [0.5, 0.75, 0.35], shinL: [-0.55, 1, -0.25],
        thighR: [-1, 0.28, 0], shinR: [-1, 0.3, 0],
        footR: [-0.35, -1, 0.25],
        upperArmL: [0.25, 0.2, 0.95], foreArmL: [0, 0.05, 1],
        upperArmR: [-0.25, 0.2, 0.95], foreArmR: [0, 0.05, 1],
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

  // On the back, hips held up, knees lifting one at a time.
  'glute-bridge-march': {
    // Lying along the x axis, so the side view is azimuth 0 — looking from
    // 90 would stare down the length of the body.
    bestAzimuth: 6,
    bestElevation: 34,
    cycleMs: 3000,
    keyframes: [
      pose({
        root: [0, 19, 0],
        spine: [-1, 0.5, 0],
        neck: [-1, 0.25, 0],
        head: [-1, 0.05, 0],
        shoulderLine: [0, 0, 1],
        hipLine: [0, 0, 1],
        thighL: [1, -0.45, 0.35], shinL: [0.18, 1, 0.05],
        thighR: [1, -0.45, -0.35], shinR: [0.18, 1, -0.05],
        upperArmL: [-0.5, 0.35, 1], foreArmL: [-0.75, 0.3, 0.75],
        upperArmR: [-0.5, 0.35, -1], foreArmR: [-0.75, 0.3, -0.75],
        footL: [1, 0.1, 0], footR: [1, 0.1, 0],
      }),
      pose({
        root: [0, 19, 0],
        spine: [-1, 0.5, 0],
        neck: [-1, 0.25, 0],
        head: [-1, 0.05, 0],
        shoulderLine: [0, 0, 1],
        hipLine: [0, 0, 1],
        thighL: [1, -0.45, 0.35], shinL: [0.18, 1, 0.05],
        thighR: [0.35, -1, -0.4], shinR: [0.6, 1, -0.15],
        upperArmL: [-0.5, 0.35, 1], foreArmL: [-0.75, 0.3, 0.75],
        upperArmR: [-0.5, 0.35, -1], foreArmR: [-0.75, 0.3, -0.75],
        footL: [1, 0.1, 0], footR: [0.9, 0.3, 0],
      }),
    ],
  },

  // Seated with both knees at ninety degrees, rotating through to swap.
  'ninety-ninety-switches': {
    bestAzimuth: 18,
    bestElevation: 34,
    cycleMs: 3800,
    keyframes: [
      pose({
        root: [0, 28, 0],
        spine: [0, -1, 0.05],
        thighL: [0.4, 0.05, 1], shinL: [1, 0.05, -0.25],
        thighR: [-1, 0.05, 0.25], shinR: [-0.2, 0.05, -1],
        upperArmL: [0.5, 0.9, 0.15], foreArmL: [0.25, 1, 0],
        upperArmR: [-0.5, 0.9, 0.15], foreArmR: [-0.25, 1, 0],
      }),
      pose({
        root: [0, 28, 0],
        spine: [0, -1, 0.05],
        thighL: [1, 0.05, 0.25], shinL: [0.2, 0.05, -1],
        thighR: [-0.4, 0.05, 1], shinR: [-1, 0.05, -0.25],
        upperArmL: [0.5, 0.9, 0.15], foreArmL: [0.25, 1, 0],
        upperArmR: [-0.5, 0.9, 0.15], foreArmR: [-0.25, 1, 0],
      }),
    ],
  },

  // Staggered at a wall, front knee driving forward over the toes.
  'wall-ankle-rocker': {
    bestAzimuth: 74,
    cycleMs: 2800,
    keyframes: [
      pose({
        thighL: [0.15, 0.95, 0.3], shinL: [0, 1, 0.05],
        thighR: [-0.15, 0.95, -0.35], shinR: [0, 1, -0.12],
        upperArmL: [0.35, -0.25, 0.9], foreArmL: [0.12, -0.15, 1],
        upperArmR: [-0.35, -0.25, 0.9], foreArmR: [-0.12, -0.15, 1],
      }),
      pose({
        root: [0, 4, 0],
        spine: [0, -1, 0.12],
        thighL: [0.15, 0.7, 0.72], shinL: [0, 1, -0.5],
        thighR: [-0.15, 0.92, -0.4], shinR: [0, 1, -0.18],
        upperArmL: [0.35, -0.25, 0.9], foreArmL: [0.12, -0.15, 1],
        upperArmR: [-0.35, -0.25, 0.9], foreArmR: [-0.12, -0.15, 1],
      }),
    ],
  },
};

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
