-- Applied migration version matches Supabase's recorded history.
create index if not exists albums_created_by_idx on public.albums(created_by);
create index if not exists comments_user_id_idx on public.comments(user_id);
create index if not exists profiles_favorite_track_idx on public.profiles(favorite_track_id);
create index if not exists ratings_favorite_track_idx on public.ratings(favorite_track_id);
create index if not exists ratings_least_favorite_track_idx on public.ratings(least_favorite_track_id);

-- Narrowly fix ratings visibility. Existing friendship/discovery policies remain unchanged.
create or replace function public.can_view_user(viewer uuid, owner_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select viewer = owner_id or exists (
      select 1 from public.profiles p where p.id = owner_id and (
        p.visibility = 'public' or (p.visibility = 'friends' and public.are_friends(viewer, owner_id))
      )
    );
$$;
