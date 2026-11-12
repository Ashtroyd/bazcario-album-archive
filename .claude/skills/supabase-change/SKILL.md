---
name: supabase-change
description: How to change the Bazcario archive's database schema, policies, functions or triggers — writing the migration file, applying it to the live Supabase project, and keeping repo and database in sync. Use for any DDL or RLS change.
---

# Changing the database

Live project: **Bazcarios Album Archive** (`vhdqstmvimxdxenkznte`, eu-central-1).
Use the Supabase MCP tools (`mcp__Supabase__*`; load with ToolSearch).

## Steps

1. **Inspect first**: `list_tables` / `execute_sql` against `pg_policies`,
   `pg_indexes`, `information_schema.columns` for the tables you'll touch.
   The repo's `0001_init.sql` is the baseline but the live DB has drifted
   (e.g. `restrict_album_track_comments_to_friends` was applied without a repo
   file) — trust the live catalog over old migration files.
2. **Write the file** `supabase/migrations/<YYYYMMDDHHMMSS>_<snake_name>.sql`
   (UTC timestamp, same name you'll pass to `apply_migration`). Make it
   idempotent where practical (`if not exists`, `drop policy if exists`).
3. **Every new table** gets `alter table … enable row level security` plus
   explicit policies. House style:
   - read: `using (public.can_view_user(auth.uid(), user_id))` for user-owned
     rows that friends may see; `user_id = auth.uid()` for private ones.
   - write: `with check (user_id = auth.uid())`.
   - Add an index on every foreign key and on `user_id`.
4. **Apply** with `mcp__Supabase__apply_migration` (name without the
   timestamp). Confirm with `list_migrations`.
5. **Check** `get_advisors` (performance) for missing indexes. The owner
   uses the app only with friends and has said security advisor warnings are
   not a priority — mention new ones, don't block on them.
6. **Optional RLS test**: copy the rollback-only pattern in
   `supabase/tests/*.sql` (`begin; … set local role authenticated; … rollback;`)
   and run it via `execute_sql`.
7. Update TypeScript types in `src/lib/types.ts` by hand (there is no codegen
   in this repo) and any README feature notes.

## Don'ts

- Don't write `ratings.overall_rating` from app code — the
  `recalc_overall_rating` trigger owns it.
- Don't run destructive SQL (`drop table`, `delete`, `truncate`) on the live
  project without the user's explicit go-ahead; it holds their real ratings.
- The service-role key bypasses RLS; only `scripts/` and the Spicetify API
  handlers use it (`src/lib/supabase/admin.ts`).
