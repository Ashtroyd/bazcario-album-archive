-- ============================================================================
-- Switch Announcements' artist identity from MusicBrainz to Spotify.
--
-- MusicBrainz search only gave a terse disambiguation string — not enough to
-- tell two same-named artists apart. Spotify gives a photo, follower count,
-- and genres for each search result, so search results can actually show
-- which one is the real group. Release checking moves to Spotify too (their
-- artist/albums endpoint), which also drops the separate Cover Art Archive
-- lookup — Spotify albums already include images.
--
-- No rows exist yet in either table (this feature just shipped), so this
-- recreates them rather than migrating data.
-- ============================================================================

drop table if exists public.artist_releases cascade;
drop table if exists public.followed_artists cascade;

create table public.followed_artists (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  spotify_artist_id  text not null,
  name               text not null,
  created_at         timestamptz not null default now(),
  unique (user_id, spotify_artist_id)
);

create table public.artist_releases (
  id                 uuid primary key default gen_random_uuid(),
  spotify_artist_id  text not null,
  artist_name        text not null,
  spotify_album_id   text not null unique,
  title              text not null,
  album_type         text,
  release_date       date,
  cover_url          text,
  first_seen_at      timestamptz not null default now()
);

create index followed_artists_spotify_idx on public.followed_artists(spotify_artist_id);
create index followed_artists_user_idx    on public.followed_artists(user_id);
create index artist_releases_spotify_idx  on public.artist_releases(spotify_artist_id);
create index artist_releases_date_idx     on public.artist_releases(release_date);

alter table public.followed_artists enable row level security;
alter table public.artist_releases  enable row level security;

-- followed_artists: any signed-in user can see who follows what; you can
-- only create or remove your own follows.
create policy followed_artists_select on public.followed_artists for select
  using (auth.uid() is not null);

create policy followed_artists_insert on public.followed_artists for insert
  with check (user_id = auth.uid());

create policy followed_artists_delete on public.followed_artists for delete
  using (user_id = auth.uid());

-- artist_releases: shared read-only feed. No insert/update/delete policy for
-- normal users — only the service-role key (used by the scheduled job) can
-- write, since RLS is bypassed for that role.
create policy artist_releases_select on public.artist_releases for select
  using (auth.uid() is not null);
