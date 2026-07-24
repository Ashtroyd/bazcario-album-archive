"use client";

import { useState, useTransition } from "react";
import {
  searchArtistsAction,
  followArtist,
  type ArtistSearchResult,
} from "@/app/actions/artists";
import { Avatar } from "@/components/Avatar";

const regionNames = typeof Intl.DisplayNames !== "undefined" ? new Intl.DisplayNames(["en"], { type: "region" }) : null;

function formatMeta(meta: ArtistSearchResult["meta"]): string | null {
  if (!meta) return null;
  const parts: string[] = [];
  if (meta.type) parts.push(meta.type);
  const country = meta.country ? (regionNames?.of(meta.country) ?? meta.country) : null;
  if (country) parts.push(country);
  if (meta.beginYear) parts.push(meta.endYear ? `${meta.beginYear}–${meta.endYear}` : `${meta.beginYear}–present`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function ArtistFollowSearch({ followedIds }: { followedIds: string[] }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ArtistSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [pending, startSearch] = useTransition();
  const [followed, setFollowed] = useState<Set<string>>(new Set(followedIds));
  const [, startFollow] = useTransition();

  function doSearch(e: React.FormEvent) {
    e.preventDefault();
    startSearch(async () => {
      const r = await searchArtistsAction(q);
      setResults(r);
      setSearched(true);
    });
  }

  function follow(a: ArtistSearchResult) {
    setFollowed((prev) => new Set(prev).add(a.id));
    startFollow(async () => {
      const fd = new FormData();
      fd.set("spotify_artist_id", a.id);
      fd.set("name", a.name);
      await followArtist(fd);
    });
  }

  return (
    <div className="card space-y-3">
      <h2 className="text-sm font-semibold text-ink">Follow an artist</h2>
      <form onSubmit={doSearch} className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search for an artist…"
          className="input"
        />
        <button
          type="submit"
          disabled={pending || q.trim().length < 2}
          className="btn btn-outline whitespace-nowrap"
        >
          {pending ? "Searching…" : "Search"}
        </button>
      </form>

      {searched && results.length === 0 && (
        <p className="text-sm text-muted">No artists found.</p>
      )}

      {results.length > 0 && (
        <ul className="space-y-2">
          {results.map((a) => {
            const isFollowed = followed.has(a.id);
            const meta = formatMeta(a.meta);
            return (
              <li key={a.id} className="flex items-center gap-3">
                <Avatar url={a.imageUrl} name={a.name} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{a.name}</p>
                  {meta && <p className="truncate text-xs text-muted">{meta}</p>}
                </div>
                <button
                  type="button"
                  disabled={isFollowed}
                  onClick={() => follow(a)}
                  className="btn btn-primary shrink-0 px-3 py-1 text-xs disabled:opacity-60"
                >
                  {isFollowed ? "Following" : "Follow"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
