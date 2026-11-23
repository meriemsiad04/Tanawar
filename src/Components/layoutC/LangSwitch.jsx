import { useState } from "react";
import Icon from "../uiC/Icon.jsx";

const LANGS = ["EN", "FR"];

/** Language pill (dark variant). Local state for now — wire to i18n later via `value`/`onChange`. */
export default function LangSwitch({ value, onChange }) {
  const [internal, setInternal] = useState("EN");
  const lang = value ?? internal;

  const toggle = () => {
    const next = LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length];
    setInternal(next);
    onChange?.(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Language: ${lang}. Click to switch`}
      className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-white/[.22] px-3 py-2.5 text-xs font-bold leading-4 text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
    >
      <Icon name="lang" size="sm" />
      {lang}
    </button>
  );
}
