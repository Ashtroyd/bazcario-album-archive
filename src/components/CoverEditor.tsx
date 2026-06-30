"use client";

import { useState } from "react";
import { updateAlbumCover } from "@/app/actions/albums";

export function CoverEditor({ albumId }: { albumId: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 text-xs text-zinc-400 hover:text-white"
      >
        Change cover
      </button>
    );
  }

  return (
    <form action={updateAlbumCover} className="mt-2 space-y-2">
      <input type="hidden" name="album_id" value={albumId} />
      <input
        type="file"
        name="cover_file"
        accept="image/*"
        className="block w-full text-xs text-zinc-400 file:mr-2 file:cursor-pointer file:rounded file:border-0 file:bg-zinc-800 file:px-2 file:py-1 file:text-zinc-200"
      />
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary px-3 py-1 text-xs">
          Save
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn btn-ghost px-3 py-1 text-xs"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
