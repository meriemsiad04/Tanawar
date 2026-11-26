import { useCallback, useEffect, useId, useState } from "react";
import Button from "../../../Components/uiC/Button.jsx";
import Icon from "../../../Components/uiC/Icon.jsx";
import Chips from "../../../Components/uiC/Chips.jsx";
import ActivityBarChart from "../../../Components/sharedC/ActivityBarChart.jsx";
import StudyRoomStatusBadge from "../../../Components/sharedC/StudyRoomStatusBadge.jsx";
import { ANALYTICS_RANGES, fmtNum, fmtStudy, getStudyAnalytics } from "../../../services/adminStudyRoomsService.js";
import { adminErrorText } from "../students/format.js";

const RANGE_CHIPS = ANALYTICS_RANGES.map((d) => ({ value: String(d), label: `${d} days` }));
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAYS_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const BANDS = Array.from({ length: 12 }, (_, i) => `${String(i * 2).padStart(2, "0")}:00`);
const HEAT = ["bg-surface-2", "bg-primary/20", "bg-primary/40", "bg-primary/60", "bg-primary/80", "bg-primary"];

const parseDay = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const longDay = (key) => parseDay(key).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
const shortDay = (key, days) => (days <= 7 ? parseDay(key).toLocaleDateString(undefined, { weekday: "short" }) : String(parseDay(key).getDate()));
const weekLabel = (key) => parseDay(key).toLocaleDateString(undefined, { day: "numeric", month: "short" });
const hours = (sec) => Math.round((sec / 3600) * 10) / 10;
const fmtH = (v) => `${v} h`;
const fmtMin = (v) => `${v} min`;

/** Daily points → weekly sums (Monday weeks), for long ranges. */
function byWeek(points) {
  const weeks = [];
  for (const p of points) {
    const d = parseDay(p.date);
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
    const k = monday.toDateString();
    if (weeks.at(-1)?.k !== k) weeks.push({ k, start: monday, value: 0 });
    weeks.at(-1).value += p.value;
  }
  return weeks.map((w) => {
    const label = w.start.toLocaleDateString(undefined, { day: "numeric", month: "short" });
    return { label, long: `Week of ${label}`, value: Math.round(w.value * 10) / 10 };
  });
}

/**
 * Study With Me analytics: study hours over time, daily / weekly active students, most active periods (weekday × time
 * of day), average sitting length and the most popular rooms. Single-series charts in the brand hue (no legend needed;
 * each panel title names its series); every chart has a table view.
 */
export default function StudyAnalytics({ version, onOpenRoom }) {
  const [days, setDays] = useState(30);
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState({ key: null, data: null, error: null });
  const key = `${days}|${tick}|${version}`;

  useEffect(() => {
    let active = true;
    getStudyAnalytics(days).then(
      (data) => active && setResult({ key, data, error: null }),
      (error) => active && setResult({ key, data: null, error })
    );
    return () => {
      active = false;
    };
  }, [key, days]);

  const loading = result.key !== key;
  const a = result.data;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Chips label="Period" size="s" value={String(days)} options={RANGE_CHIPS} onChange={(v) => setDays(Number(v))} />
        {loading && a && (
          <span role="status" className="inline-flex items-center gap-1.5 text-xs text-fg-3">
            <Icon name="loader" size="sm" className="!size-3.5 animate-spin" /> Updating…
          </span>
        )}
      </div>

      {!a && loading ? (
        <div role="status" aria-label="Loading analytics" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <span className="h-[300px] animate-pulse rounded-[20px] bg-surface-2 lg:col-span-2" />
          {Array.from({ length: 4 }, (_, i) => <span key={i} className="h-[300px] animate-pulse rounded-[20px] bg-surface-2" />)}
        </div>
      ) : result.error && !loading ? (
        <div role="alert" className="flex flex-col items-center gap-3 rounded-[20px] border border-line bg-surface px-5 py-14 text-center text-sm text-fg-2">
          <Icon name="warning" size="lg" className="text-warn" />
          <p>{adminErrorText(result.error, "We couldn't load the analytics.")}</p>
          <Button size="s" variant="outline" onClick={() => setTick((t) => t + 1)}>Try again</Button>
        </div>
      ) : a ? (
        <div className={`grid grid-cols-1 gap-4 transition-opacity lg:grid-cols-2 ${loading ? "opacity-60" : ""}`}>
          <HoursPanel a={a} />
          <ParticipantsPanel a={a} />
          <AveragePanel a={a} />
          <PeriodsPanel a={a} />
          <TopRoomsPanel a={a} onOpenRoom={onOpenRoom} />
        </div>
      ) : null}
    </div>
  );
}

function Panel({ title, subtitle, action, className = "", children }) {
  return (
    <section className={`flex min-w-0 flex-col gap-4 rounded-[20px] border border-line bg-surface p-[22px] ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-lg font-extrabold leading-6 text-fg">{title}</h2>
          {subtitle && <p className="text-[13px] leading-[19px] text-fg-2">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

const Unavailable = () => <p className="flex min-h-[180px] items-center justify-center text-[13px] text-fg-3">Not available yet.</p>;

function HoursPanel({ a }) {
  if (!a.hours) return <Panel title="Study hours" className="lg:col-span-2"><Unavailable /></Panel>;
  const daily = a.hours.map((p) => ({ date: p.date, value: hours(p.seconds) }));
  const total = Math.round(daily.reduce((s, p) => s + p.value, 0));
  const weekly = a.days > 31;
  const data = weekly ? byWeek(daily) : daily.map((p) => ({ label: shortDay(p.date, a.days), long: longDay(p.date), value: p.value }));
  const best = daily.reduce((m, p) => (p.value > (m?.value ?? -1) ? p : m), null);
  return (
    <Panel
      title="Study hours over time"
      subtitle={`${fmtNum(total)} h studied in the last ${a.days} days${weekly ? " · by week" : ""}`}
      className="lg:col-span-2"
      action={best?.value ? <Stat label="Best day" value={`${best.value} h`} hint={longDay(best.date)} /> : null}
    >
      <ActivityBarChart data={data} title={`Study hours, last ${a.days} days`} format={fmtH} emptyText="No study time in this period." height={200} />
    </Panel>
  );
}

function ParticipantsPanel({ a }) {
  const [mode, setMode] = useState("daily");
  const daily = a.dailyActive?.map((p) => ({ label: shortDay(p.date, a.days), long: longDay(p.date), value: p.students }));
  const weekly = a.weeklyActive?.map((p) => ({ label: weekLabel(p.weekStart), long: `Week of ${weekLabel(p.weekStart)}`, value: p.students }));
  const data = mode === "daily" ? daily : weekly;
  const avg = data?.length ? Math.round(data.reduce((s, p) => s + p.value, 0) / data.length) : null;
  return (
    <Panel
      title="Active students"
      subtitle={mode === "daily" ? `Distinct students who studied each day · last ${a.days} days` : "Distinct students who studied each week · last 12 weeks"}
      action={<Chips label="Granularity" size="s" value={mode} options={[{ value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }]} onChange={setMode} />}
    >
      {data ? (
        <>
          <p className="-mt-2 text-[13px] text-fg-2">
            On average <b className="text-fg">{fmtNum(avg)}</b> student{avg === 1 ? "" : "s"} per {mode === "daily" ? "day" : "week"}
          </p>
          <ActivityBarChart data={data} title={`Active students per ${mode === "daily" ? "day" : "week"}`} format={(v) => String(v)} integer emptyText="Nobody studied in this period." />
        </>
      ) : (
        <Unavailable />
      )}
    </Panel>
  );
}

function AveragePanel({ a }) {
  const data = a.averageByDay?.map((p) => ({ label: shortDay(p.date, a.days), long: longDay(p.date), value: Math.round(p.seconds / 60) }));
  return (
    <Panel
      title="Average study duration"
      subtitle={`Average length of a sitting, per day · ${fmtNum(a.sittings)} sittings`}
      action={<Stat label="Overall average" value={a.averageSittingSeconds != null ? fmtStudy(a.averageSittingSeconds) : "—"} />}
    >
      {data ? <ActivityBarChart data={data} title={`Average sitting length per day, last ${a.days} days`} format={fmtMin} emptyText="No sittings in this period." /> : <Unavailable />}
    </Panel>
  );
}

/** Weekday × 2-hour band heatmap (sequential, one hue). Hover / focus a cell for its value; table view for exact numbers. */
function PeriodsPanel({ a }) {
  const [hover, setHover] = useState(null);
  const [asTable, setAsTable] = useState(false);
  const tableId = useId();
  const grid = a.periods;
  const max = grid ? Math.max(1, ...grid.flat()) : 1;
  const level = useCallback((v) => (v <= 0 ? 0 : Math.min(5, 1 + Math.floor((v / max) * 4.999))), [max]);

  if (!grid) return <Panel title="Most active study periods"><Unavailable /></Panel>;
  let peak = { d: 0, b: 0, v: -1 };
  grid.forEach((row, d) => row.forEach((v, b) => v > peak.v && (peak = { d, b, v })));
  const describe = (d, b) => `${WEEKDAYS_LONG[d]} ${BANDS[b]}–${BANDS[(b + 1) % 12]}: ${fmtStudy(grid[d][b])}`;

  return (
    <Panel
      title="Most active study periods"
      subtitle={peak.v > 0 ? `Busiest: ${WEEKDAYS_LONG[peak.d]}s, ${BANDS[peak.b]}–${BANDS[(peak.b + 1) % 12]}` : "Study time by weekday and time of day"}
      action={
        <button type="button" onClick={() => setAsTable((t) => !t)} aria-expanded={asTable} aria-controls={tableId} className="cursor-pointer rounded-md text-xs font-bold text-primary-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
          {asTable ? "View as chart" : "View as table"}
        </button>
      }
    >
      {asTable ? (
        <div id={tableId} className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">Study time by weekday and two-hour period</caption>
            <thead>
              <tr className="border-b border-line text-fg-3">
                <th scope="col" className="py-1.5 pr-2 font-semibold">Day</th>
                {BANDS.map((b) => <th key={b} scope="col" className="px-1 py-1.5 text-right font-semibold">{b.slice(0, 2)}h</th>)}
              </tr>
            </thead>
            <tbody>
              {grid.map((row, d) => (
                <tr key={d} className="border-b border-line last:border-b-0">
                  <th scope="row" className="py-1.5 pr-2 font-semibold text-fg-2">{WEEKDAYS[d]}</th>
                  {row.map((v, b) => <td key={b} className="px-1 py-1.5 text-right tabular-nums text-fg">{Math.round(v / 3600)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-fg-3">Hours studied, rounded.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="relative grid grid-cols-[34px_repeat(12,minmax(0,1fr))] gap-[3px]" role="grid" aria-label="Study time by weekday and time of day">
            {grid.map((row, d) => (
              <div key={d} role="row" className="contents">
                <span role="rowheader" className="flex items-center text-[11px] font-semibold text-fg-3">{WEEKDAYS[d]}</span>
                {row.map((v, b) => {
                  const on = hover?.d === d && hover?.b === b;
                  return (
                    <span
                      key={b}
                      role="gridcell"
                      tabIndex={0}
                      aria-label={describe(d, b)}
                      onMouseEnter={() => setHover({ d, b })}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover({ d, b })}
                      onBlur={() => setHover(null)}
                      className={`relative h-7 rounded-[4px] outline-none transition-transform focus-visible:ring-2 focus-visible:ring-primary/60 ${HEAT[level(v)]} ${on ? "scale-110 ring-2 ring-surface" : ""}`}
                    >
                      {on && (
                        <span role="tooltip" className={`pointer-events-none absolute bottom-full z-20 mb-2 whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs shadow-raised ${b > 8 ? "right-0" : b < 3 ? "left-0" : "left-1/2 -translate-x-1/2"}`}>
                          <span className="block font-semibold text-fg-2">{WEEKDAYS_LONG[d]} · {BANDS[b]}–{BANDS[(b + 1) % 12]}</span>
                          <span className="block font-extrabold tabular-nums text-fg">{fmtStudy(v)}</span>
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            ))}
            <span aria-hidden="true" />
            {BANDS.map((b, i) => (
              <span key={b} aria-hidden="true" className={`text-center text-[10px] leading-4 text-fg-3 ${i % 2 ? "invisible sm:visible" : ""}`}>{b.slice(0, 2)}</span>
            ))}
          </div>
          <div className="flex items-center justify-end gap-1.5 text-[11px] text-fg-3" aria-hidden="true">
            Less
            {HEAT.map((c) => <span key={c} className={`size-3 rounded-[3px] ${c}`} />)}
            More
          </div>
        </div>
      )}
    </Panel>
  );
}

function TopRoomsPanel({ a, onOpenRoom }) {
  const rooms = a.topRooms;
  const max = Math.max(1, ...(rooms ?? []).map((r) => r.seconds));
  return (
    <Panel title="Most popular rooms" subtitle={`Most study time in the last ${a.days} days`} className="lg:col-span-2">
      {!rooms ? (
        <Unavailable />
      ) : rooms.length === 0 ? (
        <p className="flex min-h-[120px] items-center justify-center text-[13px] text-fg-2">No study time in this period yet.</p>
      ) : (
        <ol className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2" aria-label="Rooms ranked by study time">
          {rooms.map((r, i) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onOpenRoom(r.id)}
                className="group flex w-full cursor-pointer flex-col gap-1.5 rounded-xl p-2 text-left transition-colors hover:bg-surface-2/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <span className="flex items-center gap-2 text-sm">
                  <span className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-extrabold tabular-nums ${i === 0 ? "bg-highlight text-[#2a2000]" : "bg-surface-2 text-fg-2"}`}>{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-bold text-fg group-hover:underline">{r.title}</span>
                  <StudyRoomStatusBadge status={r.status} />
                </span>
                <span className="flex items-center gap-2 pl-8">
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                    <span className="block h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${Math.max(2, (r.seconds / max) * 100)}%` }} />
                  </span>
                  <span className="w-[72px] shrink-0 text-right text-xs font-bold tabular-nums text-fg">{fmtStudy(r.seconds)}</span>
                </span>
                <span className="pl-8 text-xs text-fg-3">{r.module} · {r.students} student{r.students === 1 ? "" : "s"}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

function Stat({ label, value, hint }) {
  return (
    <div className="flex flex-col items-end text-right">
      <span className="text-xs font-semibold text-fg-3">{label}</span>
      <span className="text-lg font-extrabold leading-6 tabular-nums text-fg">{value}</span>
      {hint && <span className="text-xs text-fg-3">{hint}</span>}
    </div>
  );
}
