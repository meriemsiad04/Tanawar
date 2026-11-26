import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Button from "../../../Components/uiC/Button.jsx";
import Icon from "../../../Components/uiC/Icon.jsx";
import Avatar from "../../../Components/uiC/Avatar.jsx";
import AccountStatusBadge from "../../../Components/sharedC/AccountStatusBadge.jsx";
import StudyRoomStatusBadge from "../../../Components/sharedC/StudyRoomStatusBadge.jsx";
import { useDialog } from "../../../hooks/useDialog.js";
import { useNow } from "../../../hooks/useNow.js";
import { liveSeconds } from "../../../services/studyRoomsService.js";
import {
  ACTIVITY_TYPES,
  NOTE_MAX,
  REPORT_STATUS,
  ROOM_ACTIONS,
  addStudyRoomNote,
  answerStudyReport,
  fmtNum,
  fmtStudy,
  getStudyRoomAdmin,
} from "../../../services/adminStudyRoomsService.js";
import { adminErrorText, fmtDateTime, initialsOf } from "../students/format.js";
import { ErrorLine } from "../sessions/SessionActionDialog.jsx";
import { textareaCls } from "../sessions/sessionFormat.js";
import RoomActionDialog from "./RoomActionDialog.jsx";

const TONES = {
  blue: "bg-primary-soft text-primary-text",
  green: "bg-success-soft text-success-ink",
  warn: "bg-warn-soft text-warn",
  red: "bg-danger-soft text-live",
  neutral: "bg-surface-2 text-fg-2",
};

const TABS = [
  { key: "participants", label: "Participants", icon: "users" },
  { key: "activity", label: "Activity", icon: "activity" },
  { key: "reports", label: "Reports", icon: "flag" },
];

const profileHref = (p) => (p?.profileLinkable ? `/admin/users?student=${encodeURIComponent(p.id)}` : null);

/**
 * Admin study room details: room info, host, participants with their individual study time (live for those studying
 * now), activity history, reports (with the reported students) and internal notes, plus close / reopen and
 * remove / warn a participant. Previous / Next walk through the table's current page. `tab` picks the opening tab.
 */
export default function StudyRoomDetailDialog({ id, tab: initialTab = "participants", position, onPrev, onNext, onClose, onChanged }) {
  const panelRef = useRef(null);
  const titleId = useId();
  const [tick, setTick] = useState(0);
  const [state, setState] = useState({ id: null, room: null, error: null });
  const [tab, setTab] = useState(initialTab);
  const [action, setAction] = useState(null); // { key, participant? }
  const [error, setError] = useState("");
  const onKeyDown = useDialog(panelRef, () => !action && onClose());

  useEffect(() => {
    let active = true;
    getStudyRoomAdmin(id).then(
      (room) => active && setState({ id, room, error: null }),
      (error) => active && setState((prev) => ({ id, room: prev.id === id ? prev.room : null, error }))
    );
    return () => {
      active = false;
    };
  }, [id, tick]);

  const r = state.id === id ? state.room : null;
  const loadError = state.id === id ? state.error : null;
  const reload = () => setTick((t) => t + 1);
  const refresh = (message) => {
    setError("");
    reload();
    onChanged?.(message);
  };

  const onKey = (e) => {
    onKeyDown(e);
    if (action || e.target.closest("textarea, input, [role=tab]")) return;
    if (e.key === "ArrowLeft" && onPrev) onPrev();
    if (e.key === "ArrowRight" && onNext) onNext();
  };

  const openReports = r?.reports?.filter((x) => x.status === "open").length ?? 0;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4" onKeyDown={onKey}>
      <div aria-hidden="true" onClick={onClose} className="animate-overlay-in fixed inset-0 bg-ink/60 backdrop-blur-md dark:bg-black/60" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="animate-dialog-in relative flex max-h-[100dvh] w-full max-w-[1120px] flex-col overflow-hidden border border-line bg-surface shadow-pop outline-none sm:max-h-[92vh] sm:rounded-[20px]"
      >
        <header className="flex items-start gap-3 border-b border-line px-5 py-4 sm:px-6">
          <span className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-accent-soft text-accent-ink">
            <Icon name="lamp" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="line-clamp-2 break-words text-lg font-extrabold leading-6 text-fg">{r?.title ?? "Study room"}</h2>
            {r && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <StudyRoomStatusBadge status={r.status} />
                {r.module && <Pill icon="books">{r.module}</Pill>}
                <Pill icon={r.visibility === "private" ? "lock" : "globe"}>{r.visibility === "private" ? "Private" : "Public"}</Pill>
                {openReports > 0 && <Pill icon="flag" className="bg-warn-soft !text-warn">{openReports} open report{openReports === 1 ? "" : "s"}</Pill>}
              </div>
            )}
          </div>
          {position && (
            <span className="hidden rounded-full border border-line px-3 py-1 text-[13px] font-semibold text-fg-2 sm:inline" aria-label={`Room ${position.index} of ${position.total}`}>
              {position.index} / {position.total}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-surface-2 text-fg-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <Icon name="close" size="sm" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {!r && loadError ? (
            <div role="alert" className="flex flex-col items-center gap-3 px-6 py-16 text-center text-sm text-fg-2">
              <Icon name="warning" size="lg" className="text-warn" />
              <p>{adminErrorText(loadError, "We couldn't load this room.")}</p>
              <Button size="s" variant="outline" onClick={reload}>Try again</Button>
            </div>
          ) : !r ? (
            <DetailSkeleton />
          ) : (
            <div className="grid grid-cols-1 gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <div className="flex min-w-0 flex-col gap-5">
                <RoomInfo room={r} />
                <div className="flex flex-col gap-3">
                  <div role="tablist" aria-label="Room details" className="inline-flex w-fit gap-1 rounded-[14px] bg-surface-2 p-1">
                    {TABS.map((t) => {
                      const count = t.key === "participants" ? r.participants?.length : t.key === "reports" ? openReports || null : null;
                      return (
                        <button
                          key={t.key}
                          type="button"
                          role="tab"
                          id={`room-tab-${t.key}`}
                          aria-selected={tab === t.key}
                          aria-controls={`room-panel-${t.key}`}
                          onClick={() => setTab(t.key)}
                          className={`flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] px-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 ${
                            tab === t.key ? "bg-surface text-fg shadow-sm" : "text-fg-2 hover:text-fg"
                          }`}
                        >
                          <Icon name={t.icon} size="sm" className="!size-4" />
                          {t.label}
                          {count ? <span className={`rounded-full px-1.5 text-[11px] ${t.key === "reports" ? "bg-warn-soft text-warn" : "bg-surface-2 text-fg-2"}`}>{count}</span> : null}
                        </button>
                      );
                    })}
                  </div>
                  <div role="tabpanel" id={`room-panel-${tab}`} aria-labelledby={`room-tab-${tab}`} key={tab} className="animate-dialog-in">
                    {tab === "participants" && <ParticipantsPanel room={r} onAction={(key, participant) => setAction({ key, participant })} />}
                    {tab === "activity" && <ActivityPanel room={r} />}
                    {tab === "reports" && (
                      <ReportsPanel room={r} onAnswered={refresh} onAction={(key, participant) => setAction({ key, participant })} />
                    )}
                  </div>
                </div>
              </div>
              <div className="flex min-w-0 flex-col gap-5">
                <ModerationCard room={r} error={error} onAction={(key) => setAction({ key })} />
                <HostCard host={r.host} />
                <NotesCard key={r.id} room={r} onAdded={() => refresh("")} />
              </div>
            </div>
          )}
        </div>

        {(onPrev || onNext) && (
          <footer className="flex items-center justify-between gap-3 border-t border-line px-5 py-3.5 sm:px-6">
            <Button size="s" variant="outline" disabled={!onPrev} onClick={onPrev}>
              <Icon name="chevronLeft" size="sm" /> Previous
            </Button>
            {position && <span className="text-[13px] font-semibold text-fg-2 sm:hidden">{position.index} / {position.total}</span>}
            <Button size="s" variant="outline" disabled={!onNext} onClick={onNext}>
              Next <Icon name="chevronRight" size="sm" />
            </Button>
          </footer>
        )}
      </div>

      {action && r && (
        <RoomActionDialog
          action={action.key}
          room={r}
          participant={action.participant}
          onCancel={() => setAction(null)}
          onConflict={(message) => {
            setAction(null);
            setError(message);
            reload();
            onChanged?.("");
          }}
          onDone={(message) => {
            setAction(null);
            refresh(message);
          }}
        />
      )}
    </div>,
    document.body
  );
}

/* ───────────── Left column ───────────── */

function RoomInfo({ room: r }) {
  const now = useNow();
  const total = r.totalSeconds != null ? r.totalSeconds + liveSeconds(0, r.status === "active", r, now) * r.activeCount : null;
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle>Room</SectionTitle>
      <div className="flex flex-col gap-4 rounded-2xl border border-line p-4">
        {r.description ? <p className="whitespace-pre-line break-words text-sm leading-6 text-fg">{r.description}</p> : <p className="text-sm text-fg-3">No description.</p>}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <MiniStat icon="activity" label="Studying now" value={fmtNum(r.activeCount)} live={r.activeCount > 0} />
          <MiniStat icon="users" label="Participants" value={fmtNum(r.participantCount)} />
          <MiniStat icon="timer" label="Study time" value={fmtStudy(total)} />
          <MiniStat icon="flag" label="Open reports" value={fmtNum(r.openReports)} />
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13px] sm:grid-cols-3">
          <Field label="Module" value={r.module} />
          <Field label="Created" value={fmtDateTime(r.createdAt)} />
          <Field label="Last activity" value={r.status === "active" ? "Now" : fmtDateTime(r.lastActivityAt)} />
        </dl>
      </div>
    </section>
  );
}

function ParticipantsPanel({ room: r, onAction }) {
  const now = useNow();
  const list = r.participants;
  const [showAll, setShowAll] = useState(false);
  if (list == null) return <Box><Unavailable>The list of participants isn't available yet.</Unavailable></Box>;
  if (list.length === 0) return <Box><Empty icon="users">Nobody has studied in this room yet.</Empty></Box>;
  const active = list.filter((p) => p.active);
  const past = list.filter((p) => !p.active);
  const shownPast = showAll ? past : past.slice(0, 8);
  const max = Math.max(1, ...list.map((p) => liveSeconds(p.seconds, p.active, r, now)));

  const row = (p) => {
    const total = liveSeconds(p.seconds, p.active, r, now);
    const href = profileHref(p);
    return (
      <li key={p.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="relative">
            <Avatar initials={initialsOf(p.fullName)} src={p.avatarUrl} size={34} className="bg-accent-soft !text-accent-ink" />
            {p.active && <span aria-hidden="true" className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-surface bg-success" />}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex items-center gap-1.5">
              {href ? (
                <a href={href} className="truncate text-[13px] font-bold text-fg hover:underline">{p.fullName}</a>
              ) : (
                <span className="truncate text-[13px] font-bold text-fg">{p.fullName}</span>
              )}
              {p.id === r.host.id && <span className="rounded-full bg-highlight/25 px-1.5 text-[10px] font-bold uppercase tracking-wide text-fg">Host</span>}
              {p.warned && <span title="Warned by an admin" className="text-warn"><Icon name="shieldAlert" size="sm" className="!size-3.5" /></span>}
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                <span className="block h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${Math.max(2, (total / max) * 100)}%` }} />
              </span>
              <span className="w-[68px] shrink-0 text-right text-xs font-bold tabular-nums text-fg">{fmtStudy(total)}</span>
            </span>
            <span className="truncate text-xs text-fg-3">
              {p.active
                ? `Studying now · this sitting ${fmtStudy(liveSeconds(p.sittingSeconds, true, r, now))}`
                : `Last seen ${fmtDateTime(p.lastSeenAt)}`}
              {p.sittings != null && ` · ${p.sittings} sitting${p.sittings === 1 ? "" : "s"}`}
            </span>
          </span>
        </div>
        <div className="flex shrink-0 gap-1.5 pl-11 sm:pl-0">
          {p.active && r.status === "active" && (
            <IconAction icon="userMinus" label={`Remove ${p.fullName} from the room`} tone="red" onClick={() => onAction("removeParticipant", p)} />
          )}
          <IconAction icon="shieldAlert" label={`Warn ${p.fullName}`} tone="warn" onClick={() => onAction("warn", p)} />
        </div>
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <Box>
        <h4 className="mb-3 flex items-center gap-2 text-[13px] font-bold text-fg">
          <span aria-hidden="true" className={`size-2 rounded-full ${active.length ? "animate-pulse bg-success motion-reduce:animate-none" : "bg-line-strong"}`} />
          Studying now <span className="font-normal text-fg-3">({active.length})</span>
        </h4>
        {active.length ? <ul className="flex flex-col divide-y divide-line">{active.map(row)}</ul> : <p className="text-[13px] text-fg-2">Nobody is studying here right now.</p>}
      </Box>
      {past.length > 0 && (
        <Box>
          <h4 className="mb-3 text-[13px] font-bold text-fg">
            Studied here before <span className="font-normal text-fg-3">({past.length})</span>
          </h4>
          <ul className="flex flex-col divide-y divide-line">{shownPast.map(row)}</ul>
          {past.length > shownPast.length && (
            <button type="button" onClick={() => setShowAll(true)} className="mt-3 cursor-pointer text-[13px] font-bold text-primary-text hover:underline">
              Show all {past.length}
            </button>
          )}
        </Box>
      )}
    </div>
  );
}

const ACTIVITY_FILTERS = [
  { key: "all", label: "All" },
  { key: "moderation", label: "Moderation", types: ["closed", "reopened", "participant_removed", "user_warned", "note_added", "report_resolved", "report_dismissed", "reported"] },
  { key: "presence", label: "Joins & leaves", types: ["joined", "left", "timeout", "created"] },
];

function ActivityPanel({ room: r }) {
  const [filter, setFilter] = useState("all");
  const entries = r.activity;
  if (entries == null) return <Box><Unavailable>The activity history isn't available yet.</Unavailable></Box>;
  const types = ACTIVITY_FILTERS.find((f) => f.key === filter)?.types;
  const shown = types ? entries.filter((e) => types.includes(e.type)) : entries;
  return (
    <Box>
      <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Filter activity">
        {ACTIVITY_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={`h-[28px] cursor-pointer rounded-full px-3 text-xs font-bold transition-colors ${filter === f.key ? "bg-primary text-white" : "border border-line-strong text-fg-2 hover:bg-surface-2"}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <Empty icon="logs">Nothing in this category.</Empty>
      ) : (
        <ol className="relative flex flex-col gap-3.5 before:absolute before:bottom-2 before:left-4 before:top-2 before:w-px before:bg-line">
          {shown.map((e) => {
            const m = ACTIVITY_TYPES[e.type] ?? { label: String(e.type).replace(/_/g, " "), icon: "logs", tone: "neutral" };
            return (
              <li key={e.id} className="relative flex gap-3">
                <span className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-surface ${TONES[m.tone]}`}>
                  <Icon name={m.icon} size="sm" className="!size-4" />
                </span>
                <div className="flex min-w-0 flex-col gap-0.5 pt-1 text-[13px]">
                  <span className="text-fg">
                    <b>{m.label}</b>
                    {e.target && <> · {e.target}</>}
                    {e.type === "joined" || e.type === "left" || e.type === "timeout" ? <span className="text-fg-2"> · {e.by}</span> : null}
                    {e.seconds != null && <span className="text-fg-3"> · studied {fmtStudy(e.seconds)}</span>}
                    {e.type === "closed" && e.ended ? <span className="text-fg-3"> · {e.ended} student{e.ended === 1 ? "" : "s"} stopped</span> : null}
                  </span>
                  <span className="text-xs text-fg-3">
                    {fmtDateTime(e.at)}
                    {e.by && !["joined", "left", "timeout"].includes(e.type) ? ` · ${e.by}` : ""}
                  </span>
                  {e.reason && <span className="break-words text-fg-2">“{e.reason}”</span>}
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {r.activityTruncated && <p className="mt-4 text-xs text-fg-3">Showing the most recent {entries.length} events.</p>}
    </Box>
  );
}

function ReportsPanel({ room: r, onAnswered, onAction }) {
  const reports = r.reports;
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  if (reports == null) return <Box><Unavailable>Reports aren't available yet.</Unavailable></Box>;
  if (reports.length === 0) return <Box><Empty icon="flag">Nobody has reported this room.</Empty></Box>;

  const answer = async (report, decision) => {
    setBusyId(report.id);
    setError("");
    try {
      await answerStudyReport(r.id, report.id, decision);
      onAnswered(decision === "resolve" ? "Report marked as resolved." : "Report dismissed.");
    } catch (err) {
      setError(adminErrorText(err, "That didn't work. Please try again."));
    } finally {
      setBusyId(null);
    }
  };
  const participantOf = (u) => r.participants?.find((p) => p.id === u.id) ?? { ...u, active: false };

  return (
    <div className="flex flex-col gap-3">
      {error && <ErrorLine>{error}</ErrorLine>}
      {reports.map((rep) => {
        const st = REPORT_STATUS[rep.status];
        const open = rep.status === "open";
        const u = rep.reportedUser ? participantOf(rep.reportedUser) : null;
        const href = profileHref(u);
        return (
          <article key={rep.id} className={`flex flex-col gap-2.5 rounded-2xl border p-4 ${open ? "border-warn/40 bg-warn-soft/30" : "border-line"}`}>
            <div className="flex flex-wrap items-center gap-2">
              <Icon name="flag" size="sm" className={open ? "text-warn" : "text-fg-3"} />
              <span className="min-w-0 flex-1 text-sm font-bold text-fg">{rep.reason}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${st.className}`}>{st.label}</span>
            </div>
            {rep.details && <p className="break-words text-[13px] leading-5 text-fg-2">“{rep.details}”</p>}
            <p className="text-xs text-fg-3">
              Reported by {rep.reporter?.fullName ?? "a student"} · {fmtDateTime(rep.at)}
              {rep.resolvedBy && ` · ${st.label.toLowerCase()} by ${rep.resolvedBy}${rep.resolvedAt ? `, ${fmtDateTime(rep.resolvedAt)}` : ""}`}
            </p>

            {u && (
              <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <Avatar initials={initialsOf(u.fullName)} src={u.avatarUrl} size={32} className="bg-danger-soft !text-live" />
                  <span className="flex min-w-0 flex-col">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-fg-3">Reported student</span>
                    <span className="truncate text-[13px] font-bold text-fg">{u.fullName}</span>
                    <span className="truncate text-xs text-fg-3">
                      {[u.matricule, u.active ? "studying here now" : u.seconds != null ? `${fmtStudy(u.seconds)} in this room` : null].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {href && (
                    <a href={href} className="inline-flex h-[30px] items-center gap-1 rounded-lg border border-line-strong px-2.5 text-xs font-bold text-fg hover:bg-surface-2">
                      <Icon name="user" size="sm" className="!size-3.5" /> Profile
                    </a>
                  )}
                  <SmallButton icon="shieldAlert" tone="warn" onClick={() => onAction("warn", u)}>Warn</SmallButton>
                  {u.active && r.status === "active" && <SmallButton icon="userMinus" tone="red" onClick={() => onAction("removeParticipant", u)}>Remove</SmallButton>}
                </div>
              </div>
            )}

            {open && (
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="s" variant="outline" disabled={busyId != null} aria-busy={busyId === rep.id} onClick={() => answer(rep, "resolve")}>
                  <Icon name={busyId === rep.id ? "loader" : "check"} size="sm" className={busyId === rep.id ? "animate-spin" : ""} /> Mark resolved
                </Button>
                <Button size="s" variant="outline" className="!border-line-strong !bg-surface !text-fg-2" disabled={busyId != null} onClick={() => answer(rep, "dismiss")}>
                  Dismiss
                </Button>
              </div>
            )}
          </article>
        );
      })}
      {reports.some((x) => x.status === "open") && (
        <p className="text-xs text-fg-3">If a report is founded, close the room or act on the student first, then mark the report resolved.</p>
      )}
    </div>
  );
}

/* ───────────── Right column ───────────── */

function ModerationCard({ room: r, error, onAction }) {
  const closed = r.status === "closed";
  const key = closed ? "reopen" : "close";
  const a = ROOM_ACTIONS[key];
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line p-4">
      <div className="flex items-center justify-between gap-2">
        <SectionTitle>Moderation</SectionTitle>
        <StudyRoomStatusBadge status={r.status} />
      </div>
      <p className="text-[13px] leading-5 text-fg-2">
        {closed
          ? "Closed by an admin: hidden from students and nobody can join. Reopen it if the problem is fixed."
          : r.status === "active"
            ? `${r.activeCount} student${r.activeCount === 1 ? " is" : "s are"} studying here now. Closing the room stops their sittings.`
            : "Nobody is studying here right now. Students can still find and join it."}
      </p>
      {closed && r.closedReason && (
        <div className="rounded-xl bg-surface-2/70 px-3 py-2.5 text-[13px]">
          <p className="text-xs font-semibold text-fg-3">Closing reason</p>
          <p className="break-words font-semibold text-fg">“{r.closedReason}”</p>
          {(r.closedAt || r.closedBy) && <p className="mt-1 text-xs text-fg-3">{[fmtDateTime(r.closedAt), r.closedBy].filter(Boolean).join(" · ")}</p>}
        </div>
      )}
      {error && <ErrorLine>{error}</ErrorLine>}
      <Button
        size="s"
        variant="outline"
        className={closed ? "" : "!border-live/40 !bg-surface !text-live hover:!bg-danger-soft"}
        onClick={() => onAction(key)}
      >
        <Icon name={a.icon} size="sm" /> {a.label}…
      </Button>
    </section>
  );
}

function HostCard({ host: h }) {
  const href = profileHref(h);
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line p-4">
      <div className="flex items-center justify-between gap-2">
        <SectionTitle>Host</SectionTitle>
        {h.accountStatus && <AccountStatusBadge status={h.accountStatus} />}
      </div>
      <div className="flex items-center gap-3">
        <Avatar initials={initialsOf(h.fullName)} src={h.avatarUrl} size={44} className="bg-accent-soft !text-accent-ink" />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-sm font-bold text-fg">{h.fullName}</span>
          {h.matricule && <span className="w-fit rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[11px] font-semibold text-fg-2">{h.matricule}</span>}
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[13px]">
        <Field label="Level" value={h.level} />
        <Field label="Department" value={h.department} />
        <Field label="Rooms created" value={h.roomsCreated} />
        <Field label="Own study time" value={h.totalSeconds != null ? fmtStudy(h.totalSeconds) : null} />
      </dl>
      {href && (
        <a href={href} className="inline-flex w-fit items-center gap-1.5 text-[13px] font-bold text-primary-text hover:underline">
          <Icon name="user" size="sm" className="!size-3.5" /> Open student profile
        </a>
      )}
    </section>
  );
}

function NotesCard({ room, onAdded }) {
  const notes = room.notes;
  const fieldId = useId();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      await addStudyRoomNote(room.id, text);
      setText("");
      onAdded();
    } catch (err) {
      setError(adminErrorText(err, "The note wasn't saved. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line p-4">
      <SectionTitle count={notes?.length}>Internal notes</SectionTitle>
      <p className="text-xs text-fg-3">Only admins see these. The host and students never do.</p>
      {notes == null ? (
        <Unavailable />
      ) : notes.length > 0 ? (
        <ul className="flex max-h-[260px] flex-col gap-2.5 overflow-y-auto">
          {notes.map((n) => (
            <li key={n.id} className="rounded-xl bg-highlight/15 px-3 py-2.5 text-[13px]">
              <p className="whitespace-pre-line break-words text-fg">{n.text}</p>
              <p className="mt-1 text-xs text-fg-3">{n.by ?? "Admin"} · {fmtDateTime(n.at)}</p>
            </li>
          ))}
        </ul>
      ) : null}
      {notes != null && (
        <form onSubmit={submit} className="flex flex-col gap-2">
          <label htmlFor={fieldId} className="sr-only">New internal note</label>
          <textarea id={fieldId} rows={2} maxLength={NOTE_MAX} value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a note for other admins…" className={textareaCls} />
          {text.length > NOTE_MAX * 0.8 && <p className="text-right text-xs text-fg-3">{text.length} / {NOTE_MAX}</p>}
          {error && <ErrorLine>{error}</ErrorLine>}
          <Button type="submit" size="s" variant="outline" className="self-end" disabled={!text.trim() || busy} aria-busy={busy}>
            <Icon name={busy ? "loader" : "note"} size="sm" className={busy ? "animate-spin" : ""} /> Add note
          </Button>
        </form>
      )}
    </section>
  );
}

/* ───────────── bits ───────────── */

function SectionTitle({ children, count }) {
  return (
    <h3 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.12em] text-fg-3">
      {children}
      {count != null && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] tracking-normal text-fg-2">{count}</span>}
    </h3>
  );
}

const Box = ({ children }) => <div className="rounded-2xl border border-line p-4">{children}</div>;

function MiniStat({ icon, label, value, live = false }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-surface-2/70 px-3 py-2.5">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-fg-3">
        {live ? <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-success motion-reduce:animate-none" /> : <Icon name={icon} size="sm" className="!size-3.5" />}
        {label}
      </span>
      <span className="text-lg font-extrabold leading-6 tabular-nums text-fg">{value}</span>
    </div>
  );
}

function Pill({ icon, className = "", children }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-surface-2 px-2.5 py-1 text-xs font-bold leading-none text-fg-2 ${className}`}>
      <Icon name={icon} size="sm" className="!size-3.5" />
      {children}
    </span>
  );
}

function Field({ label, value }) {
  return (
    <div className="flex min-w-0 flex-col">
      <dt className="text-xs font-semibold text-fg-3">{label}</dt>
      <dd className="break-words font-semibold text-fg">{value || value === 0 ? value : "—"}</dd>
    </div>
  );
}

function IconAction({ icon, label, tone, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border border-line text-fg-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        tone === "red" ? "hover:border-live/40 hover:bg-danger-soft hover:text-live" : "hover:border-warn/40 hover:bg-warn-soft hover:text-warn"
      }`}
    >
      <Icon name={icon} size="sm" className="!size-4" />
    </button>
  );
}

function SmallButton({ icon, tone, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-[30px] cursor-pointer items-center gap-1 rounded-lg border px-2.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        tone === "red" ? "border-live/40 text-live hover:bg-danger-soft" : "border-warn/50 text-warn hover:bg-warn-soft"
      }`}
    >
      <Icon name={icon} size="sm" className="!size-3.5" /> {children}
    </button>
  );
}

function Empty({ icon, children }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <Icon name={icon} size="lg" className="text-fg-3" />
      <p className="text-[13px] text-fg-2">{children}</p>
    </div>
  );
}

function Unavailable({ children }) {
  return (
    <p className="text-[13px] text-fg-3" title="The server doesn't provide this yet">
      {children ?? "Not available yet."}
    </p>
  );
}

function DetailSkeleton() {
  return (
    <div role="status" aria-label="Loading room" className="grid grid-cols-1 gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <span className="h-4 w-24 animate-pulse rounded bg-surface-2" />
        <span className="h-40 animate-pulse rounded-2xl bg-surface-2" />
        <span className="h-9 w-72 animate-pulse rounded-[14px] bg-surface-2" />
        <span className="h-64 animate-pulse rounded-2xl bg-surface-2" />
      </div>
      <div className="flex flex-col gap-4">
        <span className="h-36 animate-pulse rounded-2xl bg-surface-2" />
        <span className="h-44 animate-pulse rounded-2xl bg-surface-2" />
        <span className="h-32 animate-pulse rounded-2xl bg-surface-2" />
      </div>
    </div>
  );
}
