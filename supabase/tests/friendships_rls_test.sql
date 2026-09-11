BEGIN;
SELECT plan(12);

SELECT ok(
  (SELECT roles = ARRAY['authenticated']::name[]
   FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename = 'friendships'
     AND policyname = 'friendships_select'),
  'friendship reads are limited to authenticated users'
);

SELECT ok(
  (SELECT roles = ARRAY['authenticated']::name[]
   FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename = 'friendships'
     AND policyname = 'friendships_insert'),
  'friendship inserts are limited to authenticated users'
);

SELECT ok(
  (SELECT with_check ILIKE '%status = ''pending''%'
   FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename = 'friendships'
     AND policyname = 'friendships_insert'),
  'new friendship rows must be pending'
);

SELECT ok(
  (SELECT roles = ARRAY['authenticated']::name[]
   FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename = 'friendships'
     AND policyname = 'friendships_update'),
  'friendship updates are limited to authenticated users'
);

SELECT ok(
  (SELECT qual ILIKE '%status = ''pending''%'
          AND with_check ILIKE '%status = ''accepted''%'
   FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename = 'friendships'
     AND policyname = 'friendships_update'),
  'only pending-to-accepted friendship updates are allowed'
);

SELECT ok(
  (SELECT roles = ARRAY['authenticated']::name[]
   FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename = 'friendships'
     AND policyname = 'friendships_delete'),
  'friendship deletes are limited to authenticated users'
);

SELECT ok(
  has_table_privilege('authenticated', 'public.friendships', 'SELECT'),
  'authenticated users retain friendship read access'
);

SELECT ok(
  has_table_privilege('authenticated', 'public.friendships', 'DELETE'),
  'authenticated users retain friendship delete access'
);

SELECT ok(
  has_column_privilege('authenticated', 'public.friendships', 'user_id', 'INSERT')
  AND has_column_privilege('authenticated', 'public.friendships', 'friend_id', 'INSERT')
  AND NOT has_column_privilege('authenticated', 'public.friendships', 'status', 'INSERT'),
  'requesters can insert participants but cannot choose the initial status'
);

SELECT ok(
  has_column_privilege('authenticated', 'public.friendships', 'status', 'UPDATE'),
  'recipients can update friendship status'
);

SELECT ok(
  NOT has_column_privilege('authenticated', 'public.friendships', 'user_id', 'UPDATE')
  AND NOT has_column_privilege('authenticated', 'public.friendships', 'friend_id', 'UPDATE')
  AND NOT has_column_privilege('authenticated', 'public.friendships', 'created_at', 'UPDATE'),
  'friendship ownership and creation time cannot be updated through the API'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'public.friendships'::regclass
      AND tgname = 'friendships_enforce_state_transition'
      AND NOT tgisinternal
  ),
  'the friendship state-transition trigger is installed'
);

SELECT * FROM finish();
ROLLBACK;
