-- ============================================================================
-- Artist follows + release announcements.
--
-- followed_artists is per-user (like a personal watchlist). artist_releases
-- is a shared cache of every release ever seen for any followed artist,
-- populated by a scheduled job (MusicBrainz, no API key needed) — written
-- only by the service role, readable by any signed-in user.
-- ============================================================================

create table if not exists public.followed_artists (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  mbid       text not null,
  name       text not null,
  created_at timestamptz not null default now(),
  unique (user_id, mbid)
);

create table if not exists public.artist_releases (
  id                uuid primary key default gen_random_uuid(),
  mbid              text not null,
  artist_name       text not null,
  release_group_id  text not null unique,
  title             text not null,
  release_type      text,
  release_date      date,
  cover_url         text,
  first_seen_at     timestamptz not null default now()
);

create index if not exists followed_artists_mbid_idx  on public.followed_artists(mbid);
create index if not exists followed_artists_user_idx  on public.followed_artists(user_id);
create index if not exists artist_releases_mbid_idx   on public.artist_releases(mbid);
create index if not exists artist_releases_date_idx   on public.artist_releases(release_date);

alter table public.followed_artists enable row level security;
alter table public.artist_releases  enable row level security;

-- followed_artists: any signed-in user can see who follows what; you can
-- only create or remove your own follows.
drop policy if exists followed_artists_select on public.followed_artists;
create policy followed_artists_select on public.followed_artists for select
  using (auth.uid() is not null);

drop policy if exists followed_artists_insert on public.followed_artists;
create policy followed_artists_insert on public.followed_artists for insert
  with check (user_id = auth.uid());

drop policy if exists followed_artists_delete on public.followed_artists;
create policy followed_artists_delete on public.followed_artists for delete
  using (user_id = auth.uid());

-- artist_releases: shared read-only feed. No insert/update/delete policy for
-- normal users — only the service-role key (used by the scheduled job) can
-- write, since RLS is bypassed for that role.
drop policy if exists artist_releases_select on public.artist_releases;
create policy artist_releases_select on public.artist_releases for select
  using (auth.uid() is not null);
