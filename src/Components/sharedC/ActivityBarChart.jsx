import { useId, useState } from "react";

/** Rounds the axis top up to 1 / 2 / 5 × 10ⁿ so the grid shows clean numbers. */
function niceMax(v) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 5, 10].map((m) => m * p).find((m) => m >= v);
}

/**
 * Single-series bar chart (one brand hue, validated on light and dark surfaces): thin bars with 2px gaps,
 * 4px rounded tops on the baseline, a recessive 3-line grid, a tooltip per bar on hover AND keyboard focus,
 * and a "View as table" toggle for screen readers / exact values. No legend: the `title` names the series.
 *
 * Props: data [{ label, long, value }], title (accessible name), format(value) → text, emptyText, height.
 */
export default function ActivityBarChart({ data, title, format = (v) => String(v), emptyText = "No activity in this period yet.", height = 180 }) {
  const [hover, setHover] = useState(null);
  const [asTable, setAsTable] = useState(false);
  const tableId = useId();
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const empty = data.every((d) => !d.value);
  const ticks = [max, max / 2, 0];
  // Too many bars for every label on narrow screens: label every other one (all still have tooltips).
  const sparse = data.length > 8;

  return (
    <figure className="flex flex-col gap-2">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setAsTable((t) => !t)}
          aria-expanded={asTable}
          aria-controls={tableId}
          className="cursor-pointer rounded-md text-xs font-bold text-primary-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {asTable ? "View as chart" : "View as table"}
        </button>
      </div>

      {asTable ? (
        <div id={tableId} className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr className="border-b border-line text-xs text-fg-3">
                <th scope="col" className="py-2 pr-4 font-semibold">Period</th>
                <th scope="col" className="py-2 text-right font-semibold">Value</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.long} className="border-b border-line last:border-b-0">
                  <th scope="row" className="py-2 pr-4 font-normal text-fg-2">{d.long}</th>
                  <td className="py-2 text-right font-bold tabular-nums text-fg">{format(d.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex gap-2">
          {/* Y axis */}
          <div aria-hidden="true" className="flex flex-col justify-between pb-6 text-right text-[11px] leading-none tabular-nums text-fg-3" style={{ height: height + 24 }}>
            {ticks.map((t) => (
              <span key={t}>{format(Math.round(t * 10) / 10)}</span>
            ))}
          </div>

          <div className="relative min-w-0 flex-1">
            {/* Grid (recessive) */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 flex flex-col justify-between" style={{ height }}>
              {ticks.map((t) => (
                <span key={t} className={`block h-px ${t === 0 ? "bg-line-strong" : "bg-line"}`} />
              ))}
            </div>

            {empty && (
              <p className="absolute inset-x-0 z-10 -translate-y-1/2 text-center text-[13px] text-fg-2" style={{ top: height / 2 }}>
                {emptyText}
              </p>
            )}

            <ul role="list" aria-label={title} className="relative flex items-end gap-[2px]" style={{ height }}>
              {data.map((d, i) => {
                const h = d.value > 0 ? Math.max(4, (d.value / max) * height) : 0;
                const active = hover === i;
                return (
                  <li
                    key={d.long}
                    tabIndex={0}
                    aria-label={`${d.long}: ${format(d.value)}`}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                    className="group relative flex h-full flex-1 cursor-default items-end justify-center rounded-t outline-none focus-visible:bg-surface-2"
                  >
                    {/* Hit target = the whole column; the visible bar stays thin. */}
                    <span
                      className={`block w-full max-w-7 rounded-t-[4px] transition-opacity ${d.value ? "bg-primary" : ""} ${hover !== null && !active ? "opacity-50" : ""}`}
                      style={{ height: h }}
                    />
                    {active && (
                      <span
                        role="tooltip"
                        className="pointer-events-none absolute z-20 -translate-x-1/2 whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs shadow-raised"
                        style={{ bottom: h + 8, left: "50%" }}
                      >
                        <span className="block font-semibold text-fg-2">{d.long}</span>
                        <span className="block font-extrabold tabular-nums text-fg">{format(d.value)}</span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>

            {/* X labels */}
            <div aria-hidden="true" className="mt-2 flex gap-[2px] text-[11px] leading-4 text-fg-3">
              {data.map((d, i) => (
                <span key={d.long} className={`flex-1 truncate text-center ${sparse && i % 2 && i !== data.length - 1 ? "invisible sm:visible" : ""}`}>
                  {d.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </figure>
  );
}
