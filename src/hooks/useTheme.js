import { useCallback, useEffect, useState } from "react";

const KEY = "theme";
const root = () => document.documentElement;

function readSaved() {
  try {
    const t = localStorage.getItem(KEY);
    return t === "dark" || t === "light" ? t : null;
  } catch {
    return null;
  }
}

/**
 * Light / dark theme.
 * The initial class is set by the inline script in index.html (no flash);
 * this hook reads it, toggles it, and remembers the choice in localStorage.
 * Without a saved choice it follows the OS setting live.
 */
export default function useTheme() {
  const [theme, setTheme] = useState(() =>
    root().classList.contains("dark") ? "dark" : "light"
  );

  useEffect(() => {
    root().classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Follow the system preference until the user picks a theme.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e) => {
      if (!readSaved()) setTheme(e.matches ? "dark" : "light");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const toggle = useCallback(() => {
    const next = root().classList.contains("dark") ? "light" : "dark";
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      root().classList.add("theme-transition");
      window.setTimeout(() => root().classList.remove("theme-transition"), 320);
    }
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* storage blocked: the choice just won't persist */
    }
    setTheme(next);
  }, []);

  return { theme, toggle };
}
