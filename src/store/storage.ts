import type { StateStorage } from 'zustand/middleware';

/**
 * Storage adapter used by every store. Keeping the interface tiny means a
 * future cloud-sync backend only needs to implement these three methods.
 */
export interface StorageAdapter extends StateStorage {
  getItem(name: string): string | null;
  setItem(name: string, value: string): void;
  removeItem(name: string): void;
}

/** localStorage-backed adapter that never throws and drops corrupt entries. */
export const localStorageAdapter: StorageAdapter = {
  getItem(name) {
    try {
      const raw = localStorage.getItem(name);
      if (raw === null) return null;
      JSON.parse(raw); // validate; zustand parses again downstream
      return raw;
    } catch {
      try {
        localStorage.removeItem(name);
      } catch {
        /* storage unavailable */
      }
      return null;
    }
  },
  setItem(name, value) {
    try {
      localStorage.setItem(name, value);
    } catch {
      /* quota exceeded or storage unavailable — data stays in memory */
    }
  },
  removeItem(name) {
    try {
      localStorage.removeItem(name);
    } catch {
      /* storage unavailable */
    }
  },
};

export const STORAGE_KEYS = {
  settings: 'sq:settings',
  progress: 'sq:progress',
  routines: 'sq:customRoutines',
} as const;

/** Bump per-store `version` in the persist options and migrate there. */
export const SCHEMA_VERSION = 1;
