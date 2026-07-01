/**
 * One-time importer for "Bazcario's Album Archive.xlsx".
 *
 *   npm run import:dry   # parse + write report, NO database writes
 *   npm run import       # parse + write to Supabase (needs .env.local)
 *
 * Flags:
 *   --dry-run            parse only, no DB
 *   --file <path>        override the spreadsheet path
 *
 * Listener 1 (columns A/B) -> owner account (IMPORT_OWNER_EMAIL).
 * Listener 2 (columns H/I) -> friend placeholder (IMPORT_FRIEND_EMAIL).
 * The two accounts are created (if missing) and friended automatically.
 *
 * Everything that can't be parsed cleanly is collected in scripts/import-report.json
 * and printed at the end — nothing is guessed or silently merged.
 */
import { config as loadEnv } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fetchCoverArt } from "../src/lib/coverart";
import { extractColors } from "../src/lib/palette";

loadEnv({ path: resolve(process.cwd(), ".env.local") });

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
const DRY_RUN = argv.includes("--dry-run");
const fileFlagIdx = argv.indexOf("--file");
const XLSX_PATH = resolve(
  process.cwd(),
  fileFlagIdx >= 0 && argv[fileFlagIdx + 1]
    ? argv[fileFlagIdx + 1]
    : process.env.IMPORT_XLSX_PATH || "../Downloads/Bazcario's Album Archive.xlsx",
);

const REPLAY_VALUES = ["Low", "Medium", "High", "Very High"] as const;
type ReplayValue = (typeof REPLAY_VALUES)[number];

const SKIP_SHEETS = new Set(["Template", "Home"]);

// ---------------------------------------------------------------------------
// Report collection
// ---------------------------------------------------------------------------
type Flag = {
  level: "warn" | "info";
  album: string;
  listener?: "Listener 1" | "Listener 2";
  track?: string;
  message: string;
};
const flags: Flag[] = [];
const flag = (f: Flag) => flags.push(f);

// ---------------------------------------------------------------------------
// Cell helpers
// ---------------------------------------------------------------------------
const COL: Record<string, number> = {
  A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6, H: 7, I: 8, J: 9, K: 10,
};
type Row = unknown[];
const cell = (rows: Row[], r1: number, colLetter: string): unknown => {
  const row = rows[r1 - 1];
  if (!row) return undefined;
  return row[COL[colLetter]];
};
const str = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
};

/** Excel serial date -> "YYYY-MM-DD" (UTC). */
function excelSerialToISO(serial: number): string {
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  return new Date(ms).toISOString().slice(0, 10);
}

/** Normalize a first-listen-date cell (Date | "DD.MM.YYYY" | serial number). */
function parseDate(v: unknown, ctx: Omit<Flag, "level" | "message">): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    return excelSerialToISO(v);
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/); // DD.MM.YYYY
  if (m) {
    const [, dd, mm, yyyy] = m;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  flag({ level: "warn", ...ctx, message: `Unparseable date "${s}" — left blank.` });
  return null;
}

function parseReplay(v: unknown, ctx: Omit<Flag, "level" | "message">): ReplayValue | null {
  const s = str(v);
  if (!s) return null;
  const found = REPLAY_VALUES.find((rv) => rv.toLowerCase() === s.toLowerCase());
  if (found) return found;
  flag({ level: "warn", ...ctx, message: `Unknown replay value "${s}" — left blank.` });
  return null;
}

function parseRating(
  v: unknown,
  ctx: Omit<Flag, "level" | "message">,
): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  if (!Number.isFinite(n)) {
    flag({ level: "warn", ...ctx, message: `Non-numeric rating "${String(v)}" — skipped.` });
    return null;
  }
  if (n < 0 || n > 10) {
    flag({
      level: "warn",
      ...ctx,
      message: `Rating ${n} is out of range [0,10] (looks like a spreadsheet formula/serial error) — skipped.`,
    });
    return null;
  }
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------
type ListenerTrack = {
  rating: number | null;
  replay: ReplayValue | null;
  notes: string | null;
  rawName: string | null;
};
type ParsedTrack = {
  order: number;
  name: string; // canonical (Listener 1 wins)
  l1: ListenerTrack | null;
  l2: ListenerTrack | null;
};
type ListenerMeta = {
  first_listen_date: string | null;
  favoriteRaw: string | null;
  leastRaw: string | null;
  notes: string | null;
};
type ParsedAlbum = {
  sheet: string;
  title: string;
  artist: string;
  release_year: number | null;
  genre: string | null;
  l1Meta: ListenerMeta;
  l2Meta: ListenerMeta;
  tracks: ParsedTrack[];
};

function parseListenerMeta(
  rows: Row[],
  labelCol: string,
  valCol: string,
  album: string,
  listener: "Listener 1" | "Listener 2",
): ListenerMeta {
  return {
    first_listen_date: parseDate(cell(rows, 6, valCol), { album, listener }),
    favoriteRaw: str(cell(rows, 7, valCol)),
    leastRaw: str(cell(rows, 8, valCol)),
    notes: str(cell(rows, 9, valCol)),
  };
}

function parseAlbumSheet(sheetName: string, rows: Row[]): ParsedAlbum {
  const album = sheetName;

  // Header block: Listener 1 in B (label A), Listener 2 in I (label H).
  const title = str(cell(rows, 1, "B")) ?? str(cell(rows, 1, "I")) ?? sheetName;
  const artist = str(cell(rows, 2, "B")) ?? str(cell(rows, 2, "I")) ?? "Unknown";
  const yearRaw = cell(rows, 3, "B") ?? cell(rows, 3, "I");
  const release_year =
    yearRaw != null && Number.isFinite(Number(yearRaw)) ? Number(yearRaw) : null;
  const genre = str(cell(rows, 4, "B")) ?? str(cell(rows, 4, "I"));

  const l1Meta = parseListenerMeta(rows, "A", "B", album, "Listener 1");
  const l2Meta = parseListenerMeta(rows, "H", "I", album, "Listener 2");

  // Track rows start at spreadsheet row 13.
  const tracks: ParsedTrack[] = [];
  let order = 0;
  for (let r = 13; r <= rows.length; r++) {
    const l1Name = str(cell(rows, r, "A"));
    const l2Name = str(cell(rows, r, "H"));
    if (!l1Name && !l2Name) continue; // truly empty row

    order += 1;
    const canonical = l1Name ?? l2Name!;

    // Flag track-name mismatches between the two listeners (match by POSITION).
    if (l1Name && l2Name && l1Name.toLowerCase() !== l2Name.toLowerCase()) {
      flag({
        level: "warn",
        album,
        track: `row ${r}`,
        message: `Track name mismatch — Listener 1 "${l1Name}" vs Listener 2 "${l2Name}". Matched by row position; using "${l1Name}". Please verify.`,
      });
    }

    const l1: ListenerTrack | null = l1Name
      ? {
          rating: parseRating(cell(rows, r, "B"), {
            album,
            listener: "Listener 1",
            track: canonical,
          }),
          replay: parseReplay(cell(rows, r, "C"), {
            album,
            listener: "Listener 1",
            track: canonical,
          }),
          notes: str(cell(rows, r, "D")),
          rawName: l1Name,
        }
      : null;

    const l2: ListenerTrack | null = l2Name
      ? {
          rating: parseRating(cell(rows, r, "I"), {
            album,
            listener: "Listener 2",
            track: canonical,
          }),
          replay: parseReplay(cell(rows, r, "J"), {
            album,
            listener: "Listener 2",
            track: canonical,
          }),
          notes: str(cell(rows, r, "K")),
          rawName: l2Name,
        }
      : null;

    tracks.push({ order, name: canonical, l1, l2 });
  }

  return { sheet: sheetName, title, artist, release_year, genre, l1Meta, l2Meta, tracks };
}

/** Resolve a free-text favorite/least cell to a single track id by name. */
function resolveTrackByName(
  raw: string | null,
  trackIdByName: Map<string, string>,
  ctx: Omit<Flag, "level" | "message">,
  kind: "favorite" | "least favorite",
): string | null {
  if (!raw) return null;
  const parts = raw.split(/[,;\n]/).map((p) => p.trim()).filter(Boolean);
  for (const p of parts) {
    const id = trackIdByName.get(p.toLowerCase());
    if (id) return id;
  }
  flag({
    level: "warn",
    ...ctx,
    message: `Could not match ${kind} track "${raw}" to a track on this album — left blank.`,
  });
  return null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`\n📀 Bazcario import  (${DRY_RUN ? "DRY RUN — no DB writes" : "LIVE"})`);
  console.log(`   Source: ${XLSX_PATH}\n`);

  const wb = XLSX.readFile(XLSX_PATH, { cellDates: true });
  const albums: ParsedAlbum[] = [];
  for (const sheetName of wb.SheetNames) {
    if (SKIP_SHEETS.has(sheetName)) continue;
    const rows = XLSX.utils.sheet_to_json<Row>(wb.Sheets[sheetName], {
      header: 1,
      raw: true,
      blankrows: true,
      defval: null,
    });
    albums.push(parseAlbumSheet(sheetName, rows));
  }

  // Decide, per album, which listeners have any valid track ratings.
  const listenerHasData = (a: ParsedAlbum, who: "l1" | "l2") =>
    a.tracks.some((t) => t[who] && t[who]!.rating !== null);

  for (const a of albums) {
    for (const [who, label] of [
      ["l1", "Listener 1"],
      ["l2", "Listener 2"],
    ] as const) {
      if (!listenerHasData(a, who)) {
        flag({
          level: "info",
          album: a.title,
          listener: label,
          message: `No valid track ratings — skipping this listener's rating for "${a.title}".`,
        });
      }
    }
  }

  // ---- Build the report (always) ----
  const report = {
    generatedAt: new Date().toISOString(),
    dryRun: DRY_RUN,
    source: XLSX_PATH,
    albums: albums.map((a) => ({
      title: a.title,
      artist: a.artist,
      release_year: a.release_year,
      genre: a.genre,
      tracks: a.tracks.length,
      listener1Ratings: a.tracks.filter((t) => t.l1 && t.l1.rating !== null).length,
      listener2Ratings: a.tracks.filter((t) => t.l2 && t.l2.rating !== null).length,
    })),
    flags,
    summary: {
      albums: albums.length,
      tracks: albums.reduce((n, a) => n + a.tracks.length, 0),
      warnings: flags.filter((f) => f.level === "warn").length,
    },
  };
  const reportPath = resolve(process.cwd(), "scripts/import-report.json");
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // ---- Print a human summary ----
  for (const a of report.albums) {
    console.log(
      `  • ${a.title} — ${a.artist} (${a.release_year ?? "?"}, ${a.genre ?? "?"}): ` +
        `${a.tracks} tracks, L1 ${a.listener1Ratings} ratings, L2 ${a.listener2Ratings} ratings`,
    );
  }
  if (flags.length) {
    console.log(`\n  ⚠️  ${flags.length} item(s) flagged for review:`);
    for (const f of flags) {
      const where = [f.album, f.listener, f.track].filter(Boolean).join(" / ");
      console.log(`     - [${f.level}] ${where}: ${f.message}`);
    }
  }
  console.log(`\n  📝 Report written to ${reportPath}`);

  if (DRY_RUN) {
    console.log("\n✅ Dry run complete. No database changes made.\n");
    return;
  }

  // -------------------------------------------------------------------------
  // LIVE: write to Supabase using the service-role admin client.
  // -------------------------------------------------------------------------
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createClient<any>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const ownerId = await ensureUser(
    db,
    process.env.IMPORT_OWNER_EMAIL || "owner@example.com",
    process.env.IMPORT_OWNER_NAME || "Bazcario",
  );
  const friendId = await ensureUser(
    db,
    process.env.IMPORT_FRIEND_EMAIL || "friend@example.com",
    process.env.IMPORT_FRIEND_NAME || "Listener Two",
  );
  await ensureFriendship(db, ownerId, friendId);
  console.log(`\n  👤 Owner (Listener 1): ${ownerId}`);
  console.log(`  👤 Friend (Listener 2): ${friendId}`);

  for (const a of albums) {
    const albumId = await upsertAlbum(db, a, ownerId);
    const trackIdByOrder = new Map<number, string>();
    const trackIdByName = new Map<string, string>();
    for (const t of a.tracks) {
      const id = await upsertTrack(db, albumId, t);
      trackIdByOrder.set(t.order, id);
      trackIdByName.set(t.name.toLowerCase(), id);
    }

    await importListener(db, a, "l1", a.l1Meta, ownerId, trackIdByOrder, trackIdByName);
    await importListener(db, a, "l2", a.l2Meta, friendId, trackIdByOrder, trackIdByName);
    console.log(`  ✓ Imported "${a.title}" (${a.tracks.length} tracks)`);
  }

  console.log("\n✅ Live import complete.\n");
}

// ---------------------------------------------------------------------------
// DB helpers (live mode)
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, any, any>;

async function ensureUser(db: DB, email: string, displayName: string): Promise<string> {
  // Find existing by email (paginate through the admin list).
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find(
      (u) => (u.email ?? "").toLowerCase() === email.toLowerCase(),
    );
    if (hit) {
      await db.from("profiles").update({ display_name: displayName }).eq("id", hit.id);
      return hit.id;
    }
    if (data.users.length < 200) break;
  }
  const password = process.env.IMPORT_DEFAULT_PASSWORD || "ChangeMe-1234";
  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (error || !data.user) throw error ?? new Error(`Failed to create user ${email}`);
  await db.from("profiles").update({ display_name: displayName }).eq("id", data.user.id);
  return data.user.id;
}

async function ensureFriendship(db: DB, a: string, b: string) {
  const { data } = await db
    .from("friendships")
    .select("id")
    .or(
      `and(user_id.eq.${a},friend_id.eq.${b}),and(user_id.eq.${b},friend_id.eq.${a})`,
    )
    .maybeSingle();
  if (data) {
    await db.from("friendships").update({ status: "accepted" }).eq("id", data.id);
    return;
  }
  await db.from("friendships").insert({ user_id: a, friend_id: b, status: "accepted" });
}

async function upsertAlbum(db: DB, a: ParsedAlbum, ownerId: string): Promise<string> {
  const { data: existing } = await db
    .from("albums")
    .select("id, cover_image_url")
    .eq("title", a.title)
    .eq("artist", a.artist)
    .maybeSingle();

  // Fetch cover art from MusicBrainz / Cover Art Archive if we don't have one.
  let cover: string | null = existing?.cover_image_url ?? null;
  if (!cover) {
    cover = await fetchCoverArt(a.title, a.artist);
    console.log(
      cover
        ? `     🎨 cover found for "${a.title}"`
        : `     (no cover found for "${a.title}" — upload manually later)`,
    );
  }

  let albumId: string;
  if (existing) {
    await db
      .from("albums")
      .update({
        release_year: a.release_year,
        genre: a.genre,
        cover_image_url: cover,
      })
      .eq("id", existing.id);
    albumId = existing.id as string;
  } else {
    const { data, error } = await db
      .from("albums")
      .insert({
        title: a.title,
        artist: a.artist,
        release_year: a.release_year,
        genre: a.genre,
        cover_image_url: cover,
        created_by: ownerId,
      })
      .select("id")
      .single();
    if (error || !data)
      throw error ?? new Error(`Failed to insert album ${a.title}`);
    albumId = data.id as string;
  }

  // Best-effort: cache the cover color palette (skipped if the column is absent).
  if (cover) {
    const colors = await extractColors(cover);
    if (colors) {
      await db.from("albums").update({ cover_colors: colors }).eq("id", albumId);
    }
  }
  return albumId;
}

async function upsertTrack(db: DB, albumId: string, t: ParsedTrack): Promise<string> {
  const { data, error } = await db
    .from("tracks")
    .upsert(
      { album_id: albumId, name: t.name, track_order: t.order },
      { onConflict: "album_id,track_order" },
    )
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error(`Failed to upsert track ${t.name}`);
  return data.id as string;
}

async function importListener(
  db: DB,
  a: ParsedAlbum,
  who: "l1" | "l2",
  meta: ListenerMeta,
  userId: string,
  trackIdByOrder: Map<number, string>,
  trackIdByName: Map<string, string>,
) {
  const hasData = a.tracks.some((t) => t[who] && t[who]!.rating !== null);
  if (!hasData) return; // skipped + already flagged

  // Upsert each valid track rating (the DB trigger maintains overall_rating).
  for (const t of a.tracks) {
    const lt = t[who];
    if (!lt || lt.rating === null) continue;
    const trackId = trackIdByOrder.get(t.order)!;
    await db.from("track_ratings").upsert(
      {
        track_id: trackId,
        user_id: userId,
        rating: lt.rating,
        replay_value: lt.replay,
        notes: lt.notes,
      },
      { onConflict: "track_id,user_id" },
    );
  }

  // Upsert the rating metadata row (overall is set by the trigger above).
  const listenerLabel = who === "l1" ? "Listener 1" : "Listener 2";
  const favoriteId = resolveTrackByName(
    meta.favoriteRaw,
    trackIdByName,
    { album: a.title, listener: listenerLabel },
    "favorite",
  );
  const leastId = resolveTrackByName(
    meta.leastRaw,
    trackIdByName,
    { album: a.title, listener: listenerLabel },
    "least favorite",
  );
  const { data: albumRow } = await db
    .from("tracks")
    .select("album_id")
    .eq("id", trackIdByOrder.get(a.tracks[0].order)!)
    .single();
  const albumId = albumRow!.album_id as string;

  await db.from("ratings").upsert(
    {
      album_id: albumId,
      user_id: userId,
      first_listen_date: meta.first_listen_date,
      favorite_track_id: favoriteId,
      least_favorite_track_id: leastId,
      notes: meta.notes,
    },
    { onConflict: "album_id,user_id" },
  );
}

main().catch((err) => {
  console.error("\n❌ Import failed:", err);
  process.exit(1);
});
