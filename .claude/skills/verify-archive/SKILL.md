---
name: verify-archive
description: Run the full check suite for the Bazcario album archive (type check, lint, unit tests, production build, Spicetify build) and report results. Use after any code change, before committing, or when asked "is everything working?".
---

# Verify the archive

Run from the repo root. Every step must pass before you commit; CI
(`.github/workflows/ci.yml`) runs the same steps on every push.

```bash
[ -d node_modules ] || npm ci
npx tsc --noEmit
npm run lint
npm test
npm run build
npm run spicetify:build
```

## What "passing" looks like

- `tsc` and `lint`: no output besides the npm banner. Treat lint **warnings**
  as failures too — the tree is currently warning-free.
- `npm test`: `# fail 0`. Tests use `node:test` via `tsx --test src/**/*.test.ts`,
  so a new test file only runs if it matches that glob (lives under `src/`,
  ends in `.test.ts`).
- `npm run build`: lists every route. No Supabase env vars are needed to build;
  pages are dynamic (`ƒ`) and only touch Supabase at request time.
- `spicetify:build` rewrites `spicetify-extension/dist/album-archive.js`. If
  `git status` shows it changed, the extension source changed — commit it.

## What this can't check

The app needs a signed-in Supabase session to render anything behind
`src/app/(app)`. This container has no `.env.local`, so don't claim a page
"works" from a green build alone. For data-level confidence use the
`live-data-check` skill; for UI, say plainly that it wasn't clicked through.

## Report format

A short table: check → ✅/❌, plus the first error lines for any failure.
