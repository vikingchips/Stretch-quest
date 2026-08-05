import type { Routine, SessionRecord, UserProgress } from '../types';
import { useProgressStore } from '../store/progressStore';
import { useRoutinesStore } from '../store/routinesStore';
import { fingerData, useFingerStore, type FingerData } from '../store/fingerStore';
import { getSupabase, syncConfigured } from './client';
import { useAuthStore } from './authStore';
import { mergeFinger, mergeProgress, mergeRoutines, mergeSessions } from './merge';
import { recomputeProgress } from '../game/recompute';
import { todayKey } from '../game/dates';
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

/**
 * The `finger` column arrived after the first release, so a deployed build can
 * meet a project whose schema.sql has not been re-run yet.
 *
 * Postgres answers an unknown column with 42703. Without this, that error
 * would come back on every read and every write and take the whole sync down
 * with it — stretch sessions and streaks included, for a column none of them
 * need. Falling back keeps everything except finger data working, and the
 * moment the column exists it is picked up with no further change.
 */
export function isMissingColumn(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const message = error.message ?? '';
  // Both halves matter. The code alone would also match some *other* column
  // having gone missing, which is a real problem and must keep surfacing
  // rather than being retried away.
  return /finger/i.test(message) && (error.code === '42703' || /does not exist/i.test(message));
}

const BASE_COLUMNS = 'progress, sessions, routines';

async function pull(userId: string): Promise<RemoteRow | null> {
  const pending = getSupabase();
  if (!pending) return null;
  const supabase = await pending;
  const read = (columns: string) =>
    supabase.from('user_state').select(columns).eq('user_id', userId).maybeSingle();

  let { data, error } = await read(`${BASE_COLUMNS}, finger`);
  if (isMissingColumn(error)) {
    fingerColumnMissing = true;
    ({ data, error } = await read(BASE_COLUMNS));
  }
  if (error) throw error;
  return (data as RemoteRow | null) ?? null;
}

/** Set once a project is seen to be missing the column, so later pushes skip
 *  it rather than failing and retrying forever. */
let fingerColumnMissing = false;

async function push(userId: string): Promise<void> {
  const pending = getSupabase();
  if (!pending) return;
  const supabase = await pending;
  const progressStore = useProgressStore.getState();
  const base = {
    user_id: userId,
    progress: progressStore.progress,
    sessions: progressStore.sessions,
    routines: useRoutinesStore.getState().customRoutines,
    updated_at: new Date().toISOString(),
  };
  const row = fingerColumnMissing
    ? base
    : { ...base, finger: fingerData(useFingerStore.getState()) };

  let { error } = await supabase.from('user_state').upsert(row, { onConflict: 'user_id' });
  if (isMissingColumn(error)) {
    fingerColumnMissing = true;
    ({ error } = await supabase.from('user_state').upsert(base, { onConflict: 'user_id' }));
  }
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
      const progress = mergeProgress(progressStore.progress, remote.progress);
      // Tombstones are merged first, so a session deleted on any device stays
      // deleted here rather than being handed back by the union.
      const sessions = mergeSessions(
        progressStore.sessions,
        remote.sessions ?? [],
        progress.deletedSessionIds ?? [],
      );
      useProgressStore.setState({
        // Streak, XP and the met-goal days are claims about this list, so
        // they are rebuilt from it rather than merged field by field —
        // otherwise a deletion would be undone by the larger remote value.
        progress: { ...progress, ...recomputeProgress(progress, sessions, todayKey()) },
        sessions,
      });
      useRoutinesStore.setState({
        customRoutines: mergeRoutines(
          useRoutinesStore.getState().customRoutines,
          remote.routines ?? [],
        ),
      });
      useFingerStore.setState(
        mergeFinger(
          fingerData(useFingerStore.getState()),
          remote.finger,
          progress.deletedSessionIds ?? [],
        ),
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
