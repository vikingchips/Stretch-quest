import type { Achievement } from '../types';

/**
 * Emblems are abstract on purpose — a shared vocabulary of dots, rings, arcs
 * and polygons that grows in complexity with the achievement, rather than a
 * pictogram per badge.
 */
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-stretch',
    name: 'First Steps',
    description: 'Complete your first session',
    icon: 'dot',
  },
  {
    id: 'ten-sessions',
    name: 'Getting Bendy',
    description: 'Complete 10 sessions',
    icon: 'ring',
  },
  {
    id: 'fifty-sessions',
    name: 'Dedicated',
    description: 'Complete 50 sessions',
    icon: 'ringDouble',
  },
  {
    id: 'hundred-sessions',
    name: 'Century Club',
    description: 'Complete 100 sessions',
    icon: 'ringTriple',
  },
  {
    id: 'week-streak',
    name: 'Week Warrior',
    description: 'Reach a 7-day streak',
    icon: 'dotRow',
  },
  {
    id: 'month-streak',
    name: 'Monthly Master',
    description: 'Reach a 30-day streak',
    icon: 'arcs',
  },
  {
    id: 'freeze-used',
    name: 'Saved by the Freeze',
    description: 'Have a streak freeze rescue your streak',
    icon: 'asterisk',
  },
  {
    id: 'early-bird',
    name: 'Early Bird',
    description: 'Start a session before 8 AM',
    icon: 'sunrise',
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    description: 'Start a session after 9 PM',
    icon: 'crescent',
  },
  {
    id: 'crimp-saver',
    name: 'Crimp Saver',
    description: 'Complete 10 climbing sessions',
    icon: 'zigzag',
  },
  {
    id: 'road-runner',
    name: 'Road Runner',
    description: 'Complete 10 running sessions',
    icon: 'chevrons',
  },
  {
    id: 'architect',
    name: 'Routine Architect',
    description: 'Save your first custom routine',
    icon: 'grid',
  },
  {
    id: 'all-rounder',
    name: 'All-Rounder',
    description: 'Do climbing, running and full-body sessions',
    icon: 'venn',
  },
  {
    id: 'perfect-week',
    name: 'Perfect Week',
    description: 'Meet your daily goal 7 days in a row',
    icon: 'diamond',
  },
];

export const ACHIEVEMENT_BY_ID: Record<string, Achievement> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
);
