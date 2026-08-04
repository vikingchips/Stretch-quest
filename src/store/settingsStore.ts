import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { DailyGoalMinutes, Settings } from '../types';
import { localStorageAdapter, SCHEMA_VERSION, STORAGE_KEYS } from './storage';

interface SettingsState extends Settings {
  setDailyGoal: (minutes: DailyGoalMinutes) => void;
  setRestDuration: (sec: number) => void;
  setPrepDuration: (sec: number) => void;
  setSoundEnabled: (enabled: boolean) => void;
}

export const DEFAULT_SETTINGS: Settings = {
  dailyGoalMinutes: 10,
  restDurationSec: 10,
  prepDurationSec: 5,
  soundEnabled: true,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      setDailyGoal: (dailyGoalMinutes) => set({ dailyGoalMinutes }),
      setRestDuration: (restDurationSec) => set({ restDurationSec }),
      setPrepDuration: (prepDurationSec) => set({ prepDurationSec }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
    }),
    {
      name: STORAGE_KEYS.settings,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => localStorageAdapter),
    },
  ),
);
