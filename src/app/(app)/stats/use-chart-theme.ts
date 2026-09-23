"use client";

import { useSyncExternalStore } from "react";

// Recharts writes color props straight onto SVG presentation attributes,
// which don't reliably resolve CSS custom properties in every renderer, so
// charts need literal color values. Rather than mirroring the palette here,
// read the tokens as currently resolved on <html> — that already accounts
// for the OS theme, a theme forced in Settings (data-theme) and the chosen
// accent (data-accent), and re-reads whenever any of those change.

const TOKENS = ["--accent", "--border", "--muted-foreground", "--surface"] as const;

// Matches the light tokens in globals.css; only used for the server render.
const SERVER_SNAPSHOT = "#5b5bd6|#e5e5e3|#6b6b6f|#ffffff";

function subscribe(callback: () => void) {
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  mql.addEventListener("change", callback);
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-accent"] });
  return () => {
    mql.removeEventListener("change", callback);
    observer.disconnect();
  };
}

// A string, not an object: useSyncExternalStore compares snapshots with
// Object.is, so a fresh object every call would re-render forever.
function getSnapshot() {
  const style = getComputedStyle(document.documentElement);
  return TOKENS.map((token) => style.getPropertyValue(token).trim()).join("|");
}

function getServerSnapshot() {
  return SERVER_SNAPSHOT;
}

export function useChartTheme() {
  const [accent, border, mutedForeground, surface] = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  ).split("|");
  return { accent, border, mutedForeground, surface };
}
