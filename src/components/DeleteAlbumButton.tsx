"use client";

import { deleteAlbum } from "@/app/actions/albums";

export function DeleteAlbumButton({ albumId }: { albumId: string }) {
  return (
    <form
      action={deleteAlbum}
      onSubmit={(e) => {
        if (!confirm("Delete this album for everyone? This cannot be undone.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={albumId} />
      <button type="submit" className="btn btn-danger px-3 py-1.5 text-sm">
        Delete
      </button>
    </form>
  );
}
