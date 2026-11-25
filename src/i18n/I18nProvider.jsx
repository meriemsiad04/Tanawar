import { useCallback, useMemo, useState } from "react";
import { I18nContext } from "../hooks/useI18n.js";
import en from "../../public/locales/en/commonEn.json";
import fr from "../../public/locales/fr/commonFr.json";
import ar from "../../public/locales/ar/commonAr.json";

const DICTS = { en, fr, ar };
const RTL = new Set(["ar"]);
const KEY = "lang";

/** ?lang=ar wins (handy for testing), then the saved choice, then English. */
function initialLang() {
  try {
    const q = new URLSearchParams(window.location.search).get("lang")?.toLowerCase();
    if (q && DICTS[q]) return q;
    const saved = localStorage.getItem(KEY);
    if (saved && DICTS[saved]) return saved;
  } catch {
    /* storage blocked */
  }
  return "en";
}

const lookup = (dict, key) => key.split(".").reduce((o, k) => o?.[k], dict);

/**
 * Minimal i18n (no dependency): strings live in public/locales/{lang}/common*.json.
 * Missing keys fall back to English, then to the key itself.
 * `dir` is exposed but NOT applied to <html>: only translated sections set
 * `dir`/`lang` on their root, so untranslated screens keep their LTR layout.
 */
export default function I18nProvider({ children }) {
  const [lang, setLangState] = useState(initialLang);

  const setLang = useCallback((next) => {
    if (!DICTS[next]) return;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* the choice just won't persist */
    }
    setLangState(next);
  }, []);

  const value = useMemo(() => {
    const t = (key, vars) => {
      const raw = lookup(DICTS[lang], key) ?? lookup(DICTS.en, key) ?? key;
      if (typeof raw !== "string" || !vars) return raw;
      return raw.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
    };
    return { lang, dir: RTL.has(lang) ? "rtl" : "ltr", setLang, t };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
