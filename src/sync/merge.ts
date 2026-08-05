import type { FingerData } from '../store/fingerStore';
import { INITIAL_FINGER_DATA } from '../store/fingerStore';
import type { FingerMax } from '../finger/types';
import type { Routine, SessionRecord, UserProgress } from '../types';

/**
 * Merging is additive on purpose: signing in on a second device must never be
 * able to delete history. Nothing here removes a session, a badge or a day —
 * the worst case is that a deleted custom routine comes back, which is
 * recoverable, unlike a lost year of sessions.
 */

/** Union by id. Ties keep the local copy, which is the one just played. */
export function mergeSessions(
  local: SessionRecord[],
  remote: SessionRecord[],
): SessionRecord[] {
  const byId = new Map<string, SessionRecord>();
  for (const s of remote) byId.set(s.id, s);
  for (const s of local) byId.set(s.id, s);
  return [...byId.values()].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

function unionDates(a: string[], b: string[]): string[] {
  return [...new Set([...a, ...b])].sort();
}

/**
 * Scalars take the larger value and sets are unioned. The current streak is
 * the one field that cannot be maxed safely — a stale device could hold a
 * streak the calendar has since broken — so it follows whichever side was
 * active most recently, and `reconcile()` corrects it against today's date on
 * the next app start anyway.
 */
export function mergeProgress(local: UserProgress, remote: UserProgress): UserProgress {
  const localNewer = (local.lastActiveDateKey ?? '') >= (remote.lastActiveDateKey ?? '');
  const fresher = localNewer ? local : remote;
  return {
    xp: Math.max(local.xp, remote.xp),
    streak: fresher.streak,
    longestStreak: Math.max(local.longestStreak, remote.longestStreak),
    lastActiveDateKey: fresher.lastActiveDateKey,
    streakFreezes: Math.max(local.streakFreezes, remote.streakFreezes),
    frozenDateKeys: unionDates(local.frozenDateKeys, remote.frozenDateKeys),
    // Earliest unlock wins — the badge was earned then, not on the device
    // that happened to sync second.
    unlockedBadges: mergeBadges(local.unlockedBadges, remote.unlockedBadges),
    goalMetDateKeys: unionDates(local.goalMetDateKeys, remote.goalMetDateKeys),
  };
}

function mergeBadges(
  local: Record<string, string>,
  remote: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = { ...remote };
  for (const [id, at] of Object.entries(local)) {
    const existing = out[id];
    if (!existing || at < existing) out[id] = at;
  }
  return out;
}

/** Union by id, as with sessions: a test is a record of something that
 *  happened and is never edited afterwards. */
function unionById<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const byId = new Map<string, T>();
  for (const item of remote) byId.set(item.id, item);
  for (const item of local) byId.set(item.id, item);
  return [...byId.values()];
}

/**
 * Maxes key on hand, grip and edge — three different measurements of three
 * different things, never interchangeable. Within a key the newer test wins
 * even when it is lower, because that is what a retest is for.
 */
function mergeMaxes(local: FingerMax[], remote: FingerMax[]): FingerMax[] {
  const byKey = new Map<string, FingerMax>();
  for (const max of [...remote, ...local]) {
    const key = `${max.hand}:${max.grip}:${max.edgeMm}`;
    const existing = byKey.get(key);
    if (!existing || max.testedAt >= existing.testedAt) byKey.set(key, max);
  }
  return [...byKey.values()];
}

export function mergeFinger(
  local: FingerData,
  remote: Partial<FingerData> | null | undefined,
): FingerData {
  const r = { ...INITIAL_FINGER_DATA, ...(remote ?? {}) };
  return {
    // Settings have no timestamps to compare, so the device you are holding
    // wins when it has an answer. The cost of getting this wrong is a
    // re-entered bodyweight, not lost history.
    bodyweightKg: local.bodyweightKg ?? r.bodyweightKg,
    edges: local.edges.length > 0 ? local.edges : r.edges,
    activeEdgeMm: local.activeEdgeMm ?? r.activeEdgeMm,
    retestIntervalDays: local.retestIntervalDays,
    maxes: mergeMaxes(local.maxes, r.maxes),
    tests: unionById(local.tests, r.tests).sort((a, b) => a.testedAt.localeCompare(b.testedAt)),
    sessions: unionById(local.sessions, r.sessions).sort((a, b) =>
      a.startedAt.localeCompare(b.startedAt),
    ),
    lastAbrahangsAt:
      (local.lastAbrahangsAt ?? '') >= (r.lastAbrahangsAt ?? '')
        ? local.lastAbrahangsAt
        : r.lastAbrahangsAt,
  };
}

/** Upsert by id, newest edit wins. Routines without a timestamp lose to ones with. */
export function mergeRoutines(local: Routine[], remote: Routine[]): Routine[] {
  const byId = new Map<string, Routine>();
  for (const r of [...remote, ...local]) {
    const existing = byId.get(r.id);
    if (!existing || (r.createdAt ?? '') >= (existing.createdAt ?? '')) byId.set(r.id, r);
  }
  return [...byId.values()];
}
