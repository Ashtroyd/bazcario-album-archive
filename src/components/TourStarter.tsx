"use client";

import { useEffect } from "react";
import { startTour } from "@/lib/tour-bus";

/** Fires the feature tour once per browser, shortly after the first dashboard render. Manual replays go through the profile page's "Take a tour" button instead. */
export function TourStarter() {
  useEffect(() => {
    try {
      if (localStorage.getItem("archive:tourSeen")) return;
      localStorage.setItem("archive:tourSeen", "true");
    } catch {
      return;
    }
    const t = setTimeout(() => startTour(), 800);
    return () => clearTimeout(t);
  }, []);

  return null;
}
