import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Routine } from '../types';
import { BUILTIN_ROUTINE_BY_ID } from '../data/routines';
import { localStorageAdapter, SCHEMA_VERSION, STORAGE_KEYS } from './storage';

interface RoutinesState {
  customRoutines: Routine[];
  saveRoutine: (routine: Routine) => void;
  deleteRoutine: (id: string) => void;
  getRoutine: (id: string) => Routine | undefined;
}

export const useRoutinesStore = create<RoutinesState>()(
  persist(
    (set, get) => ({
      customRoutines: [],
      saveRoutine: (routine) =>
        set((state) => {
          const existing = state.customRoutines.findIndex((r) => r.id === routine.id);
          const next = [...state.customRoutines];
          if (existing >= 0) next[existing] = routine;
          else next.push(routine);
          return { customRoutines: next };
        }),
      deleteRoutine: (id) =>
        set((state) => ({
          customRoutines: state.customRoutines.filter((r) => r.id !== id),
        })),
      getRoutine: (id) => BUILTIN_ROUTINE_BY_ID[id] ?? get().customRoutines.find((r) => r.id === id),
    }),
    {
      name: STORAGE_KEYS.routines,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => localStorageAdapter),
      partialize: (state) => ({ customRoutines: state.customRoutines }),
    },
  ),
);
