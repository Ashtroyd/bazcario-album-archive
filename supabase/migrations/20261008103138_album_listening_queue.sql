create table public.album_listening_queue (
 user_id uuid not null references auth.users(id) on delete cascade,
 album_id uuid not null references public.albums(id) on delete cascade,
 status text not null default 'want' check (status in ('want','listening')),
 added_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key (user_id,album_id)
);
create index album_listening_queue_album_idx on public.album_listening_queue(album_id);
alter table public.album_listening_queue enable row level security;
revoke all on public.album_listening_queue from anon, authenticated;
grant select, insert, update, delete on public.album_listening_queue to authenticated;
create policy queue_select on public.album_listening_queue for select to authenticated using ((select auth.uid()) = user_id);
create policy queue_insert on public.album_listening_queue for insert to authenticated with check ((select auth.uid()) = user_id);
create policy queue_update on public.album_listening_queue for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy queue_delete on public.album_listening_queue for delete to authenticated using ((select auth.uid()) = user_id);
