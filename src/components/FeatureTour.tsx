"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { onTourStart } from "@/lib/tour-bus";
import { IconX } from "./icons";

type TourStep = {
  target: string;
  title: string;
  body: string;
};

const STEPS: TourStep[] = [
  {
    target: "add-album",
    title: "Add an album",
    body: "Search a title and cover art, tracklist, and release year fill in automatically. Rate each track and your overall score is calculated for you.",
  },
  {
    target: "announcements-nav",
    title: "Follow artists",
    body: "Follow your favourite artists and their new releases show up here — checked every 30 minutes, no need to go looking.",
  },
  {
    target: "friends-nav",
    title: "Add friends",
    body: "Add friends to see their ratings, compare taste track-by-track, and comment on each other's reviews.",
  },
  {
    target: "monthly-favourites",
    title: "Monthly favourites",
    body: "Pick up to five favourite songs each month. Yours and your friends' picks both show up here.",
  },
  {
    target: "notifications-bell",
    title: "Stay in the loop",
    body: "Friend requests and comments on your reviews show up here.",
  },
];

const TOOLTIP_WIDTH = 320;
const PADDING = 8;

/** First element matching the target that's actually visible (non-zero size) — a step's target may exist twice (desktop nav + mobile bottom nav) with only one rendered at a time. */
function visibleRect(target: string): DOMRect | null {
  const els = document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`);
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return r;
  }
  return null;
}

function visibleEl(target: string): HTMLElement | null {
  const els = document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`);
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

export function FeatureTour() {
  const [steps, setSteps] = useState<TourStep[] | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const frame = useRef<number | null>(null);

  const measure = useCallback(() => {
    if (!steps) return;
    const step = steps[stepIndex];
    setRect(step ? visibleRect(step.target) : null);
  }, [steps, stepIndex]);

  // Start: find which of the steps' targets are actually visible right now.
  useEffect(
    () =>
      onTourStart(() => {
        const available = STEPS.filter((s) => visibleEl(s.target));
        if (available.length === 0) return;
        setSteps(available);
        setStepIndex(0);
      }),
    [],
  );

  // Keep the spotlight glued to its target through scroll/resize/animation.
  useEffect(() => {
    if (!steps) return undefined;
    const step = steps[stepIndex];
    visibleEl(step.target)?.scrollIntoView({ behavior: "smooth", block: "center" });

    const tick = () => {
      measure();
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current != null) cancelAnimationFrame(frame.current);
    };
  }, [steps, stepIndex, measure]);

  useEffect(() => {
    if (!steps) return undefined;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") finish();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [steps]);

  function finish() {
    try {
      localStorage.setItem("archive:tourSeen", "true");
    } catch {
      // ignore
    }
    setSteps(null);
    setStepIndex(0);
    setRect(null);
  }

  if (!steps || !rect) return null;
  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  const spotlightPad = 6;
  const spotlightStyle: React.CSSProperties = {
    position: "fixed",
    top: rect.top - spotlightPad,
    left: rect.left - spotlightPad,
    width: rect.width + spotlightPad * 2,
    height: rect.height + spotlightPad * 2,
    borderRadius: 12,
    boxShadow: "0 0 0 9999px rgba(38, 37, 33, 0.65)",
    pointerEvents: "none",
    zIndex: 100,
  };

  // Prefer below the target; flip above if there isn't room; clamp horizontally.
  const spaceBelow = window.innerHeight - rect.bottom;
  const above = spaceBelow < 200 && rect.top > 200;
  const top = above ? undefined : Math.min(rect.bottom + 16, window.innerHeight - 16);
  const bottom = above ? window.innerHeight - rect.top + 16 : undefined;
  const left = Math.min(
    Math.max(rect.left, PADDING),
    window.innerWidth - TOOLTIP_WIDTH - PADDING,
  );

  // No full-page backdrop: the rest of the app stays interactive during the
  // tour (a new user clicking the spotlighted "Add album" button should
  // actually open it, not just dismiss the tooltip) — only the spotlight
  // ring and tooltip card render on top.
  return (
    <div className="pointer-events-none fixed inset-0 z-[100]">
      <div style={spotlightStyle} />
      <div
        key={stepIndex}
        ref={(el) => el?.focus()}
        tabIndex={-1}
        role="dialog"
        aria-label="Feature tour"
        style={{ position: "fixed", top, bottom, left, width: TOOLTIP_WIDTH }}
        className="animate-tour-in pointer-events-auto z-[101] rounded-2xl border border-line bg-surface p-4 shadow-[0_16px_40px_rgba(38,37,33,0.24)] focus:outline-none"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="font-serif text-base font-semibold text-ink">{step.title}</p>
          <button
            type="button"
            onClick={finish}
            aria-label="Skip tour"
            className="-m-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-ivory hover:text-ink"
          >
            <IconX size={14} />
          </button>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-body">{step.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted">
            {stepIndex + 1} of {steps.length}
          </span>
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={() => setStepIndex((i) => i - 1)}
                className="rounded-full px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-ivory hover:text-ink"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => (isLast ? finish() : setStepIndex((i) => i + 1))}
              className="rounded-full bg-accent px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            >
              {isLast ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
