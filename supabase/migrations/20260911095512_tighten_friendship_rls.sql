-- Friendship requests have one legal lifecycle:
-- requester inserts pending -> recipient accepts -> either party may delete.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.enforce_friendship_state_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.user_id is distinct from old.user_id
    or new.friend_id is distinct from old.friend_id
    or new.created_at is distinct from old.created_at then
    raise insufficient_privilege
      using message = 'Friendship participants and identity cannot be changed';
  end if;

  if old.status <> 'pending' or new.status <> 'accepted' then
    raise insufficient_privilege
      using message = 'Only pending friendship requests can be accepted';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_friendship_state_transition()
  from public, anon, authenticated;

drop trigger if exists friendships_enforce_state_transition
  on public.friendships;
create trigger friendships_enforce_state_transition
  before update on public.friendships
  for each row execute function private.enforce_friendship_state_transition();

drop policy if exists friendships_select on public.friendships;
create policy friendships_select
  on public.friendships for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or friend_id = (select auth.uid())
  );

drop policy if exists friendships_insert on public.friendships;
create policy friendships_insert
  on public.friendships for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and friend_id <> (select auth.uid())
    and status = 'pending'
  );

drop policy if exists friendships_update on public.friendships;
create policy friendships_update
  on public.friendships for update
  to authenticated
  using (
    friend_id = (select auth.uid())
    and status = 'pending'
  )
  with check (
    friend_id = (select auth.uid())
    and status = 'accepted'
  );

drop policy if exists friendships_delete on public.friendships;
create policy friendships_delete
  on public.friendships for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    or friend_id = (select auth.uid())
  );

-- The API can create requests without specifying protected/default columns,
-- and can update only the status field used by the accept action.
revoke all privileges on table public.friendships from anon, authenticated;
grant select, delete on table public.friendships to authenticated;
grant insert (user_id, friend_id) on table public.friendships to authenticated;
grant update (status) on table public.friendships to authenticated;
