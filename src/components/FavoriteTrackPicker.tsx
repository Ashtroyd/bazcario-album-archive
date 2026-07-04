"use client";

import { setFavoriteTrack } from "@/app/actions/profile";

type T = { id: string; name: string; album: string | null };

export function FavoriteTrackPicker({
  tracks,
  current,
}: {
  tracks: T[];
  current: string | null;
}) {
  const groups = new Map<string, T[]>();
  for (const t of tracks) {
    const key = t.album ?? "Other";
    const arr = groups.get(key) ?? [];
    arr.push(t);
    groups.set(key, arr);
  }

  return (
    <form action={setFavoriteTrack}>
      <select
        name="favorite_track_id"
        defaultValue={current ?? ""}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="input mt-1"
        aria-label="Pick your favourite track"
      >
        <option value="">— pick a track —</option>
        {[...groups.entries()].map(([album, ts]) => (
          <optgroup key={album} label={album}>
            {ts.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </form>
  );
}
