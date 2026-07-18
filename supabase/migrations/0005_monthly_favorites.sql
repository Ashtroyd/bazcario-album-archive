-- ============================================================================
-- Monthly favourite songs: a lightweight, hand-picked "top 5 of the month"
-- list per user, independent of the album/track rating catalog (a song
-- doesn't need to belong to a rated album to be favourited here). Visibility
-- matches ratings: friends-only, via the existing can_view_user() helper.
-- Safe to run more than once.
-- ============================================================================
create table if not exists public.monthly_favorites (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  month       date not null,           -- always first-of-month, e.g. 2026-07-01
  position    smallint not null check (position between 1 and 5),
  title       text not null,
  artist      text not null,
  cover_url   text,
  external_id text,                    -- iTunes trackId, for future re-fetch/dedupe
  created_at  timestamptz not null default now(),
  unique (user_id, month, position)
);

create index if not exists monthly_favorites_user_month_idx
  on public.monthly_favorites(user_id, month);

alter table public.monthly_favorites enable row level security;

-- Reuse the existing can_view_user() helper (0001_init.sql) — same
-- friends-only visibility rule already used by ratings/track_ratings.
drop policy if exists monthly_favorites_select on public.monthly_favorites;
create policy monthly_favorites_select on public.monthly_favorites for select
  using (public.can_view_user(auth.uid(), user_id));

drop policy if exists monthly_favorites_write on public.monthly_favorites;
create policy monthly_favorites_write on public.monthly_favorites for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 0001's blanket grant only covered tables that existed at the time. This is
-- a brand-new table, so it needs its own grant or PostgREST will reject every
-- request with 42501 even though RLS would otherwise allow it.
grant select, insert, update, delete on public.monthly_favorites to anon, authenticated;
