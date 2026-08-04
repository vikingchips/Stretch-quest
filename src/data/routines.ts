import type { Routine } from '../types';

/**
 * The built-in routines follow a mobility protocol built around one split:
 * dynamic work goes before activity, and range-building loaded/static work is
 * kept away from performance. That split is why the recovery routine exists at
 * all — it lets a daily habit survive without long static holds landing right
 * before a climb.
 */
export const BUILTIN_ROUTINES: Routine[] = [
  // ── Daily baseline ─────────────────────────────────────────────────────
  {
    id: 'daily-warp',
    name: 'Daily Warp',
    description:
      'The lowest common denominator for hips, glutes and ankles. Ten minutes that cover both sports and keep the habit alive on days you do nothing else.',
    category: 'hybrid',
    timing: 'anytime',
    guidance: 'Morning, or before any activity. This is the one to default to.',
    isCustom: false,
    steps: [
      { exerciseId: 'leg-swings-sagittal', durationSec: 45 },
      { exerciseId: 'leg-swings-lateral', durationSec: 45 },
      { exerciseId: 'worlds-greatest-stretch', durationSec: 45 },
      { exerciseId: 'cossack-squat', durationSec: 45 },
      { exerciseId: 'deep-squat-pry', durationSec: 60 },
      { exerciseId: 'glute-bridge-march', durationSec: 60 },
      { exerciseId: 'ninety-ninety-switches', durationSec: 90 },
      { exerciseId: 'wall-ankle-rocker', durationSec: 45 },
    ],
  },

  // ── Before climbing ────────────────────────────────────────────────────
  {
    id: 'hip-nebula',
    name: 'Hip Nebula',
    description:
      'Opens the hip galaxy for high steps and drop knees. All dynamic, so it costs you nothing on the wall.',
    category: 'climbing',
    timing: 'pre-activity',
    guidance: 'Straight before climbing.',
    isCustom: false,
    steps: [
      { exerciseId: 'leg-swings-sagittal', durationSec: 45 },
      { exerciseId: 'leg-swings-lateral', durationSec: 45 },
      { exerciseId: 'ninety-ninety-switches', durationSec: 90 },
      { exerciseId: 'deep-squat-pry', durationSec: 60 },
      { exerciseId: 'cossack-squat', durationSec: 45 },
      { exerciseId: 'frog-rocks', durationSec: 60 },
      { exerciseId: 'worlds-greatest-stretch', durationSec: 45 },
      { exerciseId: 'wall-ankle-rocker', durationSec: 45 },
    ],
  },
  {
    id: 'hip-nebula-long',
    name: 'Hip Nebula, Long',
    description:
      'The twenty-minute version: the same sequence at a slower tempo, with loaded Cossacks and a second, deeper round.',
    category: 'climbing',
    timing: 'pre-activity',
    guidance: 'Before a longer session, or on days the first few moves feel tight.',
    isCustom: false,
    steps: [
      { exerciseId: 'leg-swings-sagittal', durationSec: 45 },
      { exerciseId: 'leg-swings-lateral', durationSec: 45 },
      { exerciseId: 'ninety-ninety-switches', durationSec: 90 },
      { exerciseId: 'deep-squat-pry', durationSec: 60 },
      { exerciseId: 'cossack-squat', durationSec: 60, sets: 2 },
      { exerciseId: 'frog-rocks', durationSec: 90 },
      { exerciseId: 'worlds-greatest-stretch', durationSec: 60 },
      { exerciseId: 'seated-ninety-ninety-lift', durationSec: 45 },
      { exerciseId: 'lizard-lunge', durationSec: 45 },
      { exerciseId: 'wall-ankle-rocker', durationSec: 60 },
    ],
  },

  // ── Before running ─────────────────────────────────────────────────────
  {
    id: 'stride-ignition',
    name: 'Stride Ignition',
    description:
      'Raises temperature, wakes the glutes and primes cadence. Built to protect running economy rather than chase flexibility.',
    category: 'running',
    timing: 'pre-activity',
    guidance: 'Before running. Follows the raise, activate, mobilise, potentiate order.',
    caution:
      'No static calf or hamstring stretching before you run — lower passive flexibility tracks with better running economy.',
    isCustom: false,
    steps: [
      { exerciseId: 'jog-in-place', durationSec: 60 },
      { exerciseId: 'leg-swings-sagittal', durationSec: 45 },
      { exerciseId: 'walking-lunge-rotation', durationSec: 60 },
      { exerciseId: 'glute-bridge-march', durationSec: 60 },
      { exerciseId: 'wall-ankle-rocker', durationSec: 45 },
      { exerciseId: 'a-skips', durationSec: 45 },
      { exerciseId: 'high-knees-butt-kicks', durationSec: 45 },
      { exerciseId: 'build-up-strides', durationSec: 90 },
    ],
  },
  {
    id: 'stride-ignition-long',
    name: 'Stride Ignition, Long',
    description:
      'The twenty-minute version: more drills and more strides before a hard session or a race.',
    category: 'running',
    timing: 'pre-activity',
    guidance: 'Before intervals or a race.',
    caution:
      'Still no static calf or hamstring work beforehand. Save the eccentric block for after the run.',
    isCustom: false,
    steps: [
      { exerciseId: 'jog-in-place', durationSec: 120 },
      { exerciseId: 'leg-swings-sagittal', durationSec: 45 },
      { exerciseId: 'leg-swings-lateral', durationSec: 45 },
      { exerciseId: 'walking-lunge-rotation', durationSec: 90 },
      { exerciseId: 'glute-bridge-march', durationSec: 60 },
      { exerciseId: 'wall-ankle-rocker', durationSec: 45 },
      { exerciseId: 'a-skips', durationSec: 60 },
      { exerciseId: 'high-knees-butt-kicks', durationSec: 60 },
      { exerciseId: 'build-up-strides', durationSec: 120, sets: 2 },
    ],
  },

  // ── Away from performance ──────────────────────────────────────────────
  {
    id: 'deep-dive',
    name: 'Deep Dive',
    description:
      'Where range actually gets built. Loaded eccentrics for the tissues that tear, then long holds for the positions that block you.',
    category: 'recovery',
    timing: 'away-from-performance',
    guidance:
      'Rest days, or at least four to six hours after climbing. Two or three times a week is plenty.',
    caution:
      'Not before climbing or running. Long holds cost acute force output, which is the whole reason this routine is separate.',
    isCustom: false,
    steps: [
      { exerciseId: 'nordic-hamstring', durationSec: 40, sets: 2, reps: 5 },
      { exerciseId: 'copenhagen-adduction', durationSec: 25, sets: 2 },
      { exerciseId: 'frog-pose', durationSec: 90 },
      { exerciseId: 'couch-stretch', durationSec: 60 },
      { exerciseId: 'seated-ninety-ninety-lift', durationSec: 45 },
      { exerciseId: 'pancake-fold', durationSec: 90 },
    ],
  },
];

export const BUILTIN_ROUTINE_BY_ID: Record<string, Routine> = Object.fromEntries(
  BUILTIN_ROUTINES.map((r) => [r.id, r]),
);
