import type { Achievement } from '../types';

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-stretch',
    name: 'First Steps',
    description: 'Complete your first session',
    emoji: '🌱',
  },
  {
    id: 'ten-sessions',
    name: 'Getting Bendy',
    description: 'Complete 10 sessions',
    emoji: '🙆',
  },
  {
    id: 'fifty-sessions',
    name: 'Dedicated',
    description: 'Complete 50 sessions',
    emoji: '💪',
  },
  {
    id: 'hundred-sessions',
    name: 'Century Club',
    description: 'Complete 100 sessions',
    emoji: '🏆',
  },
  {
    id: 'week-streak',
    name: 'Week Warrior',
    description: 'Reach a 7-day streak',
    emoji: '🔥',
  },
  {
    id: 'month-streak',
    name: 'Monthly Master',
    description: 'Reach a 30-day streak',
    emoji: '🌋',
  },
  {
    id: 'freeze-used',
    name: 'Saved by the Freeze',
    description: 'Have a streak freeze rescue your streak',
    emoji: '❄️',
  },
  {
    id: 'early-bird',
    name: 'Early Bird',
    description: 'Start a session before 8 AM',
    emoji: '🌅',
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    description: 'Start a session after 9 PM',
    emoji: '🦉',
  },
  {
    id: 'crimp-saver',
    name: 'Crimp Saver',
    description: 'Complete 10 climbing sessions',
    emoji: '🧗',
  },
  {
    id: 'road-runner',
    name: 'Road Runner',
    description: 'Complete 10 running sessions',
    emoji: '🏃',
  },
  {
    id: 'architect',
    name: 'Routine Architect',
    description: 'Save your first custom routine',
    emoji: '📐',
  },
  {
    id: 'all-rounder',
    name: 'All-Rounder',
    description: 'Do climbing, running and full-body sessions',
    emoji: '🌈',
  },
  {
    id: 'perfect-week',
    name: 'Perfect Week',
    description: 'Meet your daily goal 7 days in a row',
    emoji: '💎',
  },
];

export const ACHIEVEMENT_BY_ID: Record<string, Achievement> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
);
