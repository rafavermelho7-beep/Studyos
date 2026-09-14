"use client";

import { useEffect } from "react";

export function RegisterServiceWorker() {
  useEffect(() => {
    // Skip in dev: a cached service worker fighting HMR is a worse
    // experience than no offline support while iterating locally.
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Installability degrades gracefully — the app still works fully
      // online without the service worker.
    });
  }, []);

  return null;
}
