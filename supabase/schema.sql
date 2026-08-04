-- StretchQuest cloud sync.
--
-- Run this once in the Supabase SQL editor after creating the project.
-- Everything a user owns lives in a single JSON row: the app already stores
-- three coherent blobs, and syncing them whole keeps the merge logic in one
-- place (src/sync/merge.ts) instead of spread across joins.

create table if not exists public.user_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  progress   jsonb not null default '{}'::jsonb,
  sessions   jsonb not null default '[]'::jsonb,
  routines   jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_state enable row level security;

-- The publishable key is public by design, so these policies are the only
-- thing keeping one account's rows away from another's. Every policy is scoped to
-- auth.uid(); there is deliberately no policy that allows reading other rows.
drop policy if exists "read own state" on public.user_state;
create policy "read own state"
  on public.user_state for select
  using (auth.uid() = user_id);

drop policy if exists "insert own state" on public.user_state;
create policy "insert own state"
  on public.user_state for insert
  with check (auth.uid() = user_id);

drop policy if exists "update own state" on public.user_state;
create policy "update own state"
  on public.user_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "delete own state" on public.user_state;
create policy "delete own state"
  on public.user_state for delete
  using (auth.uid() = user_id);
