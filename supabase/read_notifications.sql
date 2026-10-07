-- SHB: mark message notifications as read when a conversation is opened
create or replace function public.mark_conversation_notifications_read(target_conversation uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.notifications n
  set read_at = now()
  where n.user_id = auth.uid()
    and n.type = 'message'
    and n.read_at is null
    and exists (
      select 1
      from public.messages m
      where m.id = n.message_id
        and m.conversation_id = target_conversation
    );
end;
$$;

grant execute on function public.mark_conversation_notifications_read(uuid) to authenticated;
