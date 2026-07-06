"use client";

import { useEffect, useRef, useState } from "react";
import { deleteAlbum, updateAlbumCover } from "@/app/actions/albums";
import {
  IconEllipsis,
  IconShare,
  IconImage,
  IconTrash,
} from "@/components/icons";

/**
 * Quiet "⋯" menu for album actions (Share card / Change cover / Delete),
 * keeping destructive actions out of the hero per platform conventions.
 */
export function AlbumActionsMenu({
  albumId,
  title,
  isOwner,
}: {
  albumId: string;
  title: string;
  isOwner: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const coverFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  async function shareCard() {
    setOpen(false);
    setBusy(true);
    try {
      const res = await fetch(`/album/${albumId}/card`);
      const blob = await res.blob();
      const file = new File([blob], `${title}-rating.png`, {
        type: "image/png",
      });
      const nav = navigator as Navigator & {
        canShare?: (data?: ShareData) => boolean;
      };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: `${title} — my rating` });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${title}-rating.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      /* user cancelled or share failed — no-op */
    } finally {
      setBusy(false);
    }
  }

  const itemCls =
    "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-zinc-200 transition hover:bg-zinc-800";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Album actions"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80 backdrop-blur transition hover:bg-white/20"
      >
        <IconEllipsis size={20} />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1.5 w-48 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 py-1 shadow-2xl">
          <button type="button" onClick={shareCard} disabled={busy} className={itemCls}>
            <IconShare size={16} className="text-zinc-400" />
            {busy ? "Preparing…" : "Share card"}
          </button>

          {isOwner && (
            <>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className={itemCls}
              >
                <IconImage size={16} className="text-zinc-400" />
                Change cover
              </button>
              <div className="my-1 h-px bg-zinc-800" />
              <form
                action={deleteAlbum}
                onSubmit={(e) => {
                  if (
                    !confirm(
                      "Delete this album for everyone? This cannot be undone.",
                    )
                  ) {
                    e.preventDefault();
                  }
                  setOpen(false);
                }}
              >
                <input type="hidden" name="id" value={albumId} />
                <button
                  type="submit"
                  className={`${itemCls} text-red-400 hover:bg-red-950/40`}
                >
                  <IconTrash size={16} />
                  Delete album
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* Hidden cover-upload form, triggered from the menu. */}
      {isOwner && (
        <form ref={coverFormRef} action={updateAlbumCover} className="hidden">
          <input type="hidden" name="album_id" value={albumId} />
          <input
            ref={fileRef}
            type="file"
            name="cover_file"
            accept="image/*"
            onChange={() => {
              setOpen(false);
              coverFormRef.current?.requestSubmit();
            }}
          />
        </form>
      )}
    </div>
  );
}
