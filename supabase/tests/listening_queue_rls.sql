-- Rollback-only checks: existing users/albums are fixtures, never modified.
begin;
do $$
declare
  owner_id uuid;
  other_id uuid;
  album uuid;
  affected integer;
begin
  select id into owner_id from auth.users order by id limit 1;
  select id into other_id from auth.users where id <> owner_id order by id limit 1;
  select id into album from public.albums order by id limit 1;
  if owner_id is null or other_id is null or album is null then
    raise exception 'Requires two existing users and one existing album';
  end if;
  if has_table_privilege('anon', 'public.album_listening_queue', 'select') then
    raise exception 'Anonymous queue access is not allowed';
  end if;
  insert into public.album_listening_queue(user_id,album_id,status)
    values(other_id,album,'want') on conflict(user_id,album_id) do nothing;
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub',owner_id,'role','authenticated')::text, true);
  set local role authenticated;
  insert into public.album_listening_queue(user_id,album_id,status)
    values(owner_id,album,'want') on conflict(user_id,album_id) do update set status='want';
  if (select count(*) from public.album_listening_queue where user_id=owner_id and album_id=album) <> 1 then
    raise exception 'Owner could not read saved entry';
  end if;
  if exists(select 1 from public.album_listening_queue where user_id=other_id) then
    raise exception 'Another user queue leaked';
  end if;
  update public.album_listening_queue set status='listening' where user_id=owner_id and album_id=album;
  if not exists(select 1 from public.album_listening_queue where user_id=owner_id and album_id=album and status='listening') then
    raise exception 'Owner could not update entry';
  end if;
  begin
    insert into public.album_listening_queue(user_id,album_id,status) values(other_id,album,'listening');
    raise exception 'Cross-owner insert unexpectedly allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.album_listening_queue set user_id=other_id where user_id=owner_id and album_id=album;
    raise exception 'Ownership transfer unexpectedly allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.album_listening_queue set status='rated' where user_id=owner_id and album_id=album;
    raise exception 'Persisted Rated status unexpectedly allowed';
  exception when check_violation then null;
  end;
  delete from public.album_listening_queue where user_id=other_id and album_id=album;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Cross-owner delete allowed'; end if;
  delete from public.album_listening_queue where user_id=owner_id and album_id=album;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Owner delete failed'; end if;
  reset role;
end $$;
rollback;
