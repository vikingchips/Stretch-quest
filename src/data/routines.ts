import type { Routine } from '../types';

/**
 * Two splits run through this set.
 *
 * The first is timing: dynamic work goes before activity, range-building
 * loaded work is kept away from it. Long holds and heavy end-range work cost
 * force for hours afterwards, so putting them before a climb trades the
 * session for the stretch.
 *
 * The second is dose. A daily primer and a training session are different
 * things and were previously the same thing — one routine that was too long
 * to do every day and too light to change anything. Now the primer is six
 * minutes and never hard, and the heavy sessions are unmistakably training.
 * `effort` carries that distinction into XP so the reward follows stimulus
 * rather than attendance.
 *
 * The old climbing primers (Hip Nebula and its long version) are gone: the
 * primer above is explicitly the pre-climbing warm-up now, and the Hip Nebula
 * name belongs to the frogging session it always described better.
 */
export const BUILTIN_ROUTINES: Routine[] = [
  // ── The daily primer ───────────────────────────────────────────────────
  {
    id: 'daily-warp',
    name: 'Daily Warp',
    description:
      'The short daily primer. Keeps the streak, joint health and movement quality — never exhausting. The heavy lifting happens elsewhere.',
    category: 'hybrid',
    timing: 'anytime',
    effort: 'primer',
    guidance:
      'Morning, or as a warm-up before climbing or cycling. This is the one to default to.',
    isCustom: false,
    steps: [
      { exerciseId: 'hip-cars', durationSec: 30 },
      { exerciseId: 'ninety-ninety-liftoff', durationSec: 60 },
      { exerciseId: 'cossack-squat', durationSec: 30 },
      { exerciseId: 'frog-rock-liftoff', durationSec: 60 },
      { exerciseId: 'wall-ankle-rocker', durationSec: 30 },
      { exerciseId: 'glute-bridge-march', durationSec: 60 },
    ],
  },

  // ── End-range strength ─────────────────────────────────────────────────
  // These are the sessions that actually build range. They cost force for a
  // day afterwards, which is why the caution is not decorative.
  {
    id: 'hip-nebula',
    name: 'Hip Nebula',
    description:
      'The heavy session that actually builds usable range. Loaded end-range strength for frogging: abduction, external rotation and adductor length. Expect effort and next-day soreness.',
    category: 'heavy',
    timing: 'away-from-performance',
    effort: 'heavy',
    guidance: 'Two or three times a week, on rest or easy days.',
    caution: 'Never within 24 hours before hard climbing.',
    isCustom: false,
    steps: [
      { exerciseId: 'loaded-frog-pails-rails', durationSec: 130, restSec: 60 },
      { exerciseId: 'cossack-eccentric', durationSec: 45, sets: 4, reps: 8, restSec: 60 },
      { exerciseId: 'copenhagen-adduction', durationSec: 30, sets: 3, reps: 6, restSec: 60 },
      { exerciseId: 'straddle-liftoff', durationSec: 40, sets: 3, reps: 6, restSec: 60 },
      { exerciseId: 'banded-hip-distraction', durationSec: 60 },
      { exerciseId: 'frog-end-range-hold', durationSec: 45, sets: 2, restSec: 60 },
    ],
  },
  {
    id: 'lower-orbit',
    name: 'Lower Orbit',
    description:
      'The broader heavy session: hip flexion for high steps, hip extension for heel hooks, and dorsiflexion. Rotate with Hip Nebula so every position gets loaded.',
    category: 'heavy',
    timing: 'away-from-performance',
    effort: 'heavy',
    guidance: 'Once a week, on a rest day. Rotate it with Hip Nebula.',
    caution: 'Same rule: not within 24 hours before hard climbing.',
    isCustom: false,
    steps: [
      { exerciseId: 'high-step-liftoff', durationSec: 35, sets: 3, reps: 5, restSec: 45 },
      { exerciseId: 'couch-stretch', durationSec: 40, sets: 3, restSec: 45 },
      { exerciseId: 'hamstring-bridge-curl', durationSec: 45, sets: 3, reps: 6, restSec: 60 },
      { exerciseId: 'banded-external-rotation', durationSec: 40, sets: 3, reps: 10, restSec: 45 },
      { exerciseId: 'ankle-rocker-weighted', durationSec: 40, sets: 3, reps: 8, restSec: 45 },
      { exerciseId: 'deep-squat-pry', durationSec: 60, sets: 2, restSec: 60 },
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
      'The slower recovery session: eccentrics for the tissues that tear, long holds for the positions that block you, and the calf and ankle work the heavy sessions skip.',
    category: 'recovery',
    timing: 'away-from-performance',
    guidance:
      'Rest days, or at least four to six hours after climbing. Two or three times a week is plenty.',
    caution:
      'Not before climbing or running. Long holds cost acute force output, which is the whole reason this routine is separate.',
    isCustom: false,
    steps: [
      { exerciseId: 'nordic-hamstring', durationSec: 40, sets: 2, reps: 5 },
      { exerciseId: 'copenhagen-adduction', durationSec: 30, sets: 2, reps: 6 },
      { exerciseId: 'frog-pose', durationSec: 90 },
      { exerciseId: 'couch-stretch', durationSec: 60 },
      { exerciseId: 'seated-ninety-ninety-lift', durationSec: 45 },
      { exerciseId: 'pancake-fold', durationSec: 90 },
      { exerciseId: 'eccentric-heel-drop', durationSec: 60 },
      { exerciseId: 'loaded-dorsiflexion-hold', durationSec: 45 },
    ],
  },
];

export const BUILTIN_ROUTINE_BY_ID: Record<string, Routine> = Object.fromEntries(
  BUILTIN_ROUTINES.map((r) => [r.id, r]),
);
