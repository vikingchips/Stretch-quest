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


-- ─────────────────────────────────────────────────────────────────────────
-- Friends
--
-- user_state stays strictly private. Anything a friend is allowed to see
-- lives in `profiles`, which each client writes for itself on sync. That
-- split is deliberate: it means no policy ever has to reason about which
-- fields of a private blob are safe to expose.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  slug           text unique not null,
  display_name   text not null,
  streak         int  not null default 0,
  longest_streak int  not null default 0,
  xp             int  not null default 0,
  last_active    date,
  -- Seven characters, Monday first, '1' for a day with a session.
  week_pattern   text not null default '0000000',
  updated_at     timestamptz not null default now()
);

create table if not exists public.friend_requests (
  id         uuid primary key default gen_random_uuid(),
  from_user  uuid not null references auth.users (id) on delete cascade,
  to_user    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (from_user, to_user),
  constraint no_self_request check (from_user <> to_user)
);

-- One row per friendship, not two. The pair is stored in a canonical order
-- so "are these two friends" is a single lookup with no OR.
create table if not exists public.friendships (
  user_a     uuid not null references auth.users (id) on delete cascade,
  user_b     uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  constraint ordered_pair check (user_a < user_b)
);

create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.friendships
    where user_a = least(a, b) and user_b = greatest(a, b)
  );
$$;

alter table public.profiles enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;

-- A profile is visible to its owner, to confirmed friends, and to anyone
-- with a pending request either way — the last case is what lets both sides
-- see a name on the request screen.
drop policy if exists "read visible profiles" on public.profiles;
create policy "read visible profiles"
  on public.profiles for select
  using (
    auth.uid() = user_id
    or public.are_friends(auth.uid(), user_id)
    or exists (
      select 1 from public.friend_requests r
      where (r.from_user = auth.uid() and r.to_user = profiles.user_id)
         or (r.to_user = auth.uid() and r.from_user = profiles.user_id)
    )
  );

drop policy if exists "write own profile" on public.profiles;
create policy "write own profile"
  on public.profiles for insert with check (auth.uid() = user_id);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile"
  on public.profiles for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "read own requests" on public.friend_requests;
create policy "read own requests"
  on public.friend_requests for select
  using (auth.uid() in (from_user, to_user));

drop policy if exists "send requests" on public.friend_requests;
create policy "send requests"
  on public.friend_requests for insert with check (auth.uid() = from_user);

-- Either side can remove it: the sender cancels, the recipient declines.
drop policy if exists "withdraw or decline" on public.friend_requests;
create policy "withdraw or decline"
  on public.friend_requests for delete
  using (auth.uid() in (from_user, to_user));

drop policy if exists "read own friendships" on public.friendships;
create policy "read own friendships"
  on public.friendships for select
  using (auth.uid() in (user_a, user_b));

drop policy if exists "leave friendship" on public.friendships;
create policy "leave friendship"
  on public.friendships for delete
  using (auth.uid() in (user_a, user_b));

-- Insert goes through this function rather than a policy: accepting has to
-- check that a request actually exists and delete it in the same breath,
-- which a with-check expression cannot do.
create or replace function public.accept_friend_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.friend_requests%rowtype;
begin
  select * into req from public.friend_requests
    where id = request_id and to_user = auth.uid();
  if not found then
    raise exception 'no such request';
  end if;

  insert into public.friendships (user_a, user_b)
  values (least(req.from_user, req.to_user), greatest(req.from_user, req.to_user))
  on conflict do nothing;

  delete from public.friend_requests where id = req.id;
end;
$$;

-- Sending a request needs to resolve a name to a user without being able to
-- read the whole profiles table, so the lookup is a function that returns
-- exactly two columns and nothing else.
create or replace function public.find_profile_by_slug(wanted text)
returns table (user_id uuid, display_name text)
language sql
stable
security definer
set search_path = public
as $$
  select p.user_id, p.display_name
  from public.profiles p
  where p.slug = lower(wanted)
    and p.user_id <> auth.uid()
  limit 1;
$$;

grant execute on function public.are_friends(uuid, uuid) to authenticated;
grant execute on function public.accept_friend_request(uuid) to authenticated;
grant execute on function public.find_profile_by_slug(text) to authenticated;
