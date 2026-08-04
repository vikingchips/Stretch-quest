/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL. Absent in local-only builds — sync then stays off. */
  readonly VITE_SUPABASE_URL?: string;
  /** Public anon key. Safe to ship; row-level security does the real work. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
