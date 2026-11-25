import { useMemo, useState } from "react";
import Button from "../../Components/uiC/Button.jsx";
import Icon from "../../Components/uiC/Icon.jsx";
import Chips from "../../Components/uiC/Chips.jsx";
import KpiCard from "../../Components/sharedC/KpiCard.jsx";
import ContributionHeatmap from "../../Components/sharedC/ContributionHeatmap.jsx";
import ActivityBarChart from "../../Components/sharedC/ActivityBarChart.jsx";
import RatingStars from "../../Components/sharedC/RatingStars.jsx";
import { useAsync } from "../../hooks/useAsync.js";
import { getActivity } from "../../services/activityService.js";

const loadActivity = () => getActivity();

const SOURCE_NAMES = { attendance: "attendance", hosted: "hosted sessions", rating: "reviews", resources: "resources" };
const fmtHours = (h) => (Number.isInteger(h) ? `${h} h` : `${h.toFixed(1)} h`);
const fmtDay = (iso) => new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function Panel({ title, subtitle, action, children, className = "" }) {
  return (
    <section className={`flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-5 sm:p-[22px] ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-lg font-extrabold leading-6 text-fg">{title}</h2>
          {subtitle && <p className="text-[13px] leading-[19px] text-fg-2">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

const Note = ({ children }) => (
  <div className="flex flex-col items-start gap-3 rounded-[18px] border border-line bg-surface p-5 text-[13px] leading-[19px] text-fg-2">{children}</div>
);

/* ───────────── Streak ───────────── */

function StreakCard({ streaks }) {
  const { current, longest, activeDays, activeThisMonth, activeToday } = streaks;
  const message =
    current === 0
      ? "No streak right now. Join or host a session today to start one."
      : activeToday
        ? "You’re active today. Keep it going tomorrow!"
        : "Be active today to keep your streak alive.";
  return (
    <section aria-label="Consistency streak" className="relative flex flex-col gap-5 overflow-hidden rounded-[22px] bg-ink p-6 text-white">
      <span aria-hidden="true" className="absolute -right-16 -top-16 size-48 rounded-full bg-highlight/25 blur-3xl" />
      <div className="relative flex items-center gap-2 text-xs font-extrabold uppercase leading-4 tracking-[0.14em] text-on-dark-2">
        <Icon name="flame" size="sm" className="!size-4 text-highlight" /> Consistency streak
      </div>
      <div className="relative flex items-end gap-3">
        <span className="text-[56px] font-extrabold leading-none tracking-[-0.02em]">{current}</span>
        <span className="pb-1.5 text-lg font-bold text-on-dark-2">{current === 1 ? "day" : "days"} in a row</span>
      </div>
      <p className="relative text-[13px] leading-[19px] text-on-dark-2">{message}</p>
      <dl className="relative grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
        {[
          ["Longest", plural(longest, "day", "days")],
          ["Active days", activeDays],
          ["This month", plural(activeThisMonth, "day", "days")],
        ].map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-on-dark-2">{label}</dt>
            <dd className="text-base font-extrabold">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ───────────── Timeline ───────────── */

const EVENT_STYLE = {
  attended: { icon: "cap", tile: "bg-primary-soft text-primary-text", label: "Sessions" },
  hosted: { icon: "users", tile: "bg-accent-soft text-accent-ink", label: "Hosting" },
  shared: { icon: "share", tile: "bg-warn-soft text-warn", label: "Resources" },
  review: { icon: "star", tile: "bg-highlight/15 text-warn", label: "Reviews" },
};
const TIMELINE_FILTERS = [{ value: "", label: "All" }, ...Object.entries(EVENT_STYLE).map(([value, s]) => ({ value, label: s.label }))];
const PAGE = 12;

function EventText({ e }) {
  switch (e.type) {
    case "attended":
      return e.sessions.length ? (
        <>Attended <b className="text-fg">{e.sessions.map((s) => s.title).join(", ")}</b></>
      ) : (
        <>Attended <b className="text-fg">{plural(e.count, "session", "sessions")}</b></>
      );
    case "hosted":
      return (
        <>
          {e.live ? "Hosting now" : "Hosted"} <b className="text-fg">{e.title}</b>
          {e.module && <span className="text-fg-3"> · {e.module}</span>}
          {Number.isFinite(e.booked) && <span className="text-fg-3"> · {plural(e.booked, "student", "students")}</span>}
        </>
      );
    case "shared":
      return (
        <>Shared <b className="text-fg">{e.title}</b>{e.module && <span className="text-fg-3"> · {e.module}</span>}</>
      );
    case "review":
      return (
        <span className="flex flex-col gap-1">
          <span>
            <b className="text-fg">{e.author}</b> reviewed you
          </span>
          <RatingStars value={e.rating} />
          {e.comment && <span className="text-fg-2">“{e.comment}”</span>}
        </span>
      );
    default:
      return null;
  }
}

function Timeline({ events }) {
  const [type, setType] = useState("");
  const [shown, setShown] = useState(PAGE);
  const list = type ? events.filter((e) => e.type === type) : events;

  // Month headers keep a long history readable.
  const groups = [];
  for (const e of list.slice(0, shown)) {
    const month = new Date(e.at).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    if (groups.at(-1)?.month !== month) groups.push({ month, items: [] });
    groups.at(-1).items.push(e);
  }

  return (
    <Panel title="Activity timeline" subtitle="Everything you did, newest first.">
      <Chips label="Filter activity" value={type} options={TIMELINE_FILTERS} onChange={(v) => (setType(v), setShown(PAGE))} size="s" />
      {list.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-fg-2">
          {events.length === 0 ? "Your activity will appear here as you join sessions, host and share." : "Nothing of this kind yet."}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((g) => (
            <div key={g.month} className="flex flex-col gap-2">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-fg-3">{g.month}</p>
              <ol className="relative flex flex-col gap-3 before:absolute before:bottom-2 before:left-[17px] before:top-2 before:w-px before:bg-line">
                {g.items.map((e) => {
                  const s = EVENT_STYLE[e.type];
                  return (
                    <li key={e.id} className="relative flex items-start gap-3">
                      <span className={`relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full ring-4 ring-surface ${s.tile}`}>
                        <Icon name={s.icon} size="sm" className="!size-4" />
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-1.5">
                        <div className="text-sm leading-5 text-fg-2"><EventText e={e} /></div>
                        <time dateTime={e.at} className="text-xs text-fg-3">{fmtDay(e.at)}</time>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
          {list.length > shown && (
            <Button variant="outline" size="s" className="self-center" onClick={() => setShown((n) => n + PAGE)}>
              Show more ({list.length - shown})
            </Button>
          )}
        </div>
      )}
    </Panel>
  );
}

/* ───────────── Achievements ───────────── */

function Achievements({ items }) {
  const unlocked = items.filter((a) => a.unlocked).length;
  const groups = [...new Set(items.map((a) => a.group))];
  return (
    <Panel
      title="Achievements"
      subtitle={`${unlocked} of ${items.length} unlocked`}
      action={
        <span className="flex size-10 items-center justify-center rounded-xl bg-highlight/15 text-warn">
          <Icon name="trophy" />
        </span>
      }
    >
      <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-label="Achievements unlocked" aria-valuenow={unlocked} aria-valuemin={0} aria-valuemax={items.length}>
        <span className="block h-full rounded-full bg-highlight" style={{ width: `${(unlocked / items.length) * 100}%` }} />
      </div>
      {groups.map((g) => (
        <div key={g} className="flex flex-col gap-2">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-fg-3">{g}</p>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {items
              .filter((a) => a.group === g)
              .map((a) => (
                <li
                  key={a.id}
                  className={`flex items-start gap-3 rounded-[14px] border p-3 ${a.unlocked ? "border-accent-line bg-accent-soft/50" : "border-line"}`}
                >
                  <span
                    className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${a.unlocked ? "bg-primary text-white" : "bg-surface-2 text-fg-3"}`}
                  >
                    <Icon name={a.unlocked ? a.icon : "lock"} size="sm" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className={`text-sm font-bold leading-5 ${a.unlocked ? "text-fg" : "text-fg-2"}`}>
                      {a.title}
                      {a.unlocked && <span className="sr-only"> (unlocked)</span>}
                    </span>
                    <span className="text-xs leading-4 text-fg-2">{a.text}</span>
                    {!a.unlocked && (
                      <span className="flex items-center gap-2">
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                          <span className="block h-full rounded-full bg-primary" style={{ width: `${(a.current / a.target) * 100}%` }} />
                        </span>
                        <span className="text-[11px] font-bold tabular-nums text-fg-3">
                          {Math.floor(a.current)}/{a.target}
                        </span>
                      </span>
                    )}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </Panel>
  );
}

/* ───────────── Page ───────────── */

const PERIODS = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];
const METRICS = [
  { value: "sessions", label: "Sessions" },
  { value: "hours", label: "Hours" },
];

/**
 * Activity & Consistency (/app/activity): overview, heatmap, streaks, weekly/monthly charts, timeline, achievements.
 * Everything is computed from the student's real records (activityService); nothing is estimated.
 */
export default function ActivityP() {
  const { status, data, error, reload } = useAsync(loadActivity);
  const [period, setPeriod] = useState("weekly");
  const [metric, setMetric] = useState("sessions");

  const chart = useMemo(() => {
    if (!data) return [];
    return data[period].map((b) => ({ label: b.label, long: b.long, value: metric === "hours" ? b.hours : b.sessions }));
  }, [data, period, metric]);
  const periodTotal = chart.reduce((n, b) => n + b.value, 0);
  const activeBuckets = chart.filter((b) => b.value > 0).length;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-serif text-[30px] font-bold leading-[38px] tracking-[-0.005em] text-fg">Activity &amp; consistency</h1>
          <p className="text-[15px] leading-[23px] text-fg-2">Your learning over the last 12 months: what you attended, hosted and shared.</p>
        </div>
      </div>

      {status === "loading" ? (
        <Note>Loading your activity…</Note>
      ) : status === "error" ? (
        <Note>
          {error?.code === "NOT_CONFIGURED" ? "Your activity will appear here once the server is connected." : "Your activity isn’t available right now."}
          <Button variant="outline" size="s" onClick={reload}>Try again</Button>
        </Note>
      ) : (
        <>
          {data.failed.length > 0 && (
            <p role="status" className="flex items-start gap-2 rounded-[14px] border border-line bg-warn-soft px-4 py-3 text-[13px] leading-[19px] text-fg">
              <Icon name="alert" size="sm" className="mt-px text-warn" />
              <span>
                Some data couldn’t be loaded ({data.failed.map((f) => SOURCE_NAMES[f]).join(", ")}), so these numbers may be incomplete.{" "}
                <button type="button" onClick={reload} className="cursor-pointer font-bold text-primary-text hover:underline">Retry</button>
              </span>
            </p>
          )}

          {data.isEmpty && (
            <section className="flex flex-col items-start gap-4 rounded-[22px] border border-accent-line bg-accent-soft p-6 sm:flex-row sm:items-center">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-white">
                <Icon name="activity" size="lg" />
              </span>
              <div className="flex flex-1 flex-col gap-1">
                <p className="text-lg font-extrabold text-fg">Your activity starts here</p>
                <p className="text-sm leading-5 text-fg-2">
                  Join your first session, host one or share a resource. Every active day fills your calendar, builds your streak and unlocks achievements.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href="/app/sessions" className="contents"><Button size="s" tabIndex={-1}>Browse sessions</Button></a>
                <a href="/app" className="contents"><Button size="s" variant="outline" tabIndex={-1}>Host a session</Button></a>
              </div>
            </section>
          )}

          {/* Overview */}
          <section aria-label="Activity overview" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard icon="cap" value={data.totals.attended} label="Sessions attended" />
            <KpiCard icon="users" value={data.totals.hosted} label="Sessions hosted" />
            <KpiCard
              icon="clock"
              value={fmtHours(data.totals.learningHours)}
              label="Learning hours"
              hint={data.hoursComplete ? undefined : "Hosted sessions only; attended durations aren’t recorded yet"}
            />
            <KpiCard icon="share" value={data.totals.resourcesShared} label="Resources shared" />
          </section>

          {/* Streak + heatmap */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
            <StreakCard streaks={data.streaks} />
            <Panel title="Learning activity" subtitle="Each square is a day: sessions attended, sessions hosted and resources shared.">
              <ContributionHeatmap
                data={data.heatmap}
                unit="activity"
                unitPlural="activities"
                summary="in the last year"
                describe={(cell) => {
                  const d = data.days.get(cell.key);
                  const when = cell.date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
                  if (!d) return `No activity · ${when}`;
                  const parts = [d.attended && plural(d.attended, "attended", "attended"), d.hosted && plural(d.hosted, "hosted", "hosted"), d.shared && plural(d.shared, "shared", "shared")].filter(Boolean);
                  return `${parts.join(" · ")} · ${when}`;
                }}
              />
            </Panel>
          </div>

          {/* Weekly / monthly statistics */}
          <Panel
            title={`${period === "weekly" ? "Weekly" : "Monthly"} ${metric === "hours" ? "learning hours" : "sessions"}`}
            subtitle={
              metric === "hours"
                ? `${fmtHours(Math.round(periodTotal * 10) / 10)} over the last 12 ${period === "weekly" ? "weeks" : "months"}${data.hoursComplete ? "" : " (hosted time only)"}`
                : `${periodTotal} sessions attended or hosted over the last 12 ${period === "weekly" ? "weeks" : "months"} · active in ${activeBuckets} of 12`
            }
            action={
              <div className="flex flex-wrap gap-3">
                <Chips label="Period" value={period} options={PERIODS} onChange={setPeriod} size="s" />
                <Chips label="Measure" value={metric} options={METRICS} onChange={setMetric} size="s" />
              </div>
            }
          >
            <ActivityBarChart
              data={chart}
              title={`${period === "weekly" ? "Weekly" : "Monthly"} ${metric === "hours" ? "learning hours" : "sessions"}, last 12 ${period === "weekly" ? "weeks" : "months"}`}
              format={metric === "hours" ? fmtHours : (v) => String(v)}
              emptyText={data.isEmpty ? "Your first sessions will show up here." : "No activity in this period yet."}
            />
          </Panel>

          {/* Timeline + achievements */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:items-start">
            <Timeline events={data.events} />
            <Achievements items={data.achievements} />
          </div>
        </>
      )}
    </>
  );
}
