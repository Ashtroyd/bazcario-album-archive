-- ============================================================================
-- RLS performance (Supabase advisors 0003 auth_rls_initplan and
-- 0006 multiple_permissive_policies). Behaviour is unchanged:
--   * auth.uid() is wrapped as (select auth.uid()) so Postgres evaluates it
--     once per statement instead of once per row.
--   * tracks_write / monthly_favorites_write were FOR ALL policies, which also
--     applied to SELECT alongside the dedicated select policy. They are split
--     into insert / update / delete policies with the same conditions.
-- ============================================================================

-- profiles
alter policy profiles_select on public.profiles
  using ((id = (select auth.uid())) or (visibility = 'public'::visibility)
         or public.has_friend_link((select auth.uid()), id));
alter policy profiles_insert on public.profiles
  with check (id = (select auth.uid()));
alter policy profiles_update on public.profiles
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- albums
alter policy albums_select on public.albums
  using ((select auth.uid()) is not null);
alter policy albums_insert on public.albums
  with check (created_by = (select auth.uid()));
alter policy albums_update on public.albums
  using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));
alter policy albums_delete on public.albums
  using (created_by = (select auth.uid()));

-- tracks
alter policy tracks_select on public.tracks
  using ((select auth.uid()) is not null);
drop policy if exists tracks_write on public.tracks;
drop policy if exists tracks_insert on public.tracks;
drop policy if exists tracks_update on public.tracks;
drop policy if exists tracks_delete on public.tracks;
create policy tracks_insert on public.tracks for insert
  with check (exists (select 1 from public.albums a
                      where a.id = tracks.album_id and a.created_by = (select auth.uid())));
create policy tracks_update on public.tracks for update
  using (exists (select 1 from public.albums a
                 where a.id = tracks.album_id and a.created_by = (select auth.uid())))
  with check (exists (select 1 from public.albums a
                      where a.id = tracks.album_id and a.created_by = (select auth.uid())));
create policy tracks_delete on public.tracks for delete
  using (exists (select 1 from public.albums a
                 where a.id = tracks.album_id and a.created_by = (select auth.uid())));

-- ratings
alter policy ratings_select on public.ratings
  using (public.can_view_user((select auth.uid()), user_id));
alter policy ratings_insert on public.ratings
  with check (user_id = (select auth.uid()));
alter policy ratings_update on public.ratings
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy ratings_delete on public.ratings
  using (user_id = (select auth.uid()));

-- track_ratings
alter policy track_ratings_select on public.track_ratings
  using (public.can_view_user((select auth.uid()), user_id));
alter policy track_ratings_insert on public.track_ratings
  with check (user_id = (select auth.uid()));
alter policy track_ratings_update on public.track_ratings
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy track_ratings_delete on public.track_ratings
  using (user_id = (select auth.uid()));

-- comments
alter policy comments_select on public.comments
  using (((select auth.uid()) is not null) and (
    ((target_type = 'rating'::comment_target) and exists (
      select 1 from public.ratings r
      where r.id = comments.target_id
        and public.can_view_user((select auth.uid()), r.user_id)))
    or ((target_type = any (array['album'::comment_target, 'track'::comment_target]))
        and public.can_view_user((select auth.uid()), user_id))));
alter policy comments_insert on public.comments
  with check (user_id = (select auth.uid()));
alter policy comments_delete on public.comments
  using (user_id = (select auth.uid()));

-- monthly_favorites
alter policy monthly_favorites_select on public.monthly_favorites
  using (public.can_view_user((select auth.uid()), user_id));
drop policy if exists monthly_favorites_write on public.monthly_favorites;
drop policy if exists monthly_favorites_insert on public.monthly_favorites;
drop policy if exists monthly_favorites_update on public.monthly_favorites;
drop policy if exists monthly_favorites_delete on public.monthly_favorites;
create policy monthly_favorites_insert on public.monthly_favorites for insert
  with check (user_id = (select auth.uid()));
create policy monthly_favorites_update on public.monthly_favorites for update
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy monthly_favorites_delete on public.monthly_favorites for delete
  using (user_id = (select auth.uid()));

-- followed_artists
alter policy followed_artists_select on public.followed_artists
  using ((select auth.uid()) is not null);
alter policy followed_artists_insert on public.followed_artists
  with check (user_id = (select auth.uid()));
alter policy followed_artists_delete on public.followed_artists
  using (user_id = (select auth.uid()));

-- artist_releases
alter policy artist_releases_select on public.artist_releases
  using ((select auth.uid()) is not null);
