"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptFriend, removeFriend } from "@/app/actions/friends";

export function FriendRequestActions({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"ready" | "ignored" | "accepted">("ready");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const timerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  function accept() {
    setError(null);
    setState("accepted");
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", requestId);
      const result = await acceptFriend(formData);
      if (!mountedRef.current) return;
      if (!result.ok) {
        setState("ready");
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function ignore() {
    setError(null);
    setState("ignored");
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void (async () => {
        const formData = new FormData();
        formData.set("id", requestId);
        const result = await removeFriend(formData);
        if (!mountedRef.current) return;
        if (!result.ok) {
          setState("ready");
          setError(result.error);
          return;
        }
        router.refresh();
      })();
    }, 6000);
  }

  function undo() {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    setState("ready");
  }

  if (state === "accepted") {
    return <span role="status" aria-live="polite" className="text-sm font-medium text-muted">{pending ? "Accepting…" : "Accepted"}</span>;
  }

  if (state === "ignored") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <span role="status" aria-live="polite">Ignored</span>
        <button type="button" onClick={undo} className="font-semibold text-body underline underline-offset-2">Undo</button>
      </div>
    );
  }

  return (
    <div className="ml-auto">
      <div className="flex shrink-0 gap-2">
        <button type="button" onClick={accept} disabled={pending} className="btn btn-primary px-3 py-1.5 text-sm">Accept</button>
        <button type="button" onClick={ignore} disabled={pending} className="btn btn-ghost px-3 py-1.5 text-sm">Ignore</button>
      </div>
      {error ? <p role="status" aria-live="polite" className="mt-1 text-xs text-accent">{error}</p> : null}
    </div>
  );
}
