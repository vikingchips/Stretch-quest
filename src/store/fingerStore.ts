import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { RETEST_DEFAULT_DAYS } from '../finger/constants';
import { findMax } from '../finger/maxTest';
import type {
  FingerMax,
  FingerSessionRecord,
  FingerTestRecord,
  Grip,
  Hand,
} from '../finger/types';
import { daysBetween, todayKey } from '../game/dates';
import { localStorageAdapter, SCHEMA_VERSION, STORAGE_KEYS } from './storage';

const MAX_SESSIONS = 500;
const MAX_TESTS = 200;

/**
 * Everything the finger module owns, as plain data.
 *
 * Split out from the actions so sync has one shape to merge and one shape to
 * push, rather than picking fields out of a store definition.
 */
export interface FingerData {
  /** Needed for grade estimates, which are all percentages of it. */
  bodyweightKg: number | null;
  /** Measured edge depths on the hangboard, in millimetres. */
  edges: number[];
  activeEdgeMm: number | null;
  retestIntervalDays: number;
  maxes: FingerMax[];
  tests: FingerTestRecord[];
  sessions: FingerSessionRecord[];
  /** For the six-hour spacing hint between the two daily Abrahangs. */
  lastAbrahangsAt: string | null;
}

export const INITIAL_FINGER_DATA: FingerData = {
  bodyweightKg: null,
  edges: [],
  activeEdgeMm: null,
  retestIntervalDays: RETEST_DEFAULT_DAYS,
  maxes: [],
  tests: [],
  sessions: [],
  lastAbrahangsAt: null,
};

interface FingerState extends FingerData {
  setBodyweight: (kg: number | null) => void;
  setEdges: (edges: number[]) => void;
  setActiveEdge: (mm: number | null) => void;
  setRetestInterval: (days: number) => void;
  recordTest: (tests: FingerTestRecord[], maxes: FingerMax[]) => void;
  recordSession: (session: FingerSessionRecord) => void;
  currentMax: (hand: Hand, grip: Grip) => FingerMax | undefined;
  /** Days since the newest half-crimp test, or null if there has never been one. */
  daysSinceTest: () => number | null;
  retestDue: () => boolean;
  resetFinger: () => void;
}

export const useFingerStore = create<FingerState>()(
  persist(
    (set, get) => ({
      ...INITIAL_FINGER_DATA,

      setBodyweight: (bodyweightKg) => set({ bodyweightKg }),
      setEdges: (edges) => {
        const sorted = [...new Set(edges)].sort((a, b) => a - b);
        const { activeEdgeMm } = get();
        set({
          edges: sorted,
          // Removing the active edge must not leave a dangling reference that
          // silently stops every band from resolving.
          activeEdgeMm:
            activeEdgeMm !== null && sorted.includes(activeEdgeMm)
              ? activeEdgeMm
              : (sorted[0] ?? null),
        });
      },
      setActiveEdge: (activeEdgeMm) => set({ activeEdgeMm }),
      setRetestInterval: (retestIntervalDays) => set({ retestIntervalDays }),

      recordTest: (tests, maxes) =>
        set((state) => ({
          tests: [...state.tests, ...tests].slice(-MAX_TESTS),
          maxes,
        })),

      recordSession: (session) =>
        set((state) => ({
          sessions: [...state.sessions, session].slice(-MAX_SESSIONS),
          lastAbrahangsAt:
            session.programId === 'abrahangs' ? session.startedAt : state.lastAbrahangsAt,
        })),

      currentMax: (hand, grip) => findMax(get().maxes, hand, grip, get().activeEdgeMm),

      daysSinceTest: () => {
        const halfCrimp = get().tests.filter((t) => t.grip === 'half-crimp');
        if (halfCrimp.length === 0) return null;
        const newest = halfCrimp.reduce((a, b) => (a.dateKey > b.dateKey ? a : b));
        return daysBetween(newest.dateKey, todayKey());
      },

      retestDue: () => {
        const days = get().daysSinceTest();
        return days !== null && days >= get().retestIntervalDays;
      },

      resetFinger: () => set({ ...INITIAL_FINGER_DATA }),
    }),
    {
      name: STORAGE_KEYS.finger,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => localStorageAdapter),
    },
  ),
);

/** The synced subset, with the actions stripped off. */
export function fingerData(state: FingerState | FingerData): FingerData {
  return {
    bodyweightKg: state.bodyweightKg,
    edges: state.edges,
    activeEdgeMm: state.activeEdgeMm,
    retestIntervalDays: state.retestIntervalDays,
    maxes: state.maxes,
    tests: state.tests,
    sessions: state.sessions,
    lastAbrahangsAt: state.lastAbrahangsAt,
  };
}
