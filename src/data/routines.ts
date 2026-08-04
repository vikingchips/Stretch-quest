import type { Routine } from '../types';

export const BUILTIN_ROUTINES: Routine[] = [
  // ── Climbing ────────────────────────────────────────────────────────────
  {
    id: 'climb-shoulders-chest',
    name: "Climber's Shoulders & Chest",
    description:
      'Undo the pull-heavy climbing posture: open the chest, free the shoulders and upper back.',
    category: 'climbing',
    isCustom: false,
    steps: [
      { exerciseId: 'wall-chest-opener', durationSec: 30 },
      { exerciseId: 'cross-body-shoulder', durationSec: 30 },
      { exerciseId: 'overhead-triceps', durationSec: 30 },
      { exerciseId: 'eagle-arms', durationSec: 30 },
      { exerciseId: 'thread-the-needle', durationSec: 30 },
      { exerciseId: 'thoracic-wall-extension', durationSec: 40 },
    ],
  },
  {
    id: 'climb-hips',
    name: 'Hips for High Steps',
    description:
      'Hip mobility for high feet, drop knees and rock-overs. Your project will thank you.',
    category: 'climbing',
    isCustom: false,
    steps: [
      { exerciseId: 'deep-squat-hold', durationSec: 45 },
      { exerciseId: 'lizard-lunge', durationSec: 40 },
      { exerciseId: 'pigeon-pose', durationSec: 45 },
      { exerciseId: 'frog-pose', durationSec: 45 },
      { exerciseId: 'ninety-ninety', durationSec: 40 },
    ],
  },
  {
    id: 'climb-forearms-fingers',
    name: 'Forearm & Finger Release',
    description:
      'Post-session antagonist care for pumped forearms and crimped-out fingers.',
    category: 'climbing',
    isCustom: false,
    steps: [
      { exerciseId: 'wrist-flexor-stretch', durationSec: 30 },
      { exerciseId: 'wrist-extensor-stretch', durationSec: 30 },
      { exerciseId: 'prayer-stretch', durationSec: 30 },
      { exerciseId: 'finger-extensor-spread', durationSec: 30 },
      { exerciseId: 'wrist-circles', durationSec: 30 },
    ],
  },

  // ── Running ─────────────────────────────────────────────────────────────
  {
    id: 'run-lower-legs',
    name: "Runner's Lower Legs",
    description:
      'Calves, ankles and feet — the shock absorbers that keep you injury-free on the road.',
    category: 'running',
    isCustom: false,
    steps: [
      { exerciseId: 'straight-leg-calf', durationSec: 30 },
      { exerciseId: 'bent-knee-calf', durationSec: 30 },
      { exerciseId: 'plantar-toe-stretch', durationSec: 30 },
      { exerciseId: 'ankle-circles', durationSec: 30 },
    ],
  },
  {
    id: 'run-hamstrings-hips',
    name: 'Hamstrings & Hip Flexors',
    description:
      'Free up your stride: long hamstrings behind, open hip flexors in front.',
    category: 'running',
    isCustom: false,
    steps: [
      { exerciseId: 'standing-hamstring', durationSec: 30 },
      { exerciseId: 'kneeling-hip-flexor', durationSec: 45 },
      { exerciseId: 'lying-hamstring', durationSec: 45 },
      { exerciseId: 'standing-quad', durationSec: 30 },
    ],
  },
  {
    id: 'run-cooldown',
    name: 'Post-Run Cooldown',
    description:
      'The full lower-body wind-down for after a long run. Ease everything back to neutral.',
    category: 'running',
    isCustom: false,
    steps: [
      { exerciseId: 'standing-quad', durationSec: 30 },
      { exerciseId: 'standing-hamstring', durationSec: 30 },
      { exerciseId: 'straight-leg-calf', durationSec: 30 },
      { exerciseId: 'kneeling-hip-flexor', durationSec: 45 },
      { exerciseId: 'figure-four', durationSec: 40 },
      { exerciseId: 'itband-crossover', durationSec: 30 },
      { exerciseId: 'butterfly', durationSec: 40 },
    ],
  },

  // ── Full body ───────────────────────────────────────────────────────────
  {
    id: 'daily-full-body',
    name: 'Daily Full-Body Flow',
    description:
      'A balanced head-to-toe flow for any day. Perfect for keeping the streak alive.',
    category: 'full-body',
    isCustom: false,
    steps: [
      { exerciseId: 'neck-side-tilt', durationSec: 30 },
      { exerciseId: 'cross-body-shoulder', durationSec: 30 },
      { exerciseId: 'cat-cow', durationSec: 40 },
      { exerciseId: 'childs-pose', durationSec: 40 },
      { exerciseId: 'cobra', durationSec: 30 },
      { exerciseId: 'seated-spinal-twist', durationSec: 30 },
      { exerciseId: 'figure-four', durationSec: 40 },
      { exerciseId: 'standing-hamstring', durationSec: 30 },
      { exerciseId: 'standing-quad', durationSec: 30 },
    ],
  },
];

export const BUILTIN_ROUTINE_BY_ID: Record<string, Routine> = Object.fromEntries(
  BUILTIN_ROUTINES.map((r) => [r.id, r]),
);
