# 🎧 Bazcario's Album Archive

**Live at [bazcario-album-archive.vercel.app](https://bazcario-album-archive.vercel.app)**
— pushes to `main` deploy automatically.

A full-stack web app that replaces a personal album-rating spreadsheet. Rate
albums **track-by-track**, sync across devices via accounts, friend other users,
and compare ratings side-by-side. Ratings are **friends-only by default**,
enforced at the database level with Supabase Row Level Security.

Built with **Next.js 16 (App Router) + React 19 + TypeScript**, **Supabase**
(Postgres, Auth, Storage, RLS), and **Tailwind CSS v4**. Deploys to **Vercel**.

---

## Features

- **Albums & tracks** — add albums (with auto-fetched cover art), per-track
  ratings (0–10, .01 precision), replay value, and notes.
- **Auto overall** — each album's overall score is the average of your track
  ratings, recomputed automatically by a DB trigger.
- **Library** — grid with search (title/artist) and filter/sort by genre, year,
  and your score.
- **Friends** — send/accept/decline requests, search by name or email, view a
  friend's profile and scores (gated by RLS).
- **Compare** — you vs. a friend, track-by-track, with the biggest rating gaps
  highlighted.
- **Comments** — per album (schema supports per-track / per-rating too).
- **Profile** — avatar upload, display name, and stats (avg rating, top genre).
- **Announcements** — follow artists (Spotify search, photo + a MusicBrainz
  type/country/years-active line for disambiguation — Spotify's own
  follower/genre data isn't available on a Developer Mode app) and see their
  new releases in a dedicated feed. A GitHub Actions job checks for new
  releases every 30 minutes. Following is per-user; the release cache is
  shared, so once one person follows an artist everyone sees its history.

---

## Prerequisites

- Node.js 20+ (tested on 22) and npm.
- A free [Supabase](https://supabase.com) project.

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project & add credentials

In the Supabase dashboard, open **Settings → API** and copy the values into a
local env file:

```bash
cp .env.local.example .env.local
```

Fill in:

| Variable | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Settings → API → `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → `service_role` key (server-only; used only by the import script) |
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) → create an app → Settings (Client Credentials flow, no redirect URI needed). Used by Announcements. |

`.env.local` is git-ignored — never commit it.

### 3. Apply the database schema

Open **SQL Editor** in the Supabase dashboard, paste the contents of
[`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), and
**Run**. (Or, with the Supabase CLI: `supabase db push`.)

This creates all tables, enums, the auto-profile and auto-overall triggers, the
friends helper functions, every RLS policy, and the `covers` / `avatars` storage
buckets. The script is idempotent and safe to re-run.

Later migrations (`0002` through `0007`, including the Announcements
feature's `followed_artists` / `artist_releases` tables) live in the same
folder — apply each one the same way, in order.

### 4. (Optional) Enable Google sign-in

Email/password works out of the box. For the **Continue with Google** button:

1. Create an OAuth client in Google Cloud Console.
2. In Supabase: **Authentication → Providers → Google**, paste the client ID/secret.
3. Add `https://<your-project-ref>.supabase.co/auth/v1/callback` as an authorized
   redirect URI in Google, and your app origin under **Authentication → URL
   Configuration**.

> **Tip:** For quick local testing, you can turn off **Authentication → Sign In /
> Providers → Confirm email** so new sign-ups can log in immediately.

### 5. Run the app

```bash
npm run dev
```

Open <http://localhost:3000>, sign up, and start rating.

---

## Importing the spreadsheet

> Optional — only relevant if you're migrating your own existing
> album-rating spreadsheet. Skip this section otherwise; sign up in the app
> and start rating directly.

A one-time importer loads `Bazcario's Album Archive.xlsx` into Supabase.

- **Listener 1** (spreadsheet columns A/B) → your account (`IMPORT_OWNER_EMAIL`).
- **Listener 2** (columns H/I) → a friend placeholder (`IMPORT_FRIEND_EMAIL`).
- Both accounts are created (if missing) and friended automatically.

Set the `IMPORT_*` values in `.env.local`, then:

```bash
# Preview only — parses the spreadsheet, writes scripts/import-report.json,
# and flags anything that needs review. No database writes.
npm run import:dry

# Live — creates users, albums, tracks, and ratings (idempotent).
npm run import
```

The importer **does not guess**. For the bundled data it correctly:

- skips Listener 2's Pureflow Pt.1 ratings (the only value is a corrupt
  spreadsheet serial, not a 0–10 rating);
- flags the `LEMONADE` vs `Lemondade` track-name typo and matches by row
  position instead of merging silently;
- normalizes mixed date formats (`46164` serial and `29.05.2026` text).

After importing, sign in as `IMPORT_OWNER_EMAIL` with `IMPORT_DEFAULT_PASSWORD`
and change the password.

---

## Visibility model (RLS)

- **Albums & tracks** are a shared catalog — any signed-in user can see and rate
  them, so any number of friends can rate the same album.
- **Ratings, track ratings, and profiles** are **friends-only by default**:
  visible to you, your accepted friends, or anyone whose profile is `public`.
- The `profiles.visibility` enum (`friends` | `public` | `private`) and its
  policies are already in place for a future public/private toggle — the UI for
  it is intentionally out of scope for v1.

All of this is enforced in Postgres (see the policies in the migration), not just
in the UI.

---

## Deploy to Vercel

1. Fork or clone this repo, then [import it in Vercel](https://vercel.com/new).
2. Add the env vars `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SPOTIFY_CLIENT_ID`, and `SPOTIFY_CLIENT_SECRET` (the service-role key is
   only needed to run the import locally).
3. In Supabase **Authentication → URL Configuration**, add your Vercel domain to
   the **Site URL** and **Redirect URLs** (and update the Google redirect URI if
   using Google).

### GitHub Actions (Announcements release check)

Add these as repo secrets (Settings → Secrets and variables → Actions):
`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SPOTIFY_CLIENT_ID`,
`SPOTIFY_CLIENT_SECRET`.

[`.github/workflows/check-artist-releases.yml`](.github/workflows/check-artist-releases.yml)
runs every 30 minutes, fetches each followed artist's albums/singles from
Spotify, and caches anything new in `artist_releases`.

---

## Project structure

```
src/
  proxy.ts                     # session refresh + route protection (Next 16 "proxy")
  lib/
    supabase/{client,server,admin,middleware}.ts
    auth.ts  types.ts  utils.ts  coverart.ts  spotify.ts  musicbrainz.ts
  app/
    (auth)/{login,signup}/     # public auth pages
    (app)/                     # protected shell (nav + auth guard)
      page.tsx                 # dashboard
      albums/  album/[id]/  album/new/
      album/[id]/compare/[friendId]/
      friends/  friends/[id]/  profile/  announcements/
    auth/callback/route.ts     # OAuth / email-confirm callback
    actions/                   # server actions (albums, ratings, friends, comments, artists, ...)
  components/                  # UI (AlbumCard, TrackRatingTable, Comments, ...)
supabase/migrations/            # 0001_init.sql, ..., 0007_artist_follows_spotify.sql
scripts/import.ts              # one-time spreadsheet importer
scripts/checkArtistReleases.ts # scheduled job (see GitHub Actions above)
```

## Useful commands

```bash
npm run dev          # start the dev server
npm run build        # production build
npm run lint         # ESLint
npm run import:dry   # preview the spreadsheet import
npm run import       # run the live import
npm run check-artist-releases  # manually run the Announcements release check
```
