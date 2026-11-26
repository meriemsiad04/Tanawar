import { useCallback, useState } from "react";
import Icon from "../../Components/uiC/Icon.jsx";
import Chips from "../../Components/uiC/Chips.jsx";
import ActivityBarChart from "../../Components/sharedC/ActivityBarChart.jsx";
import { useLiveQuery } from "../../hooks/useLiveQuery.js";
import { getSession } from "../../services/authService.js";
import { RANGES, getAdminOverview } from "../../services/adminDashboardService.js";

/**
 * Admin: Overview (/admin). Every number comes from GET /admin/overview (adminDashboardService);
 * a metric the server doesn't provide is shown as "not available", never as 0 or a placeholder value.
 * Refreshes every minute while the tab is visible (useLiveQuery); a failed refresh keeps the last data and says so.
 */

const REFRESH_MS = 60_000;

const PATHS = {
  students: "/admin/registrations",
  users: "/admin/users",
  sessions: "/admin/sessions",
  approvals: "/admin/sessions/approvals",
  study: "/admin/study",
  reports: "/admin/reports",
  resources: "/admin/resources",
  announcements: "/admin/announcements",
};

const nf = new Intl.NumberFormat();
const fmtNum = (v) => (v == null ? "—" : nf.format(v));
const fmtHours = (v) => (v == null ? "—" : `${nf.format(Math.round(v * 10) / 10)} h`);

function greeting(date = new Date()) {
  const h = date.getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
function relTime(iso, now = Date.now()) {
  const sec = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(sec);
  if (abs < 60) return "just now";
  if (abs < 3600) return rtf.format(Math.round(sec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(sec / 3600), "hour");
  if (abs < 30 * 86400) return rtf.format(Math.round(sec / 86400), "day");
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function errorCopy(err) {
  if (err?.code === "NOT_CONFIGURED") {
    return {
      title: "The server isn't connected yet",
      text: "Statistics appear here once the TANAWAR API is configured. Nothing is shown until then, so no number on this page is ever made up.",
    };
  }
  if (err?.status === 401) return { title: "Your session has expired", text: "Sign in again to see the dashboard." };
  if (err?.status === 403) return { title: "Admins only", text: "Your account doesn't have access to the admin dashboard." };
  return { title: "Couldn't load the dashboard", text: err?.message || "Something went wrong. Try again in a moment." };
}

/* ───────────── building blocks ───────────── */

function Panel({ title, subtitle, action, className = "", children }) {
  return (
    <section className={`flex min-w-0 flex-col gap-4 rounded-[20px] border border-line bg-surface p-[22px] ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
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

const PanelLink = ({ href, children }) => (
  <a href={href} className="inline-flex items-center gap-1 rounded-md text-sm font-bold leading-5 text-primary-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
    {children}
  </a>
);

/** "This data isn't provided by the server yet": distinct from an empty result. */
function Unavailable({ what, compact = false }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-bg px-4 text-center ${compact ? "py-5" : "min-h-[180px] py-8"}`}>
      <Icon name="inbox" className="text-fg-3" />
      <p className="text-sm font-bold text-fg">Not available yet</p>
      <p className="max-w-xs text-[13px] leading-[19px] text-fg-2">{what}</p>
    </div>
  );
}

const TONES = {
  blue: "bg-primary-soft text-primary-text",
  green: "bg-success-soft text-success-ink",
  warn: "bg-warn-soft text-warn",
};

function StatTile({ icon, tone = "blue", label, value, hint, href }) {
  const missing = value == null;
  return (
    <a
      href={href}
      className="group flex min-w-0 flex-col gap-3 rounded-[20px] border border-line bg-surface p-[18px] transition-[border-color,box-shadow,translate] duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-raised focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className="flex items-center justify-between">
        <span className={`flex size-10 items-center justify-center rounded-xl ${TONES[tone]}`}>
          <Icon name={icon} />
        </span>
        <span className="text-fg-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <Icon name="arrowUpRight" size="sm" />
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        <p className={`text-[28px] font-extrabold leading-8 tracking-[-0.01em] tabular-nums ${missing ? "text-fg-3" : "text-fg"}`}>{fmtNum(value)}</p>
        <p className="text-[13px] font-semibold leading-[19px] text-fg-2">{label}</p>
      </div>
      <p className="mt-auto text-xs leading-4 text-fg-3">{missing ? "Not available yet" : hint}</p>
    </a>
  );
}

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-[20px] bg-surface-2 motion-reduce:animate-none ${className}`} />;
}

function LoadingState() {
  return (
    <div role="status" aria-label="Loading the dashboard" className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-[164px]" />
        ))}
      </div>
      <Skeleton className="h-[92px]" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[300px]" />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ error, onRetry }) {
  const { title, text } = errorCopy(error);
  return (
    <section role="alert" className="flex flex-col items-center gap-3 rounded-[20px] border border-line bg-surface px-6 py-14 text-center">
      <span className="flex size-14 items-center justify-center rounded-[18px] bg-danger-soft text-live">
        <Icon name="alert" size="lg" />
      </span>
      <h2 className="text-lg font-extrabold leading-6 text-fg">{title}</h2>
      <p className="max-w-md text-sm leading-6 text-fg-2">{text}</p>
      {error?.code !== "NOT_CONFIGURED" && error?.status !== 403 && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 inline-flex h-[38px] cursor-pointer items-center gap-2 rounded-[10px] bg-primary px-3.5 text-sm font-bold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
        >
          <Icon name="flip" size="sm" /> Try again
        </button>
      )}
    </section>
  );
}

/* ───────────── sections ───────────── */

function StatsGrid({ stats }) {
  const { totalStudents, verifiedStudents, pendingVerifications, activeSessions, pendingSessionApprovals, unresolvedReports, studyParticipants } = stats;
  const verifiedPct = totalStudents && verifiedStudents != null ? Math.round((verifiedStudents / totalStudents) * 100) : null;
  const approvalParts = [pendingVerifications, pendingSessionApprovals];
  const pendingApprovals = approvalParts.every((v) => v == null) ? null : approvalParts.reduce((n, v) => n + (v ?? 0), 0);
  const part = (v, one, many) => (v == null ? `${many}: n/a` : `${fmtNum(v)} ${v === 1 ? one : many}`);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
      <StatTile icon="users" label="Total students" value={totalStudents} hint="Registered accounts" href={PATHS.users} />
      <StatTile
        icon="verified"
        tone="green"
        label="Verified students"
        value={verifiedStudents}
        hint={verifiedPct == null ? "Approved registrations" : `${verifiedPct}% of all students`}
        href={PATHS.students}
      />
      <StatTile icon="calendar" label="Active sessions" value={activeSessions} hint="Live now or upcoming" href={PATHS.sessions} />
      <StatTile
        icon="clipboard"
        tone={pendingApprovals ? "warn" : "blue"}
        label="Pending approvals"
        value={pendingApprovals}
        hint={`${part(pendingVerifications, "student", "students")} · ${part(pendingSessionApprovals, "session", "sessions")}`}
        href={PATHS.students}
      />
      <StatTile icon="flag" tone={unresolvedReports ? "warn" : "blue"} label="Unresolved reports" value={unresolvedReports} hint="Waiting for a moderator" href={PATHS.reports} />
      <StatTile icon="lamp" tone="green" label="Studying right now" value={studyParticipants} hint="Study With Me participants" href={PATHS.study} />
    </div>
  );
}

function QuickActions({ stats }) {
  const actions = [
    { label: "Manage students", hint: "Verify registrations", icon: "userCheck", href: PATHS.students, count: stats.pendingVerifications },
    { label: "Review sessions", hint: "Approve submitted sessions", icon: "clipboard", href: PATHS.approvals, count: stats.pendingSessionApprovals },
    { label: "Review reports", hint: "Moderate reported content", icon: "flag", href: PATHS.reports, count: stats.unresolvedReports },
    { label: "Create announcement", hint: "Message all students", icon: "megaphone", href: PATHS.announcements },
  ];
  return (
    <section aria-labelledby="quick-actions" className="flex flex-col gap-3">
      <h2 id="quick-actions" className="text-xs font-extrabold uppercase leading-4 tracking-[0.14em] text-fg-3">
        Quick actions
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map((a) => (
          <a
            key={a.label}
            href={a.href}
            className="group flex min-w-0 items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 transition-colors hover:border-success/50 hover:bg-success-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
              <Icon name={a.icon} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-bold leading-5 text-fg">{a.label}</span>
              <span className="truncate text-xs leading-4 text-fg-2">{a.hint}</span>
            </span>
            {a.count ? (
              <span className="rounded-full bg-success px-2 py-0.5 text-xs font-bold tabular-nums text-white" aria-label={`${a.count} pending`}>
                {a.count > 99 ? "99+" : a.count}
              </span>
            ) : (
              <span className="text-fg-3 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none">
                <Icon name="chevronRight" size="sm" />
              </span>
            )}
          </a>
        ))}
      </div>
    </section>
  );
}

function SeriesPanel({ title, data, total, days, format, unit, barClassName, integer = false, missing, emptyText }) {
  const subtitle = data ? `${format(total)} ${unit} in the last ${days} days${days > 31 ? " · by week" : ""}` : `Last ${days} days`;
  return (
    <Panel title={title} subtitle={subtitle}>
      {data ? <ActivityBarChart data={data} title={`${title}, last ${days} days`} format={format} emptyText={emptyText} barClassName={barClassName} integer={integer} /> : <Unavailable what={missing} />}
    </Panel>
  );
}

function PopularModules({ modules, days }) {
  const max = Math.max(1, ...(modules ?? []).map((m) => m.sessions));
  return (
    <Panel title="Popular modules" subtitle={`Most sessions in the last ${days} days`} action={<PanelLink href="/admin/modules">Modules</PanelLink>}>
      {!modules ? (
        <Unavailable what="Needs the sessions API: sessions per module are counted on the server." />
      ) : modules.length === 0 ? (
        <p className="flex min-h-[180px] items-center justify-center text-[13px] text-fg-2">No sessions in this period yet.</p>
      ) : (
        <ol className="flex flex-col gap-3.5" aria-label="Sessions per module">
          {modules.map((m, i) => (
            <li key={m.code ?? m.name} className="flex flex-col gap-1.5" title={`${m.name}: ${fmtNum(m.sessions)} sessions`}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-semibold text-fg">
                  <span className="mr-2 tabular-nums text-fg-3">{i + 1}</span>
                  {m.name}
                  {m.code && <span className="ml-1.5 text-xs font-normal text-fg-3">{m.code}</span>}
                </span>
                <span className="shrink-0 font-bold tabular-nums text-fg">{fmtNum(m.sessions)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, (m.sessions / max) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

const TASK_GROUPS = [
  { key: "verifications", label: "Student verifications", icon: "userCheck", href: PATHS.students, missing: "Registration queue unavailable." },
  { key: "sessionApprovals", label: "Session approvals", icon: "clipboard", href: PATHS.approvals, missing: "Needs the session approvals API." },
  { key: "reports", label: "Reports", icon: "flag", href: PATHS.reports, missing: "Needs the reports API." },
];

function PendingTasks({ tasks, now }) {
  return (
    <Panel title="Pending tasks" subtitle="Oldest first: these have waited the longest">
      <div className="flex flex-col divide-y divide-line">
        {TASK_GROUPS.map((g) => {
          const group = tasks[g.key];
          return (
            <div key={g.key} className="flex flex-col gap-2.5 py-4 first:pt-0 last:pb-0">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary-soft text-primary-text">
                  <Icon name={g.icon} size="sm" />
                </span>
                <h3 className="flex-1 text-[15px] font-bold text-fg">{g.label}</h3>
                {group && (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${group.total ? "bg-warn-soft text-warn" : "bg-success-soft text-success-ink"}`}
                  >
                    {group.total ? `${fmtNum(group.total)} waiting` : "All clear"}
                  </span>
                )}
              </div>
              {!group ? (
                <p className="text-[13px] leading-[19px] text-fg-3">Not available yet. {g.missing}</p>
              ) : group.total === 0 ? (
                <p className="flex items-center gap-1.5 text-[13px] text-fg-2">
                  <Icon name="check" size="sm" className="text-success" /> Nothing waiting for review.
                </p>
              ) : (
                <>
                  <ul className="flex flex-col gap-1">
                    {group.items.map((t) => (
                      <li key={t.id}>
                        <a href={g.href} className="flex items-center gap-3 rounded-xl px-2.5 py-2 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-sm font-semibold text-fg">{t.title}</span>
                            {t.meta && <span className="truncate text-xs text-fg-2">{t.meta}</span>}
                          </span>
                          {t.at && <span className="shrink-0 text-xs text-fg-3">{relTime(t.at, now)}</span>}
                        </a>
                      </li>
                    ))}
                  </ul>
                  <PanelLink href={g.href}>
                    Review all {fmtNum(group.total)} <Icon name="chevronRight" size="sm" />
                  </PanelLink>
                </>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

const ACTIVITY = {
  registration: { icon: "userPlus", tone: "blue", text: (a) => <><b>{a.actor}</b> registered and is waiting for verification</> },
  resubmission: { icon: "upload", tone: "blue", text: (a) => <><b>{a.actor}</b> resubmitted their verification documents</> },
  approval: { icon: "verified", tone: "green", text: (a) => <><b>{a.actor}</b> approved <b>{a.subject}</b>’s registration</> },
  rejection: { icon: "userX", tone: "warn", text: (a) => <><b>{a.actor}</b> rejected <b>{a.subject}</b>’s registration</> },
  session: { icon: "calendarPlus", tone: "blue", text: (a) => <><b>{a.actor}</b> created the session <b>{a.subject}</b></> },
  sessionApproval: { icon: "clipboard", tone: "green", text: (a) => <><b>{a.actor}</b> approved the session <b>{a.subject}</b></> },
  resource: { icon: "file", tone: "blue", text: (a) => <><b>{a.actor}</b> uploaded <b>{a.subject}</b></> },
  report: { icon: "flag", tone: "warn", text: (a) => <><b>{a.actor}</b> reported <b>{a.subject}</b></> },
  studyRoom: { icon: "lamp", tone: "green", text: (a) => <><b>{a.actor}</b> opened the study room <b>{a.subject}</b></> },
};

function RecentActivity({ activity, now }) {
  return (
    <Panel title="Recent activity" subtitle="Registrations, sessions, approvals and uploads">
      {!activity ? (
        <Unavailable what="Needs the activity API." />
      ) : activity.length === 0 ? (
        <p className="flex min-h-[180px] items-center justify-center text-[13px] text-fg-2">No activity yet.</p>
      ) : (
        <ol className="flex flex-col">
          {activity.map((a, i) => {
            const meta = ACTIVITY[a.type];
            return (
              <li key={a.id} className="relative flex gap-3 pb-4 last:pb-0">
                {i < activity.length - 1 && <span aria-hidden="true" className="absolute bottom-0 left-[17px] top-9 w-px bg-line" />}
                <span className={`relative flex size-9 shrink-0 items-center justify-center rounded-full ${TONES[meta.tone]}`}>
                  <Icon name={meta.icon} size="sm" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-1">
                  <p className="text-sm leading-5 text-fg-2 [&_b]:font-bold [&_b]:text-fg">{meta.text(a)}</p>
                  <time dateTime={a.at} title={new Date(a.at).toLocaleString()} className="text-xs text-fg-3">
                    {relTime(a.at, now)}
                  </time>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}

/* ───────────── page ───────────── */

export default function DashboardP() {
  const [days, setDays] = useState(30);
  const load = useCallback(() => getAdminOverview(days), [days]);
  const { status, data, error, stale, refresh } = useLiveQuery(load, REFRESH_MS);
  const firstName = getSession()?.user?.fullName?.split(" ")[0];
  // Relative times are measured from the server's clock, not the browser's (only used once data exists).
  const now = data ? new Date(data.serverTime).getTime() : 0;

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-extrabold uppercase leading-4 tracking-[0.14em] text-success-ink">Administration · Overview</p>
          <h1 className="font-serif text-[clamp(26px,2.1vw,30px)] font-bold leading-[1.27] tracking-[-0.005em] text-fg">
            {greeting()}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-[15px] leading-[23px] text-fg-2">Here’s what’s happening on TANAWAR and what needs your attention.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Chips label="Period" value={days} options={RANGES} onChange={setDays} size="s" />
          <button
            type="button"
            onClick={refresh}
            disabled={status === "loading"}
            className="inline-flex h-[30px] cursor-pointer items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 text-xs font-bold text-fg-2 hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="flip" size="sm" className="!size-3.5" /> Refresh
          </button>
        </div>
      </header>

      {data && (
        <p className="-mt-3 flex items-center gap-1.5 text-xs text-fg-3" aria-live="polite">
          {stale ? (
            <>
              <Icon name="warning" size="sm" className="!size-3.5 text-warn" /> Couldn’t refresh. Showing data from {new Date(data.serverTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. Retrying…
            </>
          ) : (
            <>
              <span className="size-2 rounded-full bg-success" aria-hidden="true" /> Updated {new Date(data.serverTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · refreshes every minute
            </>
          )}
        </p>
      )}

      {status === "loading" && !data ? (
        <LoadingState />
      ) : status === "error" && !data ? (
        <ErrorState error={error} onRetry={refresh} />
      ) : (
        <>
          <StatsGrid stats={data.stats} />
          <QuickActions stats={data.stats} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SeriesPanel
              title="Student registrations"
              data={data.series.registrations}
              total={data.totals.registrations}
              days={data.days}
              format={fmtNum}
              unit="new accounts"
              integer
              missing="Needs the registrations API."
              emptyText="No new registrations in this period."
            />
            <SeriesPanel
              title="Session activity"
              data={data.series.sessions}
              total={data.totals.sessions}
              days={data.days}
              format={fmtNum}
              unit="sessions held"
              integer
              missing="Needs the sessions API: sessions held per day are counted on the server."
              emptyText="No sessions in this period."
            />
            <PopularModules modules={data.popularModules} days={data.days} />
            <SeriesPanel
              title="Study hours"
              data={data.series.studyHours}
              total={data.totals.studyHours}
              days={data.days}
              format={fmtHours}
              unit="studied together"
              barClassName="bg-success"
              missing="Needs the Study With Me API."
              emptyText="Nobody studied in a room in this period."
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <PendingTasks tasks={data.tasks} now={now} />
            <RecentActivity activity={data.activity} now={now} />
          </div>
        </>
      )}
    </>
  );
}
