import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Button from "../../../Components/uiC/Button.jsx";
import Icon from "../../../Components/uiC/Icon.jsx";
import Avatar from "../../../Components/uiC/Avatar.jsx";
import AdminSessionStatusBadge from "../../../Components/sharedC/AdminSessionStatusBadge.jsx";
import AccountStatusBadge from "../../../Components/sharedC/AccountStatusBadge.jsx";
import { useDialog } from "../../../hooks/useDialog.js";
import {
  HISTORY_ACTIONS,
  NOTE_MAX,
  SESSION_ACTIONS,
  SESSION_TYPES,
  actionsFor,
  addSessionNote,
  answerSessionReport,
  getAdminSession,
  moderateSession,
  moderationErrorText,
  reviewExpired,
} from "../../../services/adminSessionsService.js";
import { sessionPlace } from "../../../services/sessionsService.js";
import { adminErrorText, fmtDateTime, initialsOf } from "../students/format.js";
import SessionActionDialog, { ErrorLine } from "./SessionActionDialog.jsx";
import { fmtDate, fmtMinutes, fmtTimeRange, safeHref, textareaCls } from "./sessionFormat.js";

const TONES = {
  blue: "bg-primary-soft text-primary-text",
  green: "bg-success-soft text-success-ink",
  warn: "bg-warn-soft text-warn",
  red: "bg-danger-soft text-live",
};
const ACTION_BUTTON = {
  reject: "!border-live/40 !bg-surface !text-live hover:!bg-danger-soft",
  cancel: "!border-warn/50 !bg-surface !text-warn hover:!bg-warn-soft",
  remove: "!border-live/40 !bg-surface !text-live hover:!bg-danger-soft",
};
const REASON_TITLE = { rejected: "Rejection reason", cancelled: "Cancellation reason" };

/**
 * Admin session details (opened from the sessions directory or the approval queue): full information, host,
 * participants, schedule, resources, join requests, reports, internal notes and the moderation history,
 * with approve / reject / cancel / remove. Previous / Next walk through the list's current page.
 * Join requests are read-only here: deciding them stays with the host.
 */
export default function SessionDetailDialog({ id, position, onPrev, onNext, onClose, onChanged }) {
  const panelRef = useRef(null);
  const titleId = useId();
  const [tick, setTick] = useState(0);
  const [state, setState] = useState({ id: null, session: null, error: null });
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState(null); // reject | cancel | remove while its confirmation is open
  const [error, setError] = useState("");
  const onKeyDown = useDialog(panelRef, () => !busy && !action && onClose());

  useEffect(() => {
    let active = true;
    getAdminSession(id).then(
      (session) => active && setState({ id, session, error: null }),
      (error) => active && setState((prev) => ({ id, session: prev.id === id ? prev.session : null, error }))
    );
    return () => {
      active = false;
    };
  }, [id, tick]);

  const s = state.id === id ? state.session : null;
  const loadError = state.id === id ? state.error : null;
  const reload = () => setTick((t) => t + 1);
  const refresh = (message) => {
    setError("");
    reload();
    onChanged?.(message);
  };
  const conflict = (message) => {
    setAction(null);
    setError(message);
    reload();
    onChanged?.("");
  };

  const approve = async () => {
    setBusy(true);
    setError("");
    try {
      await moderateSession(s, "approve");
      refresh(SESSION_ACTIONS.approve.done(s.title));
    } catch (err) {
      if (err?.status === 409 && moderationErrorText(err)) conflict(moderationErrorText(err));
      else setError(adminErrorText(err, "That didn't work. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const onKey = (e) => {
    onKeyDown(e);
    if (busy || action || e.target.closest("textarea, input")) return;
    if (e.key === "ArrowLeft" && onPrev) onPrev();
    if (e.key === "ArrowRight" && onNext) onNext();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4" onKeyDown={onKey}>
      <div aria-hidden="true" onClick={() => !busy && onClose()} className="animate-overlay-in fixed inset-0 bg-ink/60 backdrop-blur-md dark:bg-black/60" />
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
            <Icon name={s?.type === "instant" ? "bolt" : "calendar"} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="line-clamp-2 break-words text-lg font-extrabold leading-6 text-fg">{s?.title ?? "Session"}</h2>
            {s && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <AdminSessionStatusBadge status={s.status} removed={s.removed} />
                <Pill icon={SESSION_TYPES[s.type].icon}>{SESSION_TYPES[s.type].label}</Pill>
                <Pill icon={s.visibility === "private" ? "lock" : "globe"}>{s.visibility === "private" ? "Private" : "Public"}</Pill>
                {s.openReports > 0 && <Pill icon="flag" className="bg-warn-soft !text-warn">{s.openReports} open report{s.openReports === 1 ? "" : "s"}</Pill>}
              </div>
            )}
          </div>
          {position && (
            <span className="hidden rounded-full border border-line px-3 py-1 text-[13px] font-semibold text-fg-2 sm:inline" aria-label={`Session ${position.index} of ${position.total}`}>
              {position.index} / {position.total}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-surface-2 text-fg-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
          >
            <Icon name="close" size="sm" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {!s && loadError ? (
            <div role="alert" className="flex flex-col items-center gap-3 px-6 py-16 text-center text-sm text-fg-2">
              <p>{adminErrorText(loadError, "We couldn't load this session.")}</p>
              <Button size="s" variant="outline" onClick={reload}>Try again</Button>
            </div>
          ) : !s ? (
            <p role="status" className="px-6 py-16 text-center text-sm text-fg-2">Loading session…</p>
          ) : (
            <div className="grid grid-cols-1 gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
              <div className="flex min-w-0 flex-col gap-5">
                <OverviewSection session={s} />
                <ParticipantsSection session={s} />
                {s.visibility === "private" && <JoinRequestsSection requests={s.joinRequests} />}
                <ResourcesSection resources={s.resources} />
                <ReportsSection session={s} onAnswered={refresh} />
              </div>
              <div className="flex min-w-0 flex-col gap-5">
                <ActionsCard session={s} busy={busy} error={error} onApprove={approve} onAction={setAction} />
                <HostCard host={s.host} />
                <NotesCard key={s.id} session={s} onAdded={() => refresh("")} />
                <HistoryCard entries={s.history} />
              </div>
            </div>
          )}
        </div>

        {(onPrev || onNext) && (
          <footer className="flex items-center justify-between gap-3 border-t border-line px-5 py-3.5 sm:px-6">
            <Button size="s" variant="outline" disabled={!onPrev || busy} onClick={onPrev}>
              <Icon name="chevronLeft" size="sm" /> Previous
            </Button>
            {position && <span className="text-[13px] font-semibold text-fg-2 sm:hidden">{position.index} / {position.total}</span>}
            <Button size="s" variant="outline" disabled={!onNext || busy} onClick={onNext}>
              Next <Icon name="chevronRight" size="sm" />
            </Button>
          </footer>
        )}
      </div>

      {action && s && (
        <SessionActionDialog
          action={action}
          session={s}
          onCancel={() => setAction(null)}
          onConflict={conflict}
          onDone={() => {
            setAction(null);
            refresh(SESSION_ACTIONS[action].done(s.title));
          }}
        />
      )}
    </div>,
    document.body
  );
}

/* ───────────── Left column ───────────── */

function OverviewSection({ session: s }) {
  const place = s.mode === "online" ? sessionPlace(s) : s.location;
  const link = s.mode === "online" ? safeHref(s.meetingLink) : null;
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle>Session</SectionTitle>
      <div className="flex flex-col gap-4 rounded-2xl border border-line p-4">
        {s.description ? <p className="whitespace-pre-line break-words text-sm leading-6 text-fg">{s.description}</p> : <p className="text-sm text-fg-3">No description.</p>}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13px] sm:grid-cols-3">
          <Field label="Module" value={s.module} />
          <Field label="Level" value={s.level} />
          <Field label="Type" value={s.type === "instant" ? "Instant (published at once)" : "Scheduled (needs approval)"} />
          <Field label="Date" value={fmtDate(s.startsAt)} />
          <Field label="Time" value={fmtTimeRange(s.startsAt, s.durationMin)} />
          <Field label="Duration" value={fmtMinutes(s.durationMin)} />
          <Field label="Where" value={s.mode === "online" ? `Online · ${place || "link"}` : place} />
          <Field label="Seats" value={s.seats != null ? `${s.participantCount ?? "?"} / ${s.seats} taken` : null} />
          <Field label="Created" value={fmtDateTime(s.createdAt)} />
        </dl>
        {link && (
          <a href={link} target="_blank" rel="noreferrer noopener" className="inline-flex w-fit items-center gap-1.5 break-all text-[13px] font-bold text-primary-text hover:underline">
            <Icon name="external" size="sm" className="!size-3.5" /> {link}
          </a>
        )}
      </div>
    </section>
  );
}

function ParticipantsSection({ session: s }) {
  const list = s.participants;
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle count={s.participantCount}>Participants</SectionTitle>
      <div className="rounded-2xl border border-line p-4">
        {list == null ? (
          <Unavailable>{s.participantCount != null ? `${s.participantCount} joined. The list of names isn't available yet.` : null}</Unavailable>
        ) : list.length === 0 ? (
          <p className="text-[13px] text-fg-2">No one has joined yet.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {list.map((p) => (
              <li key={p.id} className="flex min-w-0 items-center gap-2.5">
                <Avatar initials={initialsOf(p.fullName)} src={p.avatarUrl} size={32} className="bg-accent-soft !text-accent-ink" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[13px] font-bold text-fg">{p.fullName}</span>
                  <span className="truncate text-xs text-fg-3">{[p.level, p.joinedAt && `joined ${fmtDateTime(p.joinedAt)}`].filter(Boolean).join(" · ") || "—"}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function JoinRequestsSection({ requests }) {
  const pending = requests?.filter((r) => (r.status ?? "pending") === "pending") ?? null;
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle count={pending?.length}>Join requests</SectionTitle>
      <div className="flex flex-col gap-3 rounded-2xl border border-line p-4">
        <p className="flex items-start gap-2 text-xs text-fg-3">
          <Icon name="lock" size="sm" className="!size-3.5 mt-px" /> Private session: the host approves or declines requests. Admins can see them but don't decide them.
        </p>
        {pending == null ? (
          <Unavailable />
        ) : pending.length === 0 ? (
          <p className="text-[13px] text-fg-2">No pending requests.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pending.map((r) => (
              <li key={r.id} className="flex items-center gap-2.5 text-[13px]">
                <Avatar initials={initialsOf(r.student?.fullName)} size={28} className="bg-surface-2 !text-fg-2" />
                <span className="min-w-0 flex-1 truncate font-bold text-fg">{r.student?.fullName ?? "Student"}</span>
                <span className="shrink-0 text-xs text-fg-3">{[r.student?.major, r.student?.level].filter(Boolean).join(" · ")}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ResourcesSection({ resources }) {
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle count={resources?.length}>Resources</SectionTitle>
      <div className="rounded-2xl border border-line p-4">
        {resources == null ? (
          <Unavailable />
        ) : resources.length === 0 ? (
          <p className="text-[13px] text-fg-2">No resources attached.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {resources.map((r) => {
              const href = safeHref(r.url);
              return (
                <li key={r.id} className="flex items-center gap-2.5 text-[13px]">
                  <Icon name={r.kind === "link" ? "link" : "file"} size="sm" className="text-fg-3" />
                  {href ? (
                    <a href={href} target="_blank" rel="noreferrer noopener" className="min-w-0 flex-1 truncate font-bold text-primary-text hover:underline">{r.name}</a>
                  ) : (
                    <span className="min-w-0 flex-1 truncate font-bold text-fg">{r.name}</span>
                  )}
                  <span className="shrink-0 text-xs text-fg-3">{[r.uploadedBy, r.at && fmtDateTime(r.at)].filter(Boolean).join(" · ")}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

const REPORT_STATUS = {
  open: { label: "Open", className: "bg-warn-soft text-warn" },
  resolved: { label: "Resolved", className: "bg-success-soft text-success-ink" },
  dismissed: { label: "Dismissed", className: "bg-surface-2 text-fg-2" },
};

function ReportsSection({ session: s, onAnswered }) {
  const reports = s.reports;
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const open = reports?.filter((r) => (r.status ?? "open") === "open").length ?? 0;

  const answer = async (report, decision) => {
    setBusyId(report.id);
    setError("");
    try {
      await answerSessionReport(s.id, report.id, decision);
      onAnswered(decision === "resolve" ? "Report marked as resolved." : "Report dismissed.");
    } catch (err) {
      setError(adminErrorText(err, "That didn't work. Please try again."));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="flex flex-col gap-3">
      <SectionTitle count={reports ? open : null}>Reports</SectionTitle>
      <div className="flex flex-col gap-3 rounded-2xl border border-line p-4">
        {error && <ErrorLine>{error}</ErrorLine>}
        {reports == null ? (
          <Unavailable>Reports aren't available yet.</Unavailable>
        ) : reports.length === 0 ? (
          <p className="text-[13px] text-fg-2">Nobody has reported this session.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {reports.map((r) => {
              const st = REPORT_STATUS[r.status] ?? REPORT_STATUS.open;
              const isOpen = st === REPORT_STATUS.open;
              return (
                <li key={r.id} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="min-w-0 flex-1 text-[13px] font-bold text-fg">{r.reason || "Reported"}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${st.className}`}>{st.label}</span>
                  </div>
                  {r.details && <p className="break-words text-[13px] text-fg-2">“{r.details}”</p>}
                  <p className="text-xs text-fg-3">
                    {r.reporter?.fullName ?? "A student"} · {fmtDateTime(r.at)}
                    {r.resolvedBy && ` · ${st.label.toLowerCase()} by ${r.resolvedBy}`}
                  </p>
                  {isOpen && (
                    <div className="flex gap-2 pt-1">
                      <Button size="s" variant="outline" disabled={busyId != null} onClick={() => answer(r, "resolve")}>
                        <Icon name="check" size="sm" /> Mark resolved
                      </Button>
                      <Button size="s" variant="outline" className="!border-line-strong !bg-surface !text-fg-2" disabled={busyId != null} onClick={() => answer(r, "dismiss")}>
                        Dismiss
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {open > 0 && <p className="text-xs text-fg-3">If the report is founded, cancel or remove the session above, then mark the report resolved.</p>}
      </div>
    </section>
  );
}

/* ───────────── Right column ───────────── */

function ActionsCard({ session: s, busy, error, onApprove, onAction }) {
  const actions = actionsFor(s);
  const expired = reviewExpired(s);
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line p-4">
      <div className="flex items-center justify-between gap-2">
        <SectionTitle>Moderation</SectionTitle>
        <AdminSessionStatusBadge status={s.status} removed={s.removed} />
      </div>

      <p className="text-[13px] leading-5 text-fg-2">{statusExplanation(s, expired)}</p>

      {s.statusReason && (
        <div className="rounded-xl bg-surface-2/70 px-3 py-2.5 text-[13px]">
          <p className="text-xs font-semibold text-fg-3">{s.removed ? "Removal reason" : REASON_TITLE[s.status] ?? "Reason"}</p>
          <p className="break-words font-semibold text-fg">“{s.statusReason}”</p>
        </div>
      )}
      {s.reviewedAt && (
        <p className="text-xs text-fg-3">Last decision {fmtDateTime(s.reviewedAt)}{s.reviewedBy ? ` by ${s.reviewedBy}` : ""}</p>
      )}

      {error && <ErrorLine>{error}</ErrorLine>}

      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {actions.map((key) => {
            const a = SESSION_ACTIONS[key];
            return key === "approve" ? (
              <Button key={key} size="s" className="flex-1 !border-success !bg-success hover:!bg-success-ink" disabled={busy} aria-busy={busy} onClick={onApprove}>
                <Icon name={busy ? "loader" : "check"} size="sm" className={busy ? "animate-spin" : ""} /> Approve & publish
              </Button>
            ) : (
              <Button key={key} size="s" variant="outline" className={`flex-1 ${ACTION_BUTTON[key]}`} disabled={busy} onClick={() => onAction(key)}>
                <Icon name={a.icon} size="sm" /> {a.label}…
              </Button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function statusExplanation(s, expired) {
  if (s.removed) return "Removed by a moderator: hidden from every student. Its host sees that it was removed. The record is kept.";
  switch (s.status) {
    case "pending":
      return expired
        ? "This scheduled session's start time passed before anyone reviewed it, so it can't be published any more. Reject it to close the request."
        : "Scheduled session waiting for review. Students can't see or join it until it's approved.";
    case "approved":
      return s.type === "instant" ? "Instant session: published at once, no approval needed." : "Approved and published. Students can find and join it.";
    case "active":
      return "Happening now. Cancel or remove it only if something is wrong: participants are notified.";
    case "completed":
      return "This session has ended. It can still be removed if its content was inappropriate.";
    case "cancelled":
      return "Cancelled: it can't be joined or entered. The host and participants were notified.";
    case "rejected":
      return "Not approved: it was never published. The host was told.";
    default:
      return "";
  }
}

function HostCard({ host: h }) {
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
        <Field label="Sessions hosted" value={h.sessionsHosted} />
        <Field label="Rating" value={h.rating != null ? `${h.rating.toFixed(1)} / 5` : null} />
      </dl>
      {h.id && (
        <a href={`/admin/users?student=${encodeURIComponent(h.id)}`} className="inline-flex w-fit items-center gap-1.5 text-[13px] font-bold text-primary-text hover:underline">
          <Icon name="user" size="sm" className="!size-3.5" /> Open student profile
        </a>
      )}
    </section>
  );
}

function NotesCard({ session, onAdded }) {
  const notes = session.notes;
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
      await addSessionNote(session.id, text);
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
        <ul className="flex flex-col gap-2.5">
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
          {error && <ErrorLine>{error}</ErrorLine>}
          <Button type="submit" size="s" variant="outline" className="self-end" disabled={!text.trim() || busy} aria-busy={busy}>
            <Icon name={busy ? "loader" : "note"} size="sm" className={busy ? "animate-spin" : ""} /> Add note
          </Button>
        </form>
      )}
    </section>
  );
}

function HistoryCard({ entries }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line p-4">
      <SectionTitle>Moderation & approval history</SectionTitle>
      {entries == null ? (
        <Unavailable />
      ) : entries.length === 0 ? (
        <p className="text-[13px] text-fg-2">No moderation actions on this session.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {entries.map((e) => {
            const m = HISTORY_ACTIONS[e.action] ?? { label: String(e.action).replace(/_/g, " "), icon: "logs", tone: "blue" };
            return (
              <li key={e.id} className="flex gap-3">
                <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${TONES[m.tone]}`}>
                  <Icon name={m.icon} size="sm" className="!size-4" />
                </span>
                <div className="flex min-w-0 flex-col gap-0.5 text-[13px]">
                  <span className="font-bold text-fg">{m.label}</span>
                  <span className="text-xs text-fg-3">{fmtDateTime(e.at)}{e.by ? ` · ${e.by}` : ""}</span>
                  {e.reason && <span className="break-words text-fg-2">“{e.reason}”</span>}
                </div>
              </li>
            );
          })}
        </ol>
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

function Unavailable({ children }) {
  return (
    <p className="text-[13px] text-fg-3" title="The server doesn't provide this yet">
      {children ?? "Not available yet."}
    </p>
  );
}
