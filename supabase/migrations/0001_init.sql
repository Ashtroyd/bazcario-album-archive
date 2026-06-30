-- ============================================================================
-- Bazcario's Album Archive — initial schema
-- Postgres + Supabase Auth + Row Level Security
--
-- Apply this once against your Supabase project:
--   - Supabase Dashboard → SQL Editor → paste this whole file → Run, OR
--   - `supabase db push` (if you use the Supabase CLI)
--
-- This script is idempotent: it can be re-run safely.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.visibility as enum ('friends', 'public', 'private');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.replay_value as enum ('Low', 'Medium', 'High', 'Very High');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.friend_status as enum ('pending', 'accepted');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.comment_target as enum ('album', 'track', 'rating');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- One profile per auth user. `visibility` defaults to friends-only and is
-- ready for a future public/private toggle (no UI in v1).
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  display_name text,
  avatar_url   text,
  visibility   public.visibility not null default 'friends',
  created_at   timestamptz not null default now()
);

-- Albums are a shared catalog: any signed-in user can see them and rate them.
create table if not exists public.albums (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  artist          text not null,
  release_year    int,
  genre           text,
  cover_image_url text,
  created_by      uuid not null references public.profiles(id) on delete cascade,
  created_at      timestamptz not null default now()
);

create table if not exists public.tracks (
  id          uuid primary key default gen_random_uuid(),
  album_id    uuid not null references public.albums(id) on delete cascade,
  name        text not null,
  track_order int not null,
  unique (album_id, track_order)
);

-- One rating row per (user, album). overall_rating is COMPUTED by a trigger
-- (average of that user's track ratings) — never written directly by the app.
create table if not exists public.ratings (
  id                       uuid primary key default gen_random_uuid(),
  album_id                 uuid not null references public.albums(id) on delete cascade,
  user_id                  uuid not null references public.profiles(id) on delete cascade,
  overall_rating           numeric(5,2),
  first_listen_date        date,
  favorite_track_id        uuid references public.tracks(id) on delete set null,
  least_favorite_track_id  uuid references public.tracks(id) on delete set null,
  notes                    text,
  updated_at               timestamptz not null default now(),
  unique (album_id, user_id)
);

-- One track rating per (user, track). 0–10 with .01 precision.
create table if not exists public.track_ratings (
  id           uuid primary key default gen_random_uuid(),
  track_id     uuid not null references public.tracks(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  rating       numeric(5,2) not null check (rating >= 0 and rating <= 10),
  replay_value public.replay_value,
  notes        text,
  updated_at   timestamptz not null default now(),
  unique (track_id, user_id)
);

create table if not exists public.friendships (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,  -- requester
  friend_id  uuid not null references public.profiles(id) on delete cascade,  -- recipient
  status     public.friend_status not null default 'pending',
  created_at timestamptz not null default now(),
  check (user_id <> friend_id),
  unique (user_id, friend_id)
);

create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  target_type public.comment_target not null,
  target_id   uuid not null,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  body        text not null check (length(trim(body)) > 0),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists tracks_album_idx          on public.tracks(album_id);
create index if not exists ratings_user_idx          on public.ratings(user_id);
create index if not exists ratings_album_idx         on public.ratings(album_id);
create index if not exists track_ratings_user_idx    on public.track_ratings(user_id);
create index if not exists track_ratings_track_idx   on public.track_ratings(track_id);
create index if not exists friendships_user_idx      on public.friendships(user_id);
create index if not exists friendships_friend_idx    on public.friendships(friend_id);
create index if not exists comments_target_idx       on public.comments(target_type, target_id);

-- ---------------------------------------------------------------------------
-- Functions & triggers
-- ---------------------------------------------------------------------------

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Recompute ratings.overall_rating as the average of the user's track ratings
-- for that album, whenever their track ratings change. Creates the ratings row
-- if needed. SECURITY DEFINER so it can upsert regardless of RLS.
create or replace function public.recalc_overall_rating()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_track_id uuid;
  v_user_id  uuid;
  v_album_id uuid;
  v_avg      numeric(5,2);
begin
  if (tg_op = 'DELETE') then
    v_track_id := old.track_id;
    v_user_id  := old.user_id;
  else
    v_track_id := new.track_id;
    v_user_id  := new.user_id;
  end if;

  select album_id into v_album_id from public.tracks where id = v_track_id;
  if v_album_id is null then
    return null;
  end if;

  select round(avg(tr.rating), 2) into v_avg
  from public.track_ratings tr
  join public.tracks t on t.id = tr.track_id
  where t.album_id = v_album_id and tr.user_id = v_user_id;

  insert into public.ratings (album_id, user_id, overall_rating)
  values (v_album_id, v_user_id, v_avg)
  on conflict (album_id, user_id)
  do update set overall_rating = excluded.overall_rating, updated_at = now();

  return null;
end;
$$;

drop trigger if exists trg_recalc_overall on public.track_ratings;
create trigger trg_recalc_overall
  after insert or update or delete on public.track_ratings
  for each row execute function public.recalc_overall_rating();

-- Friendship helpers. SECURITY DEFINER so policies on OTHER tables can call
-- them without tripping RLS recursion on friendships.
create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.user_id = a and f.friend_id = b)
        or (f.user_id = b and f.friend_id = a))
  );
$$;

create or replace function public.has_friend_link(a uuid, b uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.friendships f
    where (f.user_id = a and f.friend_id = b)
       or (f.user_id = b and f.friend_id = a)
  );
$$;

-- Visibility rule for a user's private data (ratings/notes): self, public
-- profile, or accepted friend.
create or replace function public.can_view_user(viewer uuid, owner_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select
    viewer = owner_id
    or exists (
      select 1 from public.profiles p
      where p.id = owner_id and p.visibility = 'public'
    )
    or public.are_friends(viewer, owner_id);
$$;

-- Find users to friend by name/email (bypasses profile RLS, returns minimal
-- fields, excludes yourself). Used by the add-friend search box.
create or replace function public.search_profiles(q text)
returns table (id uuid, display_name text, avatar_url text, email text)
language sql stable security definer set search_path = public
as $$
  select p.id, p.display_name, p.avatar_url, p.email
  from public.profiles p
  where p.id <> auth.uid()
    and length(trim(q)) >= 2
    and (p.email ilike '%' || q || '%' or p.display_name ilike '%' || q || '%')
  order by p.display_name
  limit 20;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.albums        enable row level security;
alter table public.tracks        enable row level security;
alter table public.ratings       enable row level security;
alter table public.track_ratings enable row level security;
alter table public.friendships   enable row level security;
alter table public.comments      enable row level security;

-- profiles: see your own, public profiles, or anyone you have a friend link
-- with (pending or accepted — so requests can show names). Edit only your own.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (
    id = auth.uid()
    or visibility = 'public'
    or public.has_friend_link(auth.uid(), id)
  );

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert
  with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- albums: shared catalog. Read by any signed-in user; written by the creator.
drop policy if exists albums_select on public.albums;
create policy albums_select on public.albums for select
  using (auth.uid() is not null);

drop policy if exists albums_insert on public.albums;
create policy albums_insert on public.albums for insert
  with check (created_by = auth.uid());

drop policy if exists albums_update on public.albums;
create policy albums_update on public.albums for update
  using (created_by = auth.uid()) with check (created_by = auth.uid());

drop policy if exists albums_delete on public.albums;
create policy albums_delete on public.albums for delete
  using (created_by = auth.uid());

-- tracks: readable by any signed-in user; writable by the album's creator.
drop policy if exists tracks_select on public.tracks;
create policy tracks_select on public.tracks for select
  using (auth.uid() is not null);

drop policy if exists tracks_write on public.tracks;
create policy tracks_write on public.tracks for all
  using (
    exists (select 1 from public.albums a
            where a.id = tracks.album_id and a.created_by = auth.uid())
  )
  with check (
    exists (select 1 from public.albums a
            where a.id = tracks.album_id and a.created_by = auth.uid())
  );

-- ratings: friends-only visibility; write only your own.
drop policy if exists ratings_select on public.ratings;
create policy ratings_select on public.ratings for select
  using (public.can_view_user(auth.uid(), user_id));

drop policy if exists ratings_insert on public.ratings;
create policy ratings_insert on public.ratings for insert
  with check (user_id = auth.uid());

drop policy if exists ratings_update on public.ratings;
create policy ratings_update on public.ratings for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists ratings_delete on public.ratings;
create policy ratings_delete on public.ratings for delete
  using (user_id = auth.uid());

-- track_ratings: friends-only visibility; write only your own.
drop policy if exists track_ratings_select on public.track_ratings;
create policy track_ratings_select on public.track_ratings for select
  using (public.can_view_user(auth.uid(), user_id));

drop policy if exists track_ratings_insert on public.track_ratings;
create policy track_ratings_insert on public.track_ratings for insert
  with check (user_id = auth.uid());

drop policy if exists track_ratings_update on public.track_ratings;
create policy track_ratings_update on public.track_ratings for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists track_ratings_delete on public.track_ratings;
create policy track_ratings_delete on public.track_ratings for delete
  using (user_id = auth.uid());

-- friendships: only the two parties can see them. You create requests as
-- yourself; only the recipient accepts (update); either party can delete
-- (deny / cancel / unfriend).
drop policy if exists friendships_select on public.friendships;
create policy friendships_select on public.friendships for select
  using (user_id = auth.uid() or friend_id = auth.uid());

drop policy if exists friendships_insert on public.friendships;
create policy friendships_insert on public.friendships for insert
  with check (user_id = auth.uid());

drop policy if exists friendships_update on public.friendships;
create policy friendships_update on public.friendships for update
  using (friend_id = auth.uid()) with check (friend_id = auth.uid());

drop policy if exists friendships_delete on public.friendships;
create policy friendships_delete on public.friendships for delete
  using (user_id = auth.uid() or friend_id = auth.uid());

-- comments: album/track comments readable by any signed-in user; rating
-- comments gated by the rating owner's visibility. Write/delete your own.
drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments for select
  using (
    auth.uid() is not null
    and (
      target_type in ('album', 'track')
      or (
        target_type = 'rating'
        and exists (
          select 1 from public.ratings r
          where r.id = comments.target_id
            and public.can_view_user(auth.uid(), r.user_id)
        )
      )
    )
  );

drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments for insert
  with check (user_id = auth.uid());

drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments for delete
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage buckets (cover art + avatars): public read, authenticated write.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('covers', 'covers', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

drop policy if exists media_public_read on storage.objects;
create policy media_public_read on storage.objects for select
  using (bucket_id in ('covers', 'avatars'));

drop policy if exists media_auth_insert on storage.objects;
create policy media_auth_insert on storage.objects for insert
  with check (bucket_id in ('covers', 'avatars') and auth.uid() is not null);

drop policy if exists media_auth_update on storage.objects;
create policy media_auth_update on storage.objects for update
  using (bucket_id in ('covers', 'avatars') and auth.uid() is not null);

drop policy if exists media_owner_delete on storage.objects;
create policy media_owner_delete on storage.objects for delete
  using (bucket_id in ('covers', 'avatars') and owner = auth.uid());

-- ---------------------------------------------------------------------------
-- Grants (RLS still gates every row; these just expose the tables/RPCs to the
-- PostgREST roles). Run after objects exist.
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated;
