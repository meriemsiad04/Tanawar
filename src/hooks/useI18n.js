import { createContext, useContext } from "react";

/** Provided by i18n/I18nProvider. Falls back to returning the key so a missing provider is obvious. */
export const I18nContext = createContext({
  lang: "en",
  dir: "ltr",
  setLang: () => {},
  t: (key) => key,
});

/** `const { t, lang, dir, setLang } = useI18n();` then `t("landing.hero.cta")` or `t("landing.campus.seatsLeft", { n: 3 })`. */
export function useI18n() {
  return useContext(I18nContext);
}
