-- ============================================================================
-- Tracks when a user last opened their notifications, so the bell can show an
-- unread count. Safe to run more than once.
-- ============================================================================
alter table public.profiles
  add column if not exists last_seen_notifications timestamptz not null default now();
