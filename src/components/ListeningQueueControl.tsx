"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setListeningQueue } from "@/app/actions/listening-queue";
import { QUEUE_LABELS, type QueueStatus } from "@/lib/listening-queue";

export function ListeningQueueControl({ albumId, initialStatus, rated = false, compact = false }: { albumId: string; initialStatus: QueueStatus | null; rated?: boolean; compact?: boolean }) {
  const [status, setStatus] = useState(initialStatus);
  const [previous, setPrevious] = useState(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  if (previous !== initialStatus) { setPrevious(initialStatus); setStatus(initialStatus); }
  function save(next: QueueStatus | null) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await setListeningQueue(albumId, next);
        if (!result.ok) { setError(result.error); return; }
        setStatus(next); router.refresh();
      } catch { setError("Your queue wasn’t updated. Check your connection and try again."); }
    });
  }
  if (rated) return <p className="text-xs text-sage">Rated · your score is saved</p>;
  if (compact) return <div><button type="button" disabled={pending || status !== null} onClick={() => save("want")} className="btn btn-outline min-h-9 px-3 py-1 text-xs disabled:opacity-60">{pending ? "Saving…" : status ? `Saved · ${QUEUE_LABELS[status]}` : "Save for later"}</button>{error && <p role="status" className="mt-1 text-xs text-accent">{error}</p>}</div>;
  return <div className="space-y-2"><div className="flex flex-wrap items-center gap-2">
    <button type="button" aria-pressed={status === "want"} disabled={pending} onClick={() => save("want")} className={`btn min-h-11 ${status === "want" ? "btn-primary" : "btn-outline"}`}>Want to listen</button>
    <button type="button" aria-pressed={status === "listening"} disabled={pending} onClick={() => save("listening")} className={`btn min-h-11 ${status === "listening" ? "btn-primary" : "btn-outline"}`}>Listening</button>
    {status && <button type="button" disabled={pending} onClick={() => save(null)} className="btn btn-ghost min-h-11 text-xs">Remove from queue</button>}
    <Link href="/queue" className="ml-auto text-xs text-accent hover:underline">Open queue →</Link>
  </div><p role="status" className={`text-xs ${error ? "text-accent" : "text-muted"}`}>{error ?? (pending ? "Saving…" : status ? `In your queue · ${QUEUE_LABELS[status]}` : "Save this album without giving it a score.")}</p></div>;
}
