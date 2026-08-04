/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL. Absent in local-only builds — sync then stays off. */
  readonly VITE_SUPABASE_URL?: string;
  /** Publishable key (sb_publishable_...). Safe to ship; RLS does the real work. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** Legacy anon key. Still accepted, but Supabase retires it end of 2026. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Domain for synthetic sign-in addresses. Never mailed. Rarely needs changing. */
  readonly VITE_IDENTITY_DOMAIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
