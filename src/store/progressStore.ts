import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  Routine,
  SessionRecord,
  SessionSummary,
  UserProgress,
} from '../types';
import { todayKey } from '../game/dates';
import { addDays } from '../game/dates';
import { computeXp, sessionQualifies } from '../game/xp';
import { levelForXp } from '../game/levels';
import { countActiveDay, evaluateStreak, STARTING_FREEZES } from '../game/streak';
import { sessionsOnDay } from '../game/dailyGoal';
import { checkAchievements } from '../game/achievementEngine';
import { localStorageAdapter, SCHEMA_VERSION, STORAGE_KEYS } from './storage';
import { useRoutinesStore } from './routinesStore';

const MAX_SESSIONS = 1000;
const MAX_GOAL_DAYS = 60;

export const INITIAL_PROGRESS: UserProgress = {
  xp: 0,
  streak: 0,
  longestStreak: 0,
  lastActiveDateKey: null,
  streakFreezes: STARTING_FREEZES,
  frozenDateKeys: [],
  unlockedBadges: {},
  goalMetDateKeys: [],
};

export interface CompleteSessionInput {
  routine: Routine;
  startedAt: string;
  activeSec: number;
  stepsCompleted: number;
  stepsTotal: number;
}

interface ProgressState {
  progress: UserProgress;
  sessions: SessionRecord[];
  /** Set when a launch-time reconcile consumed a freeze; Home shows a toast. */
  freezeToast: boolean;
  /** Set when the streak was lost since last launch; Home shows a notice. */
  streakLostToast: boolean;
  dismissToasts: () => void;
  /** Reconcile streak with the calendar. Call on app launch. */
  reconcile: () => void;
  completeSession: (input: CompleteSessionInput) => SessionSummary;
  /** Direct unlock for non-session achievements (e.g. saving a custom routine). */
  unlockBadge: (id: string) => void;
  resetAll: () => void;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      progress: INITIAL_PROGRESS,
      sessions: [],
      freezeToast: false,
      streakLostToast: false,

      dismissToasts: () => set({ freezeToast: false, streakLostToast: false }),

      reconcile: () => {
        const today = todayKey();
        const { progress } = get();
        const evaluated = evaluateStreak(progress, today);
        if (evaluated.newlyFrozenDateKeys.length === 0 && !evaluated.streakLost) {
          return;
        }
        const next: UserProgress = {
          ...progress,
          streak: evaluated.streak,
          streakFreezes: evaluated.streakFreezes,
          frozenDateKeys: [
            ...progress.frozenDateKeys,
            ...evaluated.newlyFrozenDateKeys,
          ],
          // Frozen days cover the gap up to yesterday; a lost streak starts over.
          lastActiveDateKey: evaluated.streakLost ? null : addDays(today, -1),
        };
        if (evaluated.newlyFrozenDateKeys.length > 0 && !next.unlockedBadges['freeze-used']) {
          next.unlockedBadges = {
            ...next.unlockedBadges,
            'freeze-used': new Date().toISOString(),
          };
        }
        set({
          progress: next,
          freezeToast: evaluated.newlyFrozenDateKeys.length > 0,
          streakLostToast: evaluated.streakLost,
        });
      },

      completeSession: (input) => {
        const now = new Date();
        const today = todayKey();
        const state = get();
        const hasCustomRoutine = useRoutinesStore.getState().customRoutines.length > 0;

        const progress = state.progress;
        const qualifies = sessionQualifies(input.activeSec);

        // 1. Reconcile the stored streak with the calendar.
        const evaluated = evaluateStreak(progress, today);
        const freezeConsumed = evaluated.newlyFrozenDateKeys.length > 0;
        let lastActiveDateKey = progress.lastActiveDateKey;
        if (freezeConsumed) lastActiveDateKey = addDays(today, -1);
        if (evaluated.streakLost) lastActiveDateKey = null;

        // 2. Count today as an active day when the session qualifies.
        const streakBefore = evaluated.streak;
        const counted = qualifies
          ? countActiveDay(evaluated, lastActiveDateKey, today)
          : { streak: evaluated.streak, streakFreezes: evaluated.streakFreezes, extended: false };

        // 3. Daily goal: one session a day. Met the moment this one lands.
        const metBefore = sessionsOnDay(state.sessions, today) > 0;
        const metNow = qualifies || metBefore;
        const firstTimeGoalMet = !metBefore && metNow;

        // 4. XP.
        const xpBreakdown = computeXp({
          activeSec: input.activeSec,
          stepsCompleted: input.stepsCompleted,
          stepsTotal: input.stepsTotal,
          firstSessionOfDay: firstTimeGoalMet,
          streakBefore,
          streakAfter: counted.streak,
        });

        // 5. Build and store the record.
        const record: SessionRecord = {
          id: crypto.randomUUID(),
          routineId: input.routine.id,
          routineName: input.routine.name,
          category: input.routine.category,
          startedAt: input.startedAt,
          dateKey: today,
          activeSec: input.activeSec,
          stepsCompleted: input.stepsCompleted,
          stepsTotal: input.stepsTotal,
          xpEarned: xpBreakdown.total,
        };
        const sessions = [...state.sessions, record].slice(-MAX_SESSIONS);

        // 6. Assemble updated progress.
        let goalMetDateKeys = progress.goalMetDateKeys;
        if (metNow && !goalMetDateKeys.includes(today)) {
          goalMetDateKeys = [...goalMetDateKeys, today].slice(-MAX_GOAL_DAYS);
        }
        const nextProgress: UserProgress = {
          ...progress,
          xp: progress.xp + xpBreakdown.total,
          streak: counted.streak,
          longestStreak: Math.max(progress.longestStreak, counted.streak),
          lastActiveDateKey: qualifies ? today : lastActiveDateKey,
          streakFreezes: counted.streakFreezes,
          frozenDateKeys: [...progress.frozenDateKeys, ...evaluated.newlyFrozenDateKeys],
          goalMetDateKeys,
        };

        // 7. Achievements.
        const newBadgeIds = checkAchievements({
          progress: nextProgress,
          sessions,
          newSession: record,
          freezeConsumed,
          hasCustomRoutine,
        });
        if (newBadgeIds.length > 0) {
          const stamped = { ...nextProgress.unlockedBadges };
          const at = now.toISOString();
          for (const id of newBadgeIds) stamped[id] = at;
          nextProgress.unlockedBadges = stamped;
        }

        set({ progress: nextProgress, sessions, freezeToast: false });

        return {
          record,
          xpBreakdown,
          levelBefore: levelForXp(progress.xp),
          levelAfter: levelForXp(nextProgress.xp),
          streakBefore: progress.streak,
          streakAfter: counted.streak,
          goalMetNow: metNow,
          newBadgeIds,
        };
      },

      unlockBadge: (id) => {
        const { progress } = get();
        if (progress.unlockedBadges[id]) return;
        set({
          progress: {
            ...progress,
            unlockedBadges: {
              ...progress.unlockedBadges,
              [id]: new Date().toISOString(),
            },
          },
        });
      },

      resetAll: () =>
        set({
          progress: INITIAL_PROGRESS,
          sessions: [],
          freezeToast: false,
          streakLostToast: false,
        }),
    }),
    {
      name: STORAGE_KEYS.progress,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => localStorageAdapter),
      partialize: (state) => ({ progress: state.progress, sessions: state.sessions }),
    },
  ),
);
