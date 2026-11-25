/**
 * Device-side appearance: theme, font size and reduced animations.
 *
 * The account copy lives in settingsService (`settings.appearance`); this module applies it to <html>
 * and mirrors it in localStorage so the inline script in index.html can apply it before first paint
 * (no flash). Keys: "theme" ("light" | "dark", absent = follow the system), "fontSize", "reduceMotion".
 *
 * Root attributes read by src/index.css:
 *   class "dark"                      dark tokens
 *   data-font-size="small" | "large"  zooms the whole UI (absent = default)
 *   data-reduce-motion                turns animations and transitions off
 */

export const THEMES = ["light", "dark", "system"];
export const FONT_SIZES = ["small", "default", "large"];

const KEYS = { theme: "theme", fontSize: "fontSize", reduceMotion: "reduceMotion" };
const EVENT = "tanawar:appearance";
const root = () => document.documentElement;
const systemDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

const read = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key, value) => {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage blocked: the choice applies until reload */
  }
};

/** What this device currently uses. */
export function getDeviceAppearance() {
  const t = read(KEYS.theme);
  const f = read(KEYS.fontSize);
  return {
    theme: t === "dark" || t === "light" ? t : "system",
    fontSize: FONT_SIZES.includes(f) ? f : "default",
    reduceMotion: read(KEYS.reduceMotion) === "1",
  };
}

/** Light or dark, after resolving "system". */
export const resolveTheme = (theme) => (theme === "system" ? (systemDark() ? "dark" : "light") : theme);

/**
 * Applies `{ theme, fontSize, reduceMotion }` (any subset) to the page.
 * `persist: false` previews it without touching localStorage (Settings page live preview).
 */
export function applyAppearance(next, { persist = true, animate = true } = {}) {
  const current = { ...getDeviceAppearance(), ...next };
  const el = root();

  if (next.theme) {
    const dark = resolveTheme(current.theme) === "dark";
    if (dark !== el.classList.contains("dark")) {
      if (animate && !prefersReducedMotion()) {
        el.classList.add("theme-transition");
        window.setTimeout(() => el.classList.remove("theme-transition"), 320);
      }
      el.classList.toggle("dark", dark);
    }
  }
  if (next.fontSize) {
    if (current.fontSize === "default") el.removeAttribute("data-font-size");
    else el.setAttribute("data-font-size", current.fontSize);
  }
  if (typeof next.reduceMotion === "boolean") el.toggleAttribute("data-reduce-motion", current.reduceMotion);

  if (persist) {
    if (next.theme) write(KEYS.theme, current.theme === "system" ? null : current.theme);
    if (next.fontSize) write(KEYS.fontSize, current.fontSize === "default" ? null : current.fontSize);
    if (typeof next.reduceMotion === "boolean") write(KEYS.reduceMotion, current.reduceMotion ? "1" : null);
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Re-applies what is saved on this device (undoes a preview). */
export const restoreDeviceAppearance = () => applyAppearance(getDeviceAppearance(), { persist: false });

/** Fires `cb` whenever the applied appearance changes (any component, or the OS theme while on "system"). */
export function onAppearanceChange(cb) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystem = () => {
    if (getDeviceAppearance().theme === "system") applyAppearance({ theme: "system" }, { persist: false });
  };
  window.addEventListener(EVENT, cb);
  mq.addEventListener("change", onSystem);
  return () => {
    window.removeEventListener(EVENT, cb);
    mq.removeEventListener("change", onSystem);
  };
}

/** True when the OS asks for less motion OR the student turned on "Reduce animations". Use instead of matchMedia directly. */
export const prefersReducedMotion = () =>
  root().hasAttribute("data-reduce-motion") || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
