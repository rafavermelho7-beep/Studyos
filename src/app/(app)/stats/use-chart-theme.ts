"use client";

import { useSyncExternalStore } from "react";

// Recharts writes color props straight onto SVG presentation attributes,
// which don't reliably resolve CSS custom properties in every renderer, so
// charts need literal hex values. These mirror the light/dark tokens in
// globals.css — keep them in sync if that palette changes.
const LIGHT = {
  accent: "#5b5bd6",
  border: "#e5e5e3",
  mutedForeground: "#6b6b6f",
  surface: "#ffffff",
};
const DARK = {
  accent: "#8181ec",
  border: "#26262b",
  mutedForeground: "#9a9aa0",
  surface: "#131316",
};

const QUERY = "(prefers-color-scheme: dark)";

function subscribe(callback: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

export function useChartTheme() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return dark ? DARK : LIGHT;
}
