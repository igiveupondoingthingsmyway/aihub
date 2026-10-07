-- SHB social layer

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

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_one uuid not null references public.profiles(id) on delete cascade,
  user_two uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_one <> user_two),
  unique(user_one, user_two)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (length(trim(content)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists profiles_username_idx on public.profiles(username);
create index if not exists friend_requests_receiver_idx on public.friend_requests(receiver_id, status);
create index if not exists friendships_user_idx on public.friendships(user_id);
create index if not exists messages_conversation_idx on public.messages(conversation_id, created_at);

alter table public.profiles enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

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

drop policy if exists "Participants read conversations" on public.conversations;
create policy "Participants read conversations" on public.conversations for select using (auth.uid() = user_one or auth.uid() = user_two);
drop policy if exists "Participants create conversations" on public.conversations;
create policy "Participants create conversations" on public.conversations for insert with check (auth.uid() = user_one or auth.uid() = user_two);

drop policy if exists "Participants read messages" on public.messages;
create policy "Participants read messages" on public.messages for select using (
  exists (select 1 from public.conversations c where c.id = conversation_id and (c.user_one = auth.uid() or c.user_two = auth.uid()))
);
drop policy if exists "Participants send messages" on public.messages;
create policy "Participants send messages" on public.messages for insert with check (
  auth.uid() = sender_id and exists (
    select 1 from public.conversations c where c.id = conversation_id and (c.user_one = auth.uid() or c.user_two = auth.uid())
  )
);

create or replace function public.get_or_create_conversation(other_user uuid)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  conversation_id uuid;
begin
  if me is null or other_user is null or me = other_user then raise exception 'Invalid users'; end if;
  select id into conversation_id from public.conversations
  where user_one = least(me, other_user) and user_two = greatest(me, other_user);
  if conversation_id is null then
    insert into public.conversations(user_one, user_two)
    values (least(me, other_user), greatest(me, other_user))
    returning id into conversation_id;
  end if;
  return conversation_id;
end;
$$;

grant execute on function public.get_or_create_conversation(uuid) to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
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
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter publication supabase_realtime add table public.messages;


-- Friend system RPCs

create or replace function public.accept_friend_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.friend_requests%rowtype;
  me uuid := auth.uid();
begin
  if me is null then raise exception 'Not authenticated'; end if;

  select * into req
  from public.friend_requests
  where id = request_id
    and receiver_id = me
    and status = 'pending'
  for update;

  if not found then raise exception 'Friend request not found'; end if;

  update public.friend_requests
  set status = 'accepted'
  where id = req.id;

  insert into public.friendships (user_id, friend_id)
  values (req.sender_id, req.receiver_id), (req.receiver_id, req.sender_id)
  on conflict do nothing;
end;
$$;

create or replace function public.remove_friend(friend_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null or friend_user is null or me = friend_user then
    raise exception 'Invalid users';
  end if;

  delete from public.friendships
  where (user_id = me and friend_id = friend_user)
     or (user_id = friend_user and friend_id = me);

  update public.friend_requests
  set status = 'declined'
  where ((sender_id = me and receiver_id = friend_user)
      or (sender_id = friend_user and receiver_id = me))
    and status = 'accepted';
end;
$$;

create or replace function public.cancel_friend_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.friend_requests
  where id = request_id
    and sender_id = auth.uid()
    and status = 'pending';

  if not found then raise exception 'Friend request not found'; end if;
end;
$$;

create or replace function public.reject_friend_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.friend_requests
  set status = 'declined'
  where id = request_id
    and receiver_id = auth.uid()
    and status = 'pending';

  if not found then raise exception 'Friend request not found'; end if;
end;
$$;

grant execute on function public.accept_friend_request(uuid) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.cancel_friend_request(uuid) to authenticated;
grant execute on function public.reject_friend_request(uuid) to authenticated;
