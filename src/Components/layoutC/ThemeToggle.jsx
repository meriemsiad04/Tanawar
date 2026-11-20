import Icon from "../uiC/Icon.jsx";
import useTheme from "../../hooks/useTheme.js";

/** Night-mode switch for the dark navbar (same pill style as LangSwitch). */
export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to night mode"}
      title={isDark ? "Light mode" : "Night mode"}
      className="group relative inline-flex size-[38px] cursor-pointer items-center justify-center overflow-hidden rounded-[10px] border border-white/[.22] text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
    >
      {/* Both icons stay mounted so they can rotate/fade into each other. */}
      <span
        className={`absolute transition-all duration-300 ease-out ${
          isDark ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"
        }`}
      >
        <Icon name="moon" size="sm" />
      </span>
      <span
        className={`absolute text-highlight transition-all duration-300 ease-out ${
          isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"
        }`}
      >
        <Icon name="sun" size="sm" />
      </span>
    </button>
  );
}
