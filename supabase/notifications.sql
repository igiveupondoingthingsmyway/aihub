-- SHB message notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('message')),
  message_id uuid not null unique references public.messages(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists notifications_user_idx
on public.notifications(user_id, read_at, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications"
on public.notifications for select
using (auth.uid() = user_id);

drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users update own notifications"
on public.notifications for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.create_message_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient_id uuid;
begin
  select
    case
      when c.user_one = new.sender_id then c.user_two
      else c.user_one
    end
  into recipient_id
  from public.conversations c
  where c.id = new.conversation_id;

  if recipient_id is not null and recipient_id <> new.sender_id then
    insert into public.notifications (user_id, type, message_id, sender_id)
    values (recipient_id, 'message', new.id, new.sender_id)
    on conflict (message_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_message_created_notification on public.messages;
create trigger on_message_created_notification
after insert on public.messages
for each row execute procedure public.create_message_notification();

grant select, update on public.notifications to authenticated;

alter publication supabase_realtime add table public.notifications;
