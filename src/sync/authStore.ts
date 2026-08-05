import { create } from 'zustand';
import { getSupabase, hasStoredSession, syncConfigured } from './client';
import { nameToIdentity, nameToSlug, pinToPassword } from './identity';

export type AuthStatus = 'unconfigured' | 'loading' | 'signed-out' | 'signed-in';

interface AuthState {
  status: AuthStatus;
  /** What the person typed, kept for display. */
  displayName: string | null;
  userId: string | null;
  error: string | null;
  signIn: (name: string, pin: string) => Promise<void>;
  createAccount: (name: string, pin: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

/**
 * Supabase speaks in its own terms; these are the two cases that actually
 * happen here, translated into what the person did wrong.
 */
function explain(raw: string): string {
  const message = raw.toLowerCase();
  if (message.includes('invalid login credentials')) {
    return 'No account with that name and code. Check the code, or create an account.';
  }
  if (message.includes('already registered') || message.includes('already been registered')) {
    return 'That name is taken. Pick another, or sign in if it is yours.';
  }
  // The addresses are synthetic, so a confirmation can never arrive. Seeing
  // this means the project still has "Confirm email" switched on.
  if (message.includes('not confirmed')) {
    return 'This account is waiting on a confirmation that cannot arrive. Sign-in needs "Confirm email" turned off in Supabase.';
  }
  // Never blame the name for this: the address is built from the Supabase
  // project host, so a rejection here is a setup problem, not something the
  // person typing can fix by choosing differently.
  if (message.includes('email') && message.includes('invalid')) {
    return `Sign-in is misconfigured: the server rejected the address this app builds internally. Not your name. Raw error — ${raw}`;
  }
  return raw;
}

function message(error: unknown): string {
  return explain(error instanceof Error ? error.message : 'Something went wrong. Try again.');
}

export const useAuthStore = create<AuthState>()((set) => ({
  status: syncConfigured ? 'loading' : 'unconfigured',
  displayName: null,
  userId: null,
  error: null,

  signIn: async (name, pin) => {
    const pending = getSupabase();
    if (!pending) return;
    set({ status: 'loading', error: null });
    try {
      const supabase = await pending;
      const { data, error } = await supabase.auth.signInWithPassword({
        email: nameToIdentity(name),
        password: pinToPassword(pin),
      });
      if (error) throw error;
      set({
        status: 'signed-in',
        userId: data.user?.id ?? null,
        displayName: (data.user?.user_metadata?.display_name as string) ?? name,
        error: null,
      });
    } catch (error) {
      set({ status: 'signed-out', error: message(error) });
    }
  },

  createAccount: async (name, pin) => {
    const pending = getSupabase();
    if (!pending) return;
    set({ status: 'loading', error: null });
    try {
      const supabase = await pending;
      const { data, error } = await supabase.auth.signUp({
        email: nameToIdentity(name),
        password: pinToPassword(pin),
        options: { data: { display_name: name.trim(), slug: nameToSlug(name) } },
      });
      if (error) throw error;
      // With email confirmation off, sign-up already returns a session.
      if (!data.session) {
        set({
          status: 'signed-out',
          error: 'Account created, but not signed in. Try signing in.',
        });
        return;
      }
      set({
        status: 'signed-in',
        userId: data.user?.id ?? null,
        displayName: name.trim(),
        error: null,
      });
    } catch (error) {
      set({ status: 'signed-out', error: message(error) });
    }
  },

  signOut: async () => {
    const pending = getSupabase();
    if (!pending) return;
    await (await pending).auth.signOut();
    // Local data stays put — signing out is not a delete.
    set({ status: 'signed-out', displayName: null, userId: null, error: null });
  },

  clearError: () => set({ error: null }),
}));

export function initAuth(): void {
  if (!syncConfigured) return;
  // Nobody signed in on this device: stay signed out and never load the SDK.
  if (!hasStoredSession()) {
    useAuthStore.setState({ status: 'signed-out' });
    return;
  }
  void attachSession();
}

function nameOf(metadata: Record<string, unknown> | undefined): string | null {
  const name = metadata?.display_name;
  return typeof name === 'string' ? name : null;
}

/** Loads the SDK and follows its session lifecycle (restore, refresh, expiry). */
export async function attachSession(): Promise<void> {
  const pending = getSupabase();
  if (!pending) return;
  const supabase = await pending;
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  useAuthStore.setState(
    session
      ? {
          status: 'signed-in',
          userId: session.user.id,
          displayName: nameOf(session.user.user_metadata),
        }
      : { status: 'signed-out' },
  );
  supabase.auth.onAuthStateChange((_event, next) => {
    useAuthStore.setState(
      next
        ? {
            status: 'signed-in',
            userId: next.user.id,
            displayName: nameOf(next.user.user_metadata),
          }
        : { status: 'signed-out', userId: null },
    );
  });
}
