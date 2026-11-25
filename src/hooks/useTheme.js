import { useCallback, useEffect, useState } from "react";
import { applyAppearance, onAppearanceChange } from "../services/appearance.js";
import { settingsStore } from "../services/settingsService.js";

const current = () => (document.documentElement.classList.contains("dark") ? "dark" : "light");

/**
 * Light / dark theme.
 * The initial class is set by the inline script in index.html (no flash). Applying and saving goes through
 * services/appearance.js, so the navbar toggle and the Settings page stay in sync.
 * Without a saved choice ("system") it follows the OS setting live.
 * Returns { theme: "light" | "dark" (what is shown), toggle }.
 */
export default function useTheme() {
  const [theme, setTheme] = useState(current);

  useEffect(() => onAppearanceChange(() => setTheme(current())), []);

  const toggle = useCallback(() => {
    const next = current() === "dark" ? "light" : "dark";
    applyAppearance({ theme: next });
    settingsStore.saveTheme(next); // signed-in students: remember it on the account too
  }, []);

  return { theme, toggle };
}
