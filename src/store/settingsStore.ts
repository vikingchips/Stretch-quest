import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Settings } from '../types';
import { localStorageAdapter, SCHEMA_VERSION, STORAGE_KEYS } from './storage';

interface SettingsState extends Settings {
  /** Shown once, on the first launch. */
  onboardingSeen: boolean;
  dismissOnboarding: () => void;
  setRestDuration: (sec: number) => void;
  setPrepDuration: (sec: number) => void;
  setSoundEnabled: (enabled: boolean) => void;
}

export const DEFAULT_SETTINGS: Settings = {
  restDurationSec: 10,
  prepDurationSec: 5,
  soundEnabled: true,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      onboardingSeen: false,
      dismissOnboarding: () => set({ onboardingSeen: true }),
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
