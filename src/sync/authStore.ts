import { create } from 'zustand';
import { getSupabase, hasStoredSession, syncConfigured } from './client';

export type AuthStatus = 'unconfigured' | 'loading' | 'signed-out' | 'code-sent' | 'signed-in';

interface AuthState {
  status: AuthStatus;
  email: string | null;
  userId: string | null;
  error: string | null;
  /** Send a six-digit sign-in code. No link, no redirect, no URL fragment. */
  requestCode: (email: string) => Promise<void>;
  verifyCode: (code: string) => Promise<void>;
  signOut: () => Promise<void>;
  cancel: () => void;
}

function message(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Try again.';
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  status: syncConfigured ? 'loading' : 'unconfigured',
  email: null,
  userId: null,
  error: null,

  requestCode: async (email) => {
    const pending = getSupabase();
    if (!pending) return;
    set({ status: 'loading', error: null });
    try {
      const supabase = await pending;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      set({ status: 'code-sent', email });
    } catch (error) {
      set({ status: 'signed-out', error: message(error) });
    }
  },

  verifyCode: async (code) => {
    const email = get().email;
    const pending = getSupabase();
    if (!pending || !email) return;
    set({ status: 'loading', error: null });
    try {
      const supabase = await pending;
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code.trim(),
        type: 'email',
      });
      if (error) throw error;
      set({ status: 'signed-in', userId: data.user?.id ?? null, error: null });
    } catch (error) {
      set({ status: 'code-sent', error: message(error) });
    }
  },

  signOut: async () => {
    const pending = getSupabase();
    if (!pending) return;
    await (await pending).auth.signOut();
    // Local data stays put — signing out is not a delete.
    set({ status: 'signed-out', email: null, userId: null, error: null });
  },

  cancel: () => set({ status: 'signed-out', email: null, error: null }),
}));

/** Wire the store to Supabase's own session lifecycle (refresh, expiry). */
export function initAuth(): void {
  if (!syncConfigured) return;
  // Nobody signed in on this device: stay signed out and never load the SDK.
  if (!hasStoredSession()) {
    useAuthStore.setState({ status: 'signed-out' });
    return;
  }
  void attachSession();
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
      ? { status: 'signed-in', userId: session.user.id, email: session.user.email ?? null }
      : { status: 'signed-out' },
  );
  supabase.auth.onAuthStateChange((_event, next) => {
    useAuthStore.setState(
      next
        ? { status: 'signed-in', userId: next.user.id, email: next.user.email ?? null }
        : { status: 'signed-out', userId: null },
    );
  });
}
