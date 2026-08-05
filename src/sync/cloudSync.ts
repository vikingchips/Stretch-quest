import type { Routine, SessionRecord, UserProgress } from '../types';
import { useProgressStore } from '../store/progressStore';
import { useRoutinesStore } from '../store/routinesStore';
import { fingerData, useFingerStore, type FingerData } from '../store/fingerStore';
import { getSupabase, syncConfigured } from './client';
import { useAuthStore } from './authStore';
import { mergeFinger, mergeProgress, mergeRoutines, mergeSessions } from './merge';
import { publishProfile } from './friends';
import { nameToSlug } from './identity';

export type SyncState = 'idle' | 'syncing' | 'synced' | 'error';

export interface SyncSnapshot {
  state: SyncState;
  error: string | null;
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let unsubscribe: (() => void) | null = null;
const listeners = new Set<() => void>();

// useSyncExternalStore compares snapshots by identity, so this object is
// replaced only when something actually changed. Returning a fresh object on
// every read would re-render forever.
let snapshot: SyncSnapshot = { state: 'idle', error: null };

export function syncState(): SyncSnapshot {
  return snapshot;
}

export function onSyncChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function setState(next: SyncState, error: string | null = null) {
  if (snapshot.state === next && snapshot.error === error) return;
  snapshot = { state: next, error };
  for (const fn of listeners) fn();
}

interface RemoteRow {
  progress: UserProgress;
  sessions: SessionRecord[];
  routines: Routine[];
  /** Absent on rows written before the finger module existed. */
  finger: Partial<FingerData> | null;
}

async function pull(userId: string): Promise<RemoteRow | null> {
  const pending = getSupabase();
  if (!pending) return null;
  const supabase = await pending;
  const { data, error } = await supabase
    .from('user_state')
    .select('progress, sessions, routines, finger')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data as RemoteRow | null) ?? null;
}

async function push(userId: string): Promise<void> {
  const pending = getSupabase();
  if (!pending) return;
  const supabase = await pending;
  const progressStore = useProgressStore.getState();
  const { error } = await supabase.from('user_state').upsert(
    {
      user_id: userId,
      progress: progressStore.progress,
      sessions: progressStore.sessions,
      routines: useRoutinesStore.getState().customRoutines,
      finger: fingerData(useFingerStore.getState()),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (error) throw error;

  // The friends-visible summary rides along with every push, so a streak on
  // someone else's screen is never more stale than your own sync.
  const displayName = useAuthStore.getState().displayName;
  if (displayName) {
    await publishProfile({
      userId,
      slug: nameToSlug(displayName),
      displayName,
      progress: progressStore.progress,
      sessions: progressStore.sessions,
    });
  }
}

/**
 * Pull, merge into local, push the merged result back. Runs on sign-in and on
 * app start while signed in.
 *
 * The merge is additive (see merge.ts), so this is safe to run repeatedly and
 * from several devices — the failure mode is a duplicate write, never a lost
 * session.
 */
export async function syncNow(): Promise<void> {
  const { userId, status } = useAuthStore.getState();
  if (!syncConfigured || status !== 'signed-in' || !userId) return;

  setState('syncing');
  try {
    const remote = await pull(userId);
    if (remote) {
      const progressStore = useProgressStore.getState();
      useProgressStore.setState({
        progress: mergeProgress(progressStore.progress, remote.progress),
        sessions: mergeSessions(progressStore.sessions, remote.sessions ?? []),
      });
      useRoutinesStore.setState({
        customRoutines: mergeRoutines(
          useRoutinesStore.getState().customRoutines,
          remote.routines ?? [],
        ),
      });
      useFingerStore.setState(
        mergeFinger(fingerData(useFingerStore.getState()), remote.finger),
      );
      // A merged streak can disagree with the calendar; reconcile fixes that.
      useProgressStore.getState().reconcile();
    }
    await push(userId);
    setState('synced');
  } catch (error) {
    setState('error', error instanceof Error ? error.message : 'Sync failed');
  }
}

/** Coalesce bursts of writes — finishing a session touches several stores. */
function schedulePush() {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    void (async () => {
      const { userId, status } = useAuthStore.getState();
      if (status !== 'signed-in' || !userId) return;
      setState('syncing');
      try {
        await push(userId);
        setState('synced');
      } catch (error) {
        setState('error', error instanceof Error ? error.message : 'Sync failed');
      }
    })();
  }, 2000);
}

/**
 * Start syncing when signed in, stop when signed out. Local storage keeps
 * working either way — the cloud is a copy, not the source of truth.
 */
export function initCloudSync(): void {
  if (!syncConfigured) return;

  useAuthStore.subscribe((auth, previous) => {
    if (auth.status === 'signed-in' && previous.status !== 'signed-in') {
      void syncNow();
      if (!unsubscribe) {
        const offProgress = useProgressStore.subscribe(schedulePush);
        const offRoutines = useRoutinesStore.subscribe(schedulePush);
        const offFinger = useFingerStore.subscribe(schedulePush);
        unsubscribe = () => {
          offProgress();
          offRoutines();
          offFinger();
        };
      }
    }
    if (auth.status !== 'signed-in' && previous.status === 'signed-in') {
      unsubscribe?.();
      unsubscribe = null;
      if (pushTimer) clearTimeout(pushTimer);
      setState('idle');
    }
  });
}
