-- Standalone song ratings. These are intentionally separate from album track
-- ratings: a listener can score a song on its own without changing an album's
-- computed average.

create table public.songs (
  id                uuid primary key default gen_random_uuid(),
  spotify_track_id  text not null unique
    check (spotify_track_id ~ '^[A-Za-z0-9]{22}$'),
  spotify_album_id  text
    check (spotify_album_id is null or spotify_album_id ~ '^[A-Za-z0-9]{22}$'),
  title             text not null check (char_length(title) between 1 and 500),
  artist            text not null check (char_length(artist) between 1 and 500),
  album_title       text,
  cover_image_url   text,
  spotify_url       text,
  release_date      date,
  duration_ms       int check (duration_ms is null or duration_ms >= 0),
  -- Keep the shared catalog entry when its original importer deletes their
  -- account; only that user's rating should disappear.
  created_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now()
);

create table public.song_ratings (
  id            uuid primary key default gen_random_uuid(),
  song_id       uuid not null references public.songs(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  rating        numeric(5,2) not null check (rating >= 0 and rating <= 10),
  replay_value  public.replay_value,
  notes         text check (notes is null or char_length(notes) <= 1000),
  updated_at    timestamptz not null default now(),
  unique (song_id, user_id)
);

create index songs_created_by_idx on public.songs(created_by);
create index song_ratings_user_idx on public.song_ratings(user_id);
create index song_ratings_song_idx on public.song_ratings(song_id);

alter table public.songs enable row level security;
alter table public.song_ratings enable row level security;

-- New SQL-created tables are not guaranteed to be exposed through the Data
-- API, so grant only the operations used by the authenticated website.
revoke all on table public.songs from anon;
revoke all on table public.song_ratings from anon;

grant select on table public.songs to authenticated;
grant insert (
  spotify_track_id,
  spotify_album_id,
  title,
  artist,
  album_title,
  cover_image_url,
  spotify_url,
  release_date,
  duration_ms,
  created_by
) on table public.songs to authenticated;
grant select, insert, update, delete on table public.song_ratings to authenticated;

grant all on table public.songs to service_role;
grant all on table public.song_ratings to service_role;

create policy songs_select
  on public.songs for select to authenticated
  using (true);

create policy songs_insert
  on public.songs for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy song_ratings_select
  on public.song_ratings for select to authenticated
  using (public.can_view_user((select auth.uid()), user_id));

create policy song_ratings_insert
  on public.song_ratings for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy song_ratings_update
  on public.song_ratings for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy song_ratings_delete
  on public.song_ratings for delete to authenticated
  using (user_id = (select auth.uid()));
