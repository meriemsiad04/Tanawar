import { useEffect, useMemo, useRef, useState } from "react";

const pad = (n) => String(n).padStart(2, "0");
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const LEVEL_CLASS = ["border border-line bg-surface-2", "bg-primary/25", "bg-primary/50", "bg-primary/75", "bg-primary"];
const levelOf = (n) => (n <= 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : n <= 4 ? 3 : 4);
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];
const CELL = 13;
const GAP = 3;

/**
 * GitHub-style contribution heatmap: one cell per day, columns are weeks (Sun→Sat), ending this week.
 * `data`: [{ date: "YYYY-MM-DD", count }] — sessions attended that day.
 */
export default function ContributionHeatmap({ data = [], weeks = 53 }) {
  const scroller = useRef(null);
  const [today] = useState(() => new Date());
  const { columns, months, total } = useMemo(() => {
    const counts = new Map();
    for (const { date, count } of data) counts.set(date, (counts.get(date) ?? 0) + count);

    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() - (weeks - 1) * 7);
    const cols = [];
    const labels = [];
    let sum = 0;
    for (let w = 0; w < weeks; w++) {
      const col = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d);
        if (date > today) {
          col.push(null);
          continue;
        }
        const key = dayKey(date);
        const count = counts.get(key) ?? 0;
        sum += count;
        col.push({ key, date, count });
      }
      // Month label above the first full week of each month.
      const first = col[0];
      if (first && first.date.getDate() <= 7)
        labels.push({ w, label: first.date.toLocaleDateString("en-GB", { month: "short" }) });
      cols.push(col);
    }
    return { columns: cols, months: labels, total: sum };
  }, [data, weeks, today]);

  // Newest weeks are on the right: start scrolled to them on narrow screens.
  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth;
  }, [columns]);

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="text-sm text-fg-2">
        <strong className="font-extrabold text-fg">{total}</strong> {total === 1 ? "session" : "sessions"} attended in the last year
      </figcaption>

      <div ref={scroller} className="overflow-x-auto pb-1">
        <div className="flex w-max gap-2">
          <div aria-hidden="true" className="flex flex-col pt-[18px] text-[11px] leading-[13px] text-fg-3" style={{ gap: GAP }}>
            {DAY_LABELS.map((l, i) => (
              <span key={i} style={{ height: CELL }}>{l}</span>
            ))}
          </div>
          <div>
            <div aria-hidden="true" className="relative mb-[5px] text-[11px] leading-[13px] text-fg-3" style={{ height: CELL }}>
              {months.map(({ w, label }) => (
                <span key={w} className="absolute" style={{ left: w * (CELL + GAP) }}>{label}</span>
              ))}
            </div>
            <div role="img" aria-label={`${total} sessions attended in the last year`} className="flex" style={{ gap: GAP }}>
              {columns.map((col, w) => (
                <div key={w} className="flex flex-col" style={{ gap: GAP }}>
                  {col.map((cell, d) =>
                    cell ? (
                      <span
                        key={cell.key}
                        title={`${cell.count} ${cell.count === 1 ? "session" : "sessions"} · ${cell.date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}`}
                        className={`rounded-[3px] ${LEVEL_CLASS[levelOf(cell.count)]}`}
                        style={{ width: CELL, height: CELL }}
                      />
                    ) : (
                      <span key={d} style={{ width: CELL, height: CELL }} />
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div aria-hidden="true" className="flex items-center gap-1.5 self-end text-[11px] text-fg-3">
        Less
        {LEVEL_CLASS.map((c) => (
          <span key={c} className={`rounded-[3px] ${c}`} style={{ width: CELL, height: CELL }} />
        ))}
        More
      </div>
    </figure>
  );
}
