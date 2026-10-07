-- AI Hub social layer
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username = lower(username) and length(username) between 3 and 24),
  bio text not null default '' check (length(bio) <= 160),
  avatar_url text not null default '',
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  unique(sender_id, receiver_id),
  check (sender_id <> receiver_id)
);

create table if not exists public.friendships (
  user_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

create index if not exists profiles_username_idx on public.profiles(username);
create index if not exists friend_requests_receiver_idx on public.friend_requests(receiver_id, status);
create index if not exists friendships_user_idx on public.friendships(user_id);

alter table public.profiles enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;

drop policy if exists "Public profiles are readable" on public.profiles;
create policy "Public profiles are readable" on public.profiles for select using (true);

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Users read own friend requests" on public.friend_requests;
create policy "Users read own friend requests" on public.friend_requests for select using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "Users send friend requests" on public.friend_requests;
create policy "Users send friend requests" on public.friend_requests for insert with check (auth.uid() = sender_id);

drop policy if exists "Users update received requests" on public.friend_requests;
create policy "Users update received requests" on public.friend_requests for update using (auth.uid() = receiver_id);

drop policy if exists "Users read own friendships" on public.friendships;
create policy "Users read own friendships" on public.friendships for select using (auth.uid() = user_id);

drop policy if exists "Users create own friendships" on public.friendships;
create policy "Users create own friendships" on public.friendships for insert with check (auth.uid() = user_id);

-- Keep profiles in sync with new auth users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base_username text;
begin
  base_username := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1), 'user'), '[^a-zA-Z0-9_]', '', 'g'));
  base_username := left(base_username, 24);
  if length(base_username) < 3 then base_username := 'user_' || substr(new.id::text, 1, 8); end if;
  insert into public.profiles (id, username, bio, avatar_url)
  values (new.id, base_username, coalesce(new.raw_user_meta_data->>'bio',''), coalesce(new.raw_user_meta_data->>'avatar_url',''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
