"use client";

import { useState, useSyncExternalStore } from "react";
import { IconDisc, IconStar } from "@/components/icons";

const STORAGE_VERSION = "v1";
const STORAGE_EVENT = "archive:ownership-primer-change";

function storageKey(userId: string) {
  return `archive:ownership-primer:${STORAGE_VERSION}:${userId}`;
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener(STORAGE_EVENT, onStoreChange);
  return () => window.removeEventListener(STORAGE_EVENT, onStoreChange);
}

function hasNotSeenPrimer(userId: string) {
  try {
    return localStorage.getItem(storageKey(userId)) !== "seen";
  } catch {
    return true;
  }
}

export function OwnershipPrimer({ userId }: { userId: string }) {
  const [closing, setClosing] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const storedVisible = useSyncExternalStore(
    subscribe,
    () => hasNotSeenPrimer(userId),
    () => false,
  );
  const visible = storedVisible && !dismissed;

  function dismiss() {
    setClosing(true);
    window.setTimeout(() => {
      try {
        localStorage.setItem(storageKey(userId), "seen");
      } catch {
        // The primer can still close when browser storage is unavailable.
      }
      setDismissed(true);
      window.dispatchEvent(new Event(STORAGE_EVENT));
    }, 220);
  }

  if (!visible) return null;

  return (
    <section
      aria-labelledby="ownership-primer-title"
      className={`ownership-primer overflow-hidden rounded-xl border border-line-strong bg-surface shadow-[0_5px_18px_rgba(38,37,33,0.07)] ${closing ? "ownership-primer-closing" : ""}`}
    >
      <h2 id="ownership-primer-title" className="sr-only">
        How Album Archive works
      </h2>
      <div className="grid sm:grid-cols-[1fr_auto_1fr_auto] sm:items-center">
        <div className="flex gap-3 p-4 sm:p-5">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"
          >
            <IconDisc size={18} />
          </span>
          <div>
            <p className="font-serif font-semibold text-ink">Albums are shared</p>
            <p className="mt-0.5 text-sm leading-relaxed text-muted">
              Everyone adds to the same catalog, so you may see albums discovered by friends.
            </p>
          </div>
        </div>

        <span
          aria-hidden="true"
          className="mx-4 h-px bg-line sm:mx-0 sm:h-12 sm:w-px"
        />

        <div className="flex gap-3 p-4 sm:p-5">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage-soft text-sage"
          >
            <IconStar size={18} />
          </span>
          <div>
            <p className="font-serif font-semibold text-ink">Your ratings are yours</p>
            <p className="mt-0.5 text-sm leading-relaxed text-muted">
              Scores, replay choices and notes save only to your account.
            </p>
          </div>
        </div>

        <div className="px-4 pb-4 sm:p-5 sm:pl-1">
          <button
            type="button"
            onClick={dismiss}
            disabled={closing}
            className="btn btn-outline w-full sm:w-auto"
          >
            Got it
          </button>
        </div>
      </div>
    </section>
  );
}
