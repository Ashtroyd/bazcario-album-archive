-- ============================================================================
-- Adds a cached cover-art color palette to albums, used to tint the album page
-- (Apple-Music style). Populated at album-create/cover-update time and by the
-- importer. Safe to run more than once.
-- ============================================================================
alter table public.albums add column if not exists cover_colors jsonb;
