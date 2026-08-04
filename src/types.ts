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
  | 'adductors'
  | 'hamstrings'
  | 'quads'
  | 'calves'
  | 'ankles'
  | 'feet'
  | 'core';

/** 'per-side' exercises are performed left then right. */
export type Side = 'both' | 'per-side';

/**
 * What kind of work an exercise actually is. This drives the guidance rules:
 * long static holds belong away from performance, loaded/eccentric work is
 * what builds lasting range, and potentiation only makes sense pre-activity.
 */
export type Modality =
  | 'dynamic'
  | 'static'
  | 'loaded'
  | 'eccentric'
  | 'activation'
  | 'potentiation';

/**
 * Timed work counts seconds; rep work is self-paced — the timer waits for you
 * rather than rushing an eccentric.
 */
export type ExerciseMode = 'timed' | 'reps';

export interface Exercise {
  id: string;
  name: string;
  instructions: string;
  /** Also drives the body diagram — the first areas listed are highlighted. */
  targetAreas: BodyArea[];
  modality: Modality;
  /** 'timed' when omitted. */
  mode?: ExerciseMode;
  /** Seconds per side when side === 'per-side'. Estimated pace for rep work. */
  defaultDurationSec: number;
  /** Default reps per set for rep-based work. */
  defaultReps?: number;
  side: Side;
  /** Why this is in the routine — the one-line rationale from the protocol. */
  purpose?: string;
  tips?: string;
}

/**
 * 'full-body' is legacy: no built-in routine uses it any more, but historical
 * session records do, so it stays in the union for them to deserialize into.
 */
export type RoutineCategory =
  | 'climbing'
  | 'running'
  | 'hybrid'
  | 'recovery'
  | 'custom'
  | 'full-body';

/**
 * When a routine is meant to be run. Static/loaded end-range work costs acute
 * force output, so it is kept away from performance rather than banned.
 */
export type RoutineTiming = 'pre-activity' | 'anytime' | 'away-from-performance';

export interface RoutineStep {
  exerciseId: string;
  /** Seconds per side when the exercise is per-side. */
  durationSec: number;
  /** Defaults to 1. */
  sets?: number;
  /** Reps per set; only meaningful for rep-based exercises. */
  reps?: number;
}

export interface Routine {
  id: string;
  name: string;
  description: string;
  category: RoutineCategory;
  timing?: RoutineTiming;
  /** When to run it, in a sentence. Shown before you start. */
  guidance?: string;
  /** A hard "don't" for this routine, if it has one. */
  caution?: string;
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
