-- ============================================================================
-- A user's hand-picked all-time favourite track (shown on their profile).
-- Safe to run more than once.
-- ============================================================================
alter table public.profiles
  add column if not exists favorite_track_id uuid
  references public.tracks(id) on delete set null;
