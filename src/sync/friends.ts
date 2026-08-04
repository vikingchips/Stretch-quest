import type { SessionRecord, UserProgress } from '../types';
import { weekMarks } from '../game/dailyGoal';
import { todayKey } from '../game/dates';
import { getSupabase } from './client';

export interface FriendProfile {
  userId: string;
  slug: string;
  displayName: string;
  streak: number;
  longestStreak: number;
  xp: number;
  lastActive: string | null;
  /** Seven characters, Monday first, '1' for a day with a session. */
  weekPattern: string;
}

export interface PendingRequest {
  id: string;
  userId: string;
  displayName: string;
  direction: 'incoming' | 'outgoing';
}

interface ProfileRow {
  user_id: string;
  slug: string;
  display_name: string;
  streak: number;
  longest_streak: number;
  xp: number;
  last_active: string | null;
  week_pattern: string;
}

function toProfile(row: ProfileRow): FriendProfile {
  return {
    userId: row.user_id,
    slug: row.slug,
    displayName: row.display_name,
    streak: row.streak,
    longestStreak: row.longest_streak,
    xp: row.xp,
    lastActive: row.last_active,
    weekPattern: row.week_pattern,
  };
}

/** Monday-first week as seven '1'/'0' characters. */
export function weekPattern(sessions: SessionRecord[], frozenDateKeys: string[]): string {
  return weekMarks(sessions, frozenDateKeys, todayKey())
    .map((m) => (m.done ? '1' : '0'))
    .join('');
}

/**
 * Publish the handful of fields friends are allowed to see. Called on every
 * sync. Everything else stays in `user_state`, which no one else can read.
 */
export async function publishProfile(input: {
  userId: string;
  slug: string;
  displayName: string;
  progress: UserProgress;
  sessions: SessionRecord[];
}): Promise<void> {
  const pending = getSupabase();
  if (!pending) return;
  const supabase = await pending;
  const { error } = await supabase.from('profiles').upsert(
    {
      user_id: input.userId,
      slug: input.slug,
      display_name: input.displayName,
      streak: input.progress.streak,
      longest_streak: input.progress.longestStreak,
      xp: input.progress.xp,
      last_active: input.progress.lastActiveDateKey,
      week_pattern: weekPattern(input.sessions, input.progress.frozenDateKeys),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (error) throw error;
}

export async function listFriends(userId: string): Promise<FriendProfile[]> {
  const pending = getSupabase();
  if (!pending) return [];
  const supabase = await pending;

  const { data: links, error: linkError } = await supabase
    .from('friendships')
    .select('user_a, user_b');
  if (linkError) throw linkError;

  const ids = (links ?? [])
    .map((l) => (l.user_a === userId ? l.user_b : l.user_a))
    .filter((id): id is string => Boolean(id));
  if (ids.length === 0) return [];

  const { data, error } = await supabase.from('profiles').select('*').in('user_id', ids);
  if (error) throw error;
  return ((data ?? []) as ProfileRow[]).map(toProfile);
}

export async function listRequests(userId: string): Promise<PendingRequest[]> {
  const pending = getSupabase();
  if (!pending) return [];
  const supabase = await pending;

  const { data, error } = await supabase
    .from('friend_requests')
    .select('id, from_user, to_user');
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return [];

  const others = rows.map((r) => (r.from_user === userId ? r.to_user : r.from_user));
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, display_name')
    .in('user_id', others);
  const nameOf = new Map((profiles ?? []).map((p) => [p.user_id, p.display_name as string]));

  return rows.map((r) => {
    const incoming = r.to_user === userId;
    const other = incoming ? r.from_user : r.to_user;
    return {
      id: r.id as string,
      userId: other as string,
      displayName: nameOf.get(other) ?? 'someone',
      direction: incoming ? ('incoming' as const) : ('outgoing' as const),
    };
  });
}

export async function findBySlug(
  slug: string,
): Promise<{ userId: string; displayName: string } | null> {
  const pending = getSupabase();
  if (!pending) return null;
  const supabase = await pending;
  const { data, error } = await supabase.rpc('find_profile_by_slug', { wanted: slug });
  if (error) throw error;
  const row = (data as Array<{ user_id: string; display_name: string }> | null)?.[0];
  return row ? { userId: row.user_id, displayName: row.display_name } : null;
}

export async function sendRequest(toUserId: string, fromUserId: string): Promise<void> {
  const pending = getSupabase();
  if (!pending) return;
  const supabase = await pending;
  const { error } = await supabase
    .from('friend_requests')
    .insert({ from_user: fromUserId, to_user: toUserId });
  // A duplicate just means the request is already waiting; not worth an error.
  if (error && !error.message.toLowerCase().includes('duplicate')) throw error;
}

export async function acceptRequest(requestId: string): Promise<void> {
  const pending = getSupabase();
  if (!pending) return;
  const supabase = await pending;
  const { error } = await supabase.rpc('accept_friend_request', { request_id: requestId });
  if (error) throw error;
}

export async function removeRequest(requestId: string): Promise<void> {
  const pending = getSupabase();
  if (!pending) return;
  const supabase = await pending;
  const { error } = await supabase.from('friend_requests').delete().eq('id', requestId);
  if (error) throw error;
}

export async function removeFriend(userId: string, friendId: string): Promise<void> {
  const pending = getSupabase();
  if (!pending) return;
  const supabase = await pending;
  const [a, b] = userId < friendId ? [userId, friendId] : [friendId, userId];
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('user_a', a)
    .eq('user_b', b);
  if (error) throw error;
}
