"use client";

import { useState, useTransition } from "react";
import { createAlbum, lookupCover } from "@/app/actions/albums";
import { CoverImage } from "@/components/CoverImage";

const fileInputCls =
  "block w-full text-xs text-zinc-400 file:mr-2 file:cursor-pointer file:rounded file:border-0 file:bg-zinc-800 file:px-2 file:py-1 file:text-zinc-200";

export function AddAlbumForm() {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [tracks, setTracks] = useState<string[]>(["", "", ""]);
  const [cover, setCover] = useState<string | null>(null);
  const [fetching, startFetch] = useTransition();
  const [fetchMsg, setFetchMsg] = useState<string | null>(null);

  const setTrack = (i: number, v: string) =>
    setTracks((ts) => ts.map((t, idx) => (idx === i ? v : t)));
  const addTrack = () => setTracks((ts) => [...ts, ""]);
  const removeTrack = (i: number) =>
    setTracks((ts) => (ts.length > 1 ? ts.filter((_, idx) => idx !== i) : ts));

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
