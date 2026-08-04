import type { SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;

/**
 * Supabase is replacing anon keys with publishable ones and retiring the old
 * format at the end of 2026, so the publishable key wins where both are set.
 * Either works as the second argument to createClient.
 */
const publicKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Whether this build has sync credentials at all. When false the app is
 * exactly what it was — local-only, offline, no account — and the Supabase
 * SDK is tree-shaken out of the bundle entirely.
 */
export const syncConfigured = Boolean(url && publicKey);

let clientPromise: Promise<SupabaseClient> | null = null;

/**
 * The SDK is ~55 kB gzipped, which is a lot to hand every visitor of an
 * offline-first app when most of them never sign in. So it loads on demand:
 * when the account UI is opened, or at startup only if a stored session
 * suggests someone is already signed in.
 */
export function getSupabase(): Promise<SupabaseClient> | null {
  if (!syncConfigured) return null;
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(url!, publicKey!, {
      auth: {
        // Sign-in is a six-digit code, not a magic link, so nothing ever
        // lands in the URL. That matters here: the app uses hash routing,
        // and a token in the fragment would collide with the route.
        detectSessionInUrl: false,
        persistSession: true,
        autoRefreshToken: true,
      },
    }),
  );
  return clientPromise;
}

/**
 * True when Supabase has a persisted session in localStorage. Lets startup
 * decide whether loading the SDK is worth it without loading it first.
 */
export function hasStoredSession(): boolean {
  if (!syncConfigured) return false;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('sb-') && key.endsWith('-auth-token')) return true;
    }
  } catch {
    // Private mode or storage disabled — treat as signed out.
  }
  return false;
}
