"use client";

import { useRef, useState, useTransition } from "react";
import { createAlbum, lookupCover } from "@/app/actions/albums";
import { CoverImage } from "@/components/CoverImage";

type Suggestion = {
  id: number;
  title: string;
  artist: string;
  year: number | null;
  genre: string | null;
  coverUrl: string | null;
};

const fileInputCls =
  "block w-full text-xs text-zinc-400 file:mr-2 file:cursor-pointer file:rounded file:border-0 file:bg-zinc-800 file:px-2 file:py-1 file:text-zinc-200";

export function AddAlbumForm() {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [year, setYear] = useState("");
  const [genre, setGenre] = useState("");
  const [tracks, setTracks] = useState<string[]>(["", "", ""]);
  const [cover, setCover] = useState<string | null>(null);

  // Apple Music search
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loadingPick, setLoadingPick] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Manual cover fallback
  const [fetching, startFetch] = useTransition();
  const [fetchMsg, setFetchMsg] = useState<string | null>(null);

  const setTrack = (i: number, v: string) =>
    setTracks((ts) => ts.map((t, idx) => (idx === i ? v : t)));
  const addTrack = () => setTracks((ts) => [...ts, ""]);
  const removeTrack = (i: number) =>
    setTracks((ts) => (ts.length > 1 ? ts.filter((_, idx) => idx !== i) : ts));

  function onQueryChange(v: string) {
    setQuery(v);
    if (timer.current) clearTimeout(timer.current);
    if (v.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/albums/search?q=${encodeURIComponent(v)}`);
        const data = await res.json();
        setSuggestions(data.results ?? []);
        setOpen(true);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }

  async function pick(s: Suggestion) {
    setOpen(false);
    setQuery("");
    setSuggestions([]);
    setLoadingPick(true);
    // Fill immediately from the suggestion, then enrich with the track list.
    setTitle(s.title);
    setArtist(s.artist);
    setYear(s.year ? String(s.year) : "");
    setGenre(s.genre ?? "");
    setCover(s.coverUrl ?? null);
    try {
      const res = await fetch(`/api/albums/lookup?id=${s.id}`);
      const data = await res.json();
      const album = data.album as (Suggestion & { tracks: string[] }) | null;
      if (album) {
        setTitle(album.title || s.title);
        setArtist(album.artist || s.artist);
        setYear(album.year ? String(album.year) : "");
        setGenre(album.genre ?? "");
        setCover(album.coverUrl ?? s.coverUrl ?? null);
        if (album.tracks?.length) setTracks(album.tracks);
      }
    } catch {
      /* keep the basic suggestion data */
    } finally {
      setLoadingPick(false);
    }
  }

  function fetchCover() {
    setFetchMsg(null);
    startFetch(async () => {
      const url = await lookupCover(title, artist);
      if (url) setCover(url);
      else setFetchMsg("No cover found — try a manual upload.");
    });
  }

  return (
    <form action={createAlbum} className="space-y-6">
      {/* Apple Music search */}
      <div className="relative">
        <label className="label" htmlFor="album-search">
          Search Apple Music
        </label>
        <input
          id="album-search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search for an album to auto-fill details + tracks…"
          autoComplete="off"
          className="input"
        />
        {searching && (
          <span className="absolute top-9 right-3 animate-pulse text-xs text-zinc-500">
            searching…
          </span>
        )}
        {open && suggestions.length > 0 && (
          <ul className="absolute z-30 mt-1 max-h-80 w-full overflow-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl">
            {suggestions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(s)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-zinc-800"
                >
                  <CoverImage
                    url={s.coverUrl}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {s.title}
                    </span>
                    <span className="block truncate text-xs text-zinc-400">
                      {s.artist}
                      {s.year ? ` · ${s.year}` : ""}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {loadingPick && (
          <p className="mt-1 text-xs text-violet-400">Loading album details…</p>
        )}
        <p className="mt-1 text-xs text-zinc-500">
          Or fill everything in manually below.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[200px_1fr]">
        {/* Cover column */}
        <div className="space-y-2">
          <CoverImage
            url={cover}
            alt="cover preview"
            className="aspect-square w-full rounded-xl"
          />
          <input type="hidden" name="cover_url" value={cover ?? ""} />
          <button
            type="button"
            onClick={fetchCover}
            disabled={!title || !artist || fetching}
            className="btn btn-outline w-full"
          >
            {fetching ? "Searching…" : "Fetch cover"}
          </button>
          <div>
            <label className="label">or upload</label>
            <input
              type="file"
              name="cover_file"
              accept="image/*"
              className={fileInputCls}
            />
          </div>
          {fetchMsg && <p className="text-xs text-amber-400">{fetchMsg}</p>}
        </div>

        {/* Fields column */}
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="title">
                Title *
              </label>
              <input
                id="title"
                name="title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="artist">
                Artist *
              </label>
              <input
                id="artist"
                name="artist"
                required
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="release_year">
                Release year
              </label>
              <input
                id="release_year"
                name="release_year"
                inputMode="numeric"
                placeholder="2026"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="genre">
                Genre
              </label>
              <input
                id="genre"
                name="genre"
                placeholder="K-Pop"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="label mb-0">Tracks</span>
              <button
                type="button"
                onClick={addTrack}
                className="text-xs text-violet-400 hover:underline"
              >
                + Add track
              </button>
            </div>
            <div className="space-y-2">
              {tracks.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-6 text-right text-xs text-zinc-500">
                    {i + 1}
                  </span>
                  <input
                    name="track"
                    value={t}
                    onChange={(e) => setTrack(i, e.target.value)}
                    placeholder={`Track ${i + 1}`}
                    className="input"
                  />
                  <button
                    type="button"
                    onClick={() => removeTrack(i)}
                    aria-label="Remove track"
                    className="btn btn-ghost px-2 py-1 text-zinc-500"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button type="submit" className="btn btn-primary">
          Create album
        </button>
      </div>
    </form>
  );
}
