-- Spicetify live-rating integration.
--
-- Spotify IDs live in mapping tables rather than directly on albums/tracks so
-- multiple Spotify editions can be linked to one Album Archive entry later.

create table if not exists public.spotify_album_mappings (
  spotify_album_id text primary key
    check (spotify_album_id ~ '^[A-Za-z0-9]{22}$'),
  album_id         uuid not null references public.albums(id) on delete cascade,
  spotify_url      text,
  created_at       timestamptz not null default now()
);

create table if not exists public.spotify_track_mappings (
  spotify_track_id text primary key
    check (spotify_track_id ~ '^[A-Za-z0-9]{22}$'),
  track_id         uuid not null references public.tracks(id) on delete cascade,
  spotify_album_id text not null references public.spotify_album_mappings(spotify_album_id) on delete cascade,
  disc_number      int not null default 1 check (disc_number > 0),
  track_number     int not null check (track_number > 0),
  created_at       timestamptz not null default now()
);

create index if not exists spotify_album_mappings_album_idx
  on public.spotify_album_mappings(album_id);
create index if not exists spotify_track_mappings_track_idx
  on public.spotify_track_mappings(track_id);
create index if not exists spotify_track_mappings_album_idx
  on public.spotify_track_mappings(spotify_album_id);

-- Only a SHA-256 digest is stored. The raw token is shown once at creation.
create table if not exists public.extension_access_tokens (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  token_hash    text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  label         text not null default 'Spotify desktop' check (char_length(label) between 1 and 80),
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default (now() + interval '180 days'),
  last_used_at  timestamptz,
  revoked_at    timestamptz
);

create index if not exists extension_access_tokens_user_idx
  on public.extension_access_tokens(user_id);
create index if not exists extension_access_tokens_active_idx
  on public.extension_access_tokens(token_hash)
  where revoked_at is null;

alter table public.spotify_album_mappings enable row level security;
alter table public.spotify_track_mappings enable row level security;
alter table public.extension_access_tokens enable row level security;

-- Supabase no longer guarantees that SQL-created tables are exposed to the
-- Data API automatically. Grant the minimum operations used by the signed-in
-- profile UI, while keeping anonymous callers out entirely.
revoke all on table public.spotify_album_mappings from anon;
revoke all on table public.spotify_track_mappings from anon;
revoke all on table public.extension_access_tokens from anon;

grant select on table public.spotify_album_mappings to authenticated;
grant select on table public.spotify_track_mappings to authenticated;
grant select (id, user_id, label, created_at, expires_at, last_used_at, revoked_at)
  on table public.extension_access_tokens to authenticated;
grant insert (user_id, token_hash, label, expires_at)
  on table public.extension_access_tokens to authenticated;
grant update (revoked_at)
  on table public.extension_access_tokens to authenticated;

grant all on table public.spotify_album_mappings to service_role;
grant all on table public.spotify_track_mappings to service_role;
grant all on table public.extension_access_tokens to service_role;

drop policy if exists spotify_album_mappings_select on public.spotify_album_mappings;
create policy spotify_album_mappings_select
  on public.spotify_album_mappings for select to authenticated
  using (true);

drop policy if exists spotify_track_mappings_select on public.spotify_track_mappings;
create policy spotify_track_mappings_select
  on public.spotify_track_mappings for select to authenticated
  using (true);

drop policy if exists extension_access_tokens_select on public.extension_access_tokens;
create policy extension_access_tokens_select
  on public.extension_access_tokens for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists extension_access_tokens_insert on public.extension_access_tokens;
create policy extension_access_tokens_insert
  on public.extension_access_tokens for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists extension_access_tokens_update on public.extension_access_tokens;
create policy extension_access_tokens_update
  on public.extension_access_tokens for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists extension_access_tokens_delete on public.extension_access_tokens;
create policy extension_access_tokens_delete
  on public.extension_access_tokens for delete to authenticated
  using (user_id = (select auth.uid()));
