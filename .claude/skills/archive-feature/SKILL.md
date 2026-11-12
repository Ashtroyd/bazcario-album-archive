---
name: archive-feature
description: Conventions for adding or changing pages, server actions, API routes and UI in the Bazcario album archive (Next.js 16 App Router + Supabase + Tailwind v4). Use before writing any feature code in src/.
---

# Building features in the archive

This is **Next.js 16** — read the matching guide in `node_modules/next/dist/docs/`
before using an API you haven't checked in this repo. Known differences that
bite:

- Route guard lives in `src/proxy.ts` (the old `middleware` convention) and
  calls `src/lib/supabase/middleware.ts`. Anything not in `PUBLIC_PATHS` there
  redirects signed-out users to `/login` — including `/api/*` routes.
- `params` and `searchParams` are **Promises**: `const { id } = await params`.
- `next/image`: `priority` is deprecated → use `preload`.

## Where things go

| Kind | Location | Notes |
| --- | --- | --- |
| Signed-in page | `src/app/(app)/<route>/page.tsx` | The `(app)` layout already requires a user and renders nav. Server component by default. |
| Auth page | `src/app/(auth)/…` | |
| Mutation | `src/app/actions/<area>.ts` | `"use server"`; get the user with `supabase.auth.getUser()`; return `{ ok: true } \| { ok: false, error }` with friendly copy; `revalidatePath` every page that shows the data. |
| JSON / file endpoint | `src/app/api/<name>/route.ts` | Check the user yourself and return 401. |
| Pure logic | `src/lib/<thing>.ts` + `<thing>.test.ts` | Keep Supabase out so it's testable (see `stats.ts`, `export.ts`, `notification-rules.ts`). |
| Data loading helper | `src/lib/<thing>-data.ts` | Takes a `SupabaseClient`; tests use a fake query builder (see `listening-queue-data.test.ts`). |
| Component | `src/components/`; group a big one's parts in a subfolder (`track-rating/`, `song-ratings/`, `compare/`) | Aim for files under ~350 lines. |

## Page checklist

1. **Title**: `export const metadata: Metadata = { title: "X" }` — the root
   layout's template turns it into `X · Album Archive`. Dynamic routes use
   `generateMetadata` with the cached helpers in `src/lib/page-metadata.ts`.
   Client-component pages get the title from a tiny `layout.tsx` beside them.
2. **Data**: `const supabase = await createClient()` from
   `@/lib/supabase/server`. RLS decides visibility — don't re-implement
   friend checks in TypeScript; just query and render what comes back.
3. **Bounded queries**: avoid `.in(col, hugeList)` built from a whole library
   (URL length limit). Scan recent rows with `.order().limit()` and filter in
   memory, as `src/lib/notifications.ts` does.
4. **Covers**: always `<CoverImage>`; pass `sizes={COVER_SIZES.grid|hero}` for
   anything bigger than a thumbnail. New image hosts must be added to both
   `next.config.ts` `images.remotePatterns` **and** `isProviderCoverUrl` in
   `src/lib/coverUrl.ts`, or they fall back to an unoptimised `<img>`.
5. **Navigation**: main tabs are in `AppNav.tsx` + `BottomNav.tsx` (keep them in
   sync); secondary pages go in `AccountMenu.tsx` and/or as buttons on Profile.

## UI vocabulary

Tailwind v4 with theme tokens from `src/app/globals.css`: colours `ink`,
`body`, `muted`, `paper`, `surface`, `ivory`, `line`, `accent`, `sage`, `star`.
Reusable classes: `card`, `surface-panel`, `surface-item`, `btn btn-primary`,
`btn btn-outline`, `btn btn-ghost`, `input`, `label`, `eyebrow`. Headings use
`font-serif`. Scores: `<ScoreBadge>`, `formatScore`, `scoreColor`. Bar charts:
`<StatBars>`. Respect `motion-reduce:` on animations and give icon-only buttons
an `aria-label`.

## Domain facts

- Scores are 0–10 with two decimals. An album's `ratings.overall_rating` is
  **computed by a DB trigger** from that user's `track_ratings` — never write it.
- Standalone songs (`songs` / `song_ratings`) never affect album averages.
- `comments` are polymorphic: `target_type` ∈ album | track | rating,
  `target_id` is the row id. Use `<Comments>` (server) or `<CommentsThread>`
  (client).
- Profile `visibility` (friends | public | private) gates what others see via
  the `can_view_user` SQL function.

Finish with the `verify-archive` skill.
