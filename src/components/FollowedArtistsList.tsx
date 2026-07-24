"use client";

import { useOptimistic, useTransition } from "react";
import { unfollowArtist } from "@/app/actions/artists";

export type FollowedArtistRow = { id: string; name: string };

export function FollowedArtistsList({ artists }: { artists: FollowedArtistRow[] }) {
  const [optimisticArtists, removeOptimistic] = useOptimistic(
    artists,
    (state, id: string) => state.filter((a) => a.id !== id),
  );
  const [, startTransition] = useTransition();

  function unfollow(id: string) {
    startTransition(async () => {
      removeOptimistic(id);
      const fd = new FormData();
      fd.set("id", id);
      await unfollowArtist(fd);
    });
  }

  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">
        Following ({optimisticArtists.length})
      </h2>
      {optimisticArtists.length === 0 ? (
        <p className="text-sm text-muted">Not following any artists yet. Search above to add some.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {optimisticArtists.map((a) => (
            <span key={a.id} className="chip flex items-center gap-2">
              {a.name}
              <button
                type="button"
                onClick={() => unfollow(a.id)}
                aria-label={`Unfollow ${a.name}`}
                className="text-muted hover:text-accent"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
