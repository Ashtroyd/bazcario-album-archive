"use client";

import { useState, useTransition } from "react";
import { searchArtistsAction, followArtist } from "@/app/actions/artists";
import type { ArtistResult } from "@/lib/musicbrainz";

export function ArtistFollowSearch({ followedMbids }: { followedMbids: string[] }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ArtistResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [pending, startSearch] = useTransition();
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set(followedMbids));
  const [, startFollow] = useTransition();

  function doSearch(e: React.FormEvent) {
    e.preventDefault();
    startSearch(async () => {
      const r = await searchArtistsAction(q);
      setResults(r);
      setSearched(true);
    });
  }

  function follow(a: ArtistResult) {
    setFollowedIds((prev) => new Set(prev).add(a.mbid));
    startFollow(async () => {
      const fd = new FormData();
      fd.set("mbid", a.mbid);
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
            const isFollowed = followedIds.has(a.mbid);
            return (
              <li key={a.mbid} className="flex items-center gap-2">
                <span className="text-sm text-body">
                  {a.name}
                  {a.disambiguation && (
                    <span className="ml-1 text-xs text-muted">({a.disambiguation})</span>
                  )}
                </span>
                <button
                  type="button"
                  disabled={isFollowed}
                  onClick={() => follow(a)}
                  className="btn btn-primary ml-auto px-3 py-1 text-xs disabled:opacity-60"
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
