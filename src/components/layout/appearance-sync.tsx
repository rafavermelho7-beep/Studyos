"use client";

import { useEffect } from "react";
import type { AccentColor, ThemeMode } from "@/lib/preferences";

// Applies the user's theme/accent to <html data-theme data-accent> (the CSS
// in globals.css/accents.css keys off those). Two halves, on purpose:
// - the inline <script> runs while the server HTML is still parsing, so a
//   full page load never paints the wrong theme first;
// - the effect covers everything a script can't: client-side navigation
//   into the app (e.g. right after login — React doesn't execute inline
//   scripts it inserts itself), changing the setting, and cleaning up on
//   the way out (logout → /login falls back to the OS theme).

/** Also used by the settings page to preview a choice before the save round-trips. */
export function applyAppearance(themeMode: ThemeMode, accentColor: AccentColor) {
  const root = document.documentElement;
  root.dataset.accent = accentColor;
  if (themeMode === "system") delete root.dataset.theme;
  else root.dataset.theme = themeMode;
}

export function AppearanceSync({ themeMode, accentColor }: { themeMode: ThemeMode; accentColor: AccentColor }) {
  useEffect(() => {
    applyAppearance(themeMode, accentColor);
    return () => {
      delete document.documentElement.dataset.theme;
      delete document.documentElement.dataset.accent;
    };
  }, [themeMode, accentColor]);

  // Both values are validated enum members (readPreferences), never free
  // user text, so inlining them is safe; JSON.stringify quotes them anyway.
  // Written out literally rather than applyAppearance.toString(): server and client
  // bundles minify differently, which would be a hydration mismatch.
  const script =
    `(function(r,t,a){r.dataset.accent=a;if(t==="system")delete r.dataset.theme;else r.dataset.theme=t})` +
    `(document.documentElement,${JSON.stringify(themeMode)},${JSON.stringify(accentColor)})`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
