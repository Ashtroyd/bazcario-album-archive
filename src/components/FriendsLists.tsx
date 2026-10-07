"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { acceptFriend, removeFriend } from "@/app/actions/friends";
import { Avatar } from "@/components/Avatar";
import { CoverImage } from "@/components/CoverImage";
import { formatScore } from "@/lib/utils";
import type { FriendInsight } from "@/lib/friends-hub";

export type ProfileLite = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
};

export type FriendshipRow = {
  id: string;
  user_id: string;
  friend_id: string;
  status: "pending" | "accepted";
  created_at: string;
  requester: ProfileLite | null;
  recipient: ProfileLite | null;
};

type RemovalNotice = { row: FriendshipRow; label: string; index: number };

export function FriendsLists({ rows, meId, insights = {} }: { rows: FriendshipRow[]; meId: string; insights?: Record<string, FriendInsight> }) {
  const [visibleRows, setVisibleRows] = useState(rows);
  const [notice, setNotice] = useState<RemovalNotice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const removalTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const [previousRows, setPreviousRows] = useState(rows);
  if (rows !== previousRows) {
    setPreviousRows(rows);
    setVisibleRows(rows.filter((row) => row.id !== notice?.row.id));
  }

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const accepted = visibleRows.filter((row) => row.status === "accepted");
  const incoming = visibleRows.filter((row) => row.status === "pending" && row.friend_id === meId);
  const outgoing = visibleRows.filter((row) => row.status === "pending" && row.user_id === meId);
  const other = (row: FriendshipRow) => row.user_id === meId ? row.recipient : row.requester;

  function accept(row: FriendshipRow) {
    setError(null);
    setVisibleRows((current) => current.map((item) => item.id === row.id ? { ...item, status: "accepted" } : item));
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", row.id);
      const result = await acceptFriend(formData);
      if (!result.ok && mountedRef.current) {
        setVisibleRows((current) => current.map((item) => item.id === row.id ? row : item));
        setError(result.error);
      }
    });
  }

  function commitRemoval(row: FriendshipRow) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", row.id);
      const result = await removeFriend(formData);
      if (!result.ok && mountedRef.current) {
        setVisibleRows((current) => current.some((item) => item.id === row.id) ? current : [...current, row]);
        setError(result.error);
      }
      if (mountedRef.current) setNotice((current) => current?.row.id === row.id ? null : current);
    });
  }

  function scheduleRemoval(row: FriendshipRow, label: string) {
    if (removalTimerRef.current) {
      window.clearTimeout(removalTimerRef.current);
      if (notice) commitRemoval(notice.row);
    }

    const index = visibleRows.findIndex((item) => item.id === row.id);
    setVisibleRows((current) => current.filter((item) => item.id !== row.id));
    setError(null);
    setNotice({ row, label, index: Math.max(index, 0) });
    removalTimerRef.current = window.setTimeout(() => {
      removalTimerRef.current = null;
      commitRemoval(row);
    }, 6000);
  }

  function undoRemoval() {
    if (!notice) return;
    if (removalTimerRef.current) window.clearTimeout(removalTimerRef.current);
    removalTimerRef.current = null;
    const { row, index } = notice;
    setVisibleRows((current) => {
      if (current.some((item) => item.id === row.id)) return current;
      const next = [...current];
      next.splice(Math.min(index, next.length), 0, row);
      return next;
    });
    setNotice(null);
  }

  return (
    <>
      {error ? <p role="status" className="rounded-xl bg-accent-soft px-3 py-2 text-sm text-accent">{error}</p> : null}

      {incoming.length > 0 ? (
        <section className="space-y-2">
          <h2 className="eyebrow">Requests ({incoming.length})</h2>
          {incoming.map((row) => (
            <div key={row.id} className="card flex flex-wrap items-center gap-3 py-3">
              <Avatar url={row.requester?.avatar_url} name={row.requester?.display_name} size={36} />
              <span className="min-w-0 flex-1 truncate font-medium">{row.requester?.display_name ?? row.requester?.email}</span>
              <div className="ml-auto flex shrink-0 gap-2">
                <button type="button" onClick={() => accept(row)} disabled={pending} className="btn btn-primary px-3 py-1.5 text-sm">Accept</button>
                <button type="button" onClick={() => scheduleRemoval(row, "Request declined")} disabled={pending} className="btn btn-ghost px-3 py-1.5 text-sm">Decline</button>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {outgoing.length > 0 ? (
        <section className="space-y-2">
          <h2 className="eyebrow">Sent ({outgoing.length})</h2>
          {outgoing.map((row) => (
            <div key={row.id} className="card flex flex-wrap items-center gap-3 py-3">
              <Avatar url={row.recipient?.avatar_url} name={row.recipient?.display_name} size={36} />
              <span className="min-w-0 flex-1 truncate font-medium">{row.recipient?.display_name ?? row.recipient?.email}</span>
              <span className="chip">Pending</span>
              <button type="button" onClick={() => scheduleRemoval(row, "Request cancelled")} disabled={pending} className="btn btn-ghost ml-auto px-3 py-1.5 text-sm">Cancel</button>
            </div>
          ))}
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="font-serif text-xl font-semibold text-ink">Your circle <span className="font-sans text-sm font-normal text-muted">· {accepted.length}</span></h2>
        {accepted.length === 0 ? (
          <p className="text-sm text-muted">No friends yet. Search below to add some.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {accepted.map((row) => {
              const person = other(row);
              const name = person?.display_name ?? person?.email ?? "Friend";
              const personId = row.user_id === meId ? row.friend_id : row.user_id;
              const insight = insights[personId];
              return (
                <div key={row.id} className="card space-y-4">
                  <div className="flex items-center gap-3">
                    <Link href={`/friends/${personId}`} aria-label={`View ${name}`}><Avatar url={person?.avatar_url} name={person?.display_name} size={44} /></Link>
                    <div className="min-w-0 flex-1"><Link href={`/friends/${personId}`} className="block truncate font-semibold text-ink hover:underline">{name}</Link><p className="mt-0.5 text-xs text-muted">{insight?.sharedAlbums ? `${insight.sharedAlbums} shared album${insight.sharedAlbums === 1 ? "" : "s"}` : "Find your common ground"}</p></div>
                    {insight?.matchPct != null && <div className="shrink-0 text-right"><p className="text-xl font-semibold tabular-nums text-sage">{insight.matchPct}%</p><p className="text-[10px] text-muted">Album score match</p></div>}
                  </div>
                  {insight?.favourite ? <Link href={`/album/${insight.favourite.id}`} className="flex min-w-0 items-center gap-3 rounded-xl bg-ivory/70 p-3 transition-colors hover:bg-ivory">
                    <CoverImage url={insight.favourite.cover_image_url} alt="" className="h-11 w-11 shrink-0 rounded-md" />
                    <div className="min-w-0"><p className="text-[11px] text-muted">One of their highest scores</p><p className="truncate text-sm font-medium text-ink">{insight.favourite.title}</p><p className="truncate text-xs text-muted">{insight.favourite.artist}</p></div>
                  </Link> : <p className="rounded-xl bg-ivory/50 p-3 text-xs text-muted">No visible album scores yet. Their private ratings aren&apos;t included.</p>}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                    <p className="text-xs text-muted">{insight?.scoredAlbums ? `${insight.scoredAlbums} visible scores · avg ${formatScore(insight.average)}` : "Visit their profile to explore"}</p>
                    <button type="button" aria-label={`Unfriend ${name}`} onClick={() => scheduleRemoval(row, `${name} removed`)} disabled={pending} className="btn btn-danger px-2 py-1 text-xs">Unfriend</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {notice ? (
        <div className="rating-save-toast fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] left-4 z-50 flex items-center gap-3 rounded-xl bg-ink px-4 py-3.5 text-paper shadow-[0_18px_55px_rgba(38,37,33,0.3)] sm:right-6 sm:bottom-6 sm:left-auto sm:w-96">
          <span role="status" aria-live="polite" className="min-w-0 flex-1 truncate text-sm font-medium">{notice.label}</span>
          <button type="button" onClick={undoRemoval} className="rounded-full border border-paper/25 px-3 py-1.5 text-xs font-semibold text-paper transition-colors hover:bg-paper/10">Undo</button>
        </div>
      ) : null}
    </>
  );
}
