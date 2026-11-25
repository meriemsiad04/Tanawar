/**
 * Pill toggle group, one choice (filters: All / Online / On-site…).
 * `options`: [{ value, label }] — use "" as the "All" value. `size`: "m" (36px) | "s" (30px, uppercase-friendly).
 */
export default function Chips({ label, value, options, onChange, size = "m" }) {
  const height = size === "s" ? "h-[30px] px-3 text-xs" : "h-9 px-4 text-[13px]";
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value || "all"}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={`${height} cursor-pointer rounded-full font-bold leading-none transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 ${
              active ? "bg-primary text-white" : "border border-line-strong bg-surface text-fg-2 hover:bg-surface-2 hover:text-fg"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
