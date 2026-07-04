"use client";

import { useState } from "react";

export function ShareCardButton({
  albumId,
  title,
}: {
  albumId: string;
  title: string;
}) {
  const [busy, setBusy] = useState(false);

  async function share() {
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

  return (
    <button
      type="button"
      onClick={share}
      disabled={busy}
      className="btn btn-outline text-sm"
    >
      {busy ? "Preparing…" : "Share card"}
    </button>
  );
}
