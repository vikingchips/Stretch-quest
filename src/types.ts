import type { IconName } from './components/Icon';

export type BodyArea =
  | 'neck'
  | 'shoulders'
  | 'chest'
  | 'back'
  | 'arms'
  | 'wrists'
  | 'fingers'
  | 'hips'
  | 'glutes'
  | 'hamstrings'
  | 'quads'
  | 'calves'
  | 'ankles'
  | 'feet'
  | 'core';

/** 'per-side' exercises are performed left then right. */
export type Side = 'both' | 'per-side';

export interface Exercise {
  id: string;
  name: string;
  instructions: string;
  /** Also drives the body diagram — the first areas listed are highlighted. */
  targetAreas: BodyArea[];
  /** Seconds per side when side === 'per-side'. */
  defaultDurationSec: number;
  side: Side;
  tips?: string;
}

export type RoutineCategory = 'climbing' | 'running' | 'full-body' | 'custom';

export interface RoutineStep {
  exerciseId: string;
  /** Seconds per side when the exercise is per-side. */
  durationSec: number;
}

export interface Routine {
  id: string;
  name: string;
  description: string;
  category: RoutineCategory;
  steps: RoutineStep[];
  isCustom: boolean;
  createdAt?: string;
}

export interface SessionRecord {
  id: string;
  routineId: string;
  /** Denormalized: custom routines can be deleted after the fact. */
  routineName: string;
  category: RoutineCategory;
  startedAt: string;
  /** Local calendar day 'YYYY-MM-DD' — source of truth for streaks and goals. */
  dateKey: string;
  /** Actual stretch time in seconds (excludes prep/rest/switch/paused). */
  activeSec: number;
  stepsCompleted: number;
  stepsTotal: number;
  xpEarned: number;
}

export interface UserProgress {
  /** Lifetime XP. Level is always derived, never stored. */
  xp: number;
  streak: number;
  longestStreak: number;
  lastActiveDateKey: string | null;
  streakFreezes: number;
  /** Days that were saved by a streak freeze (shown as frozen in the heatmap). */
  frozenDateKeys: string[];
  /** achievementId -> unlockedAt ISO timestamp */
  unlockedBadges: Record<string, string>;
  /** Days on which the daily goal was met. */
  goalMetDateKeys: string[];
}

export type DailyGoalMinutes = 5 | 10 | 15 | 20;

export interface Settings {
  dailyGoalMinutes: DailyGoalMinutes;
  restDurationSec: number;
  prepDurationSec: number;
  soundEnabled: boolean;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: IconName;
}

/** Summary passed from the session player to the completion screen. */
export interface SessionSummary {
  record: SessionRecord;
  xpBreakdown: XpBreakdown;
  levelBefore: number;
  levelAfter: number;
  streakBefore: number;
  streakAfter: number;
  goalMetNow: boolean;
  newBadgeIds: string[];
}

export interface XpBreakdown {
  base: number;
  activeTime: number;
  noSkipBonus: number;
  goalBonus: number;
  streakMilestoneBonus: number;
  total: number;
}
