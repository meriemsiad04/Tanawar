import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Button from "../../../Components/uiC/Button.jsx";
import Icon from "../../../Components/uiC/Icon.jsx";
import Avatar from "../../../Components/uiC/Avatar.jsx";
import VerificationStatusBadge from "../../../Components/sharedC/VerificationStatusBadge.jsx";
import AccountStatusBadge from "../../../Components/sharedC/AccountStatusBadge.jsx";
import { useDialog } from "../../../hooks/useDialog.js";
import {
  ACCOUNT_ACTIONS,
  ACTION_REASON_MIN,
  MODERATION_ACTIONS,
  actionsFor,
  getStudentDetail,
  setAccountStatus,
} from "../../../services/adminStudentsService.js";
import {
  REJECTION_PRESETS,
  REJECTION_REASON_MIN,
  approveRegistration,
  documentTypeLabel,
  getRegistrationDocument,
  rejectRegistration,
} from "../../../services/verificationService.js";
import { adminErrorText, fmtDateTime, fmtDay, fmtDuration, initialsOf } from "./format.js";

const SAFE_PREVIEW_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const TONES = {
  blue: "bg-primary-soft text-primary-text",
  green: "bg-success-soft text-success-ink",
  warn: "bg-warn-soft text-warn",
  red: "bg-danger-soft text-live",
};
const textareaCls =
  "w-full resize-none rounded-[10px] border border-line-strong bg-surface px-3 py-2.5 text-sm text-fg outline-none placeholder:text-fg-3 focus:border-primary focus:ring-4 focus:ring-primary/15";

/**
 * Admin student profile (opened from the directory). Shows personal / academic info, the verification document,
 * aggregate activity, account status and the moderation history, and runs verify / reject / suspend / ban / reinstate.
 * Previous / Next walk through the directory's current page.
 */
export default function StudentProfileDialog({ id, position, onPrev, onNext, onClose, onChanged }) {
  const panelRef = useRef(null);
  const titleId = useId();
  const [tick, setTick] = useState(0);
  const [state, setState] = useState({ id: null, student: null, error: null });
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState(null); // account action key while its confirmation is open
  const onKeyDown = useDialog(panelRef, () => !busy && !action && onClose());

  useEffect(() => {
    let active = true;
    getStudentDetail(id).then(
      (student) => active && setState({ id, student, error: null }),
      // A failed refresh keeps the profile on screen; a failed first load shows the error.
      (error) => active && setState((prev) => ({ id, student: prev.id === id ? prev.student : null, error }))
    );
    return () => {
      active = false;
    };
  }, [id, tick]);

  // Only this student's data: while Previous / Next loads, the old profile isn't shown under the new id.
  const s = state.id === id ? state.student : null;
  const loadError = state.id === id ? state.error : null;
  const refresh = (message) => {
    setTick((t) => t + 1);
    onChanged?.(message);
  };

  // ←/→ move between students (not while typing a reason).
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
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-line px-5 py-4 sm:px-6">
          <Avatar initials={initialsOf(s?.fullName)} src={s?.avatarUrl} size={44} className="bg-accent-soft !text-accent-ink" />
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="truncate text-lg font-extrabold leading-6 text-fg">{s?.fullName ?? "Student"}</h2>
            {s && (
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <VerificationStatusBadge status={s.verificationStatus} />
                <AccountStatusBadge status={s.accountStatus} />
                {s.deactivated && <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-bold leading-none text-fg-2">Deactivated by student</span>}
              </div>
            )}
          </div>
          {position && (
            <span className="hidden rounded-full border border-line px-3 py-1 text-[13px] font-semibold text-fg-2 sm:inline" aria-label={`Student ${position.index} of ${position.total}`}>
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

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {!s && loadError ? (
            <div role="alert" className="flex flex-col items-center gap-3 px-6 py-16 text-center text-sm text-fg-2">
              <p>{adminErrorText(loadError, "We couldn't load this student.")}</p>
              <Button size="s" variant="outline" onClick={() => setTick((t) => t + 1)}>Try again</Button>
            </div>
          ) : !s ? (
            <p role="status" className="px-6 py-16 text-center text-sm text-fg-2">Loading profile…</p>
          ) : (
            <div className="grid grid-cols-1 gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <div className="flex min-w-0 flex-col gap-5">
                <VerificationSection key={`${s.registrationId}-${s.verificationStatus}`} student={s} busy={busy} setBusy={setBusy} onDecided={refresh} />
                <ActivitySection stats={s.stats} />
              </div>
              <div className="flex min-w-0 flex-col gap-5">
                <InfoCard student={s} />
                <AccountCard student={s} busy={busy} onAction={setAction} />
                <HistoryCard entries={s.moderation} />
              </div>
            </div>
          )}
        </div>

        {/* Footer: walk through the list */}
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
        <AccountActionDialog
          action={action}
          student={s}
          onCancel={() => setAction(null)}
          onDone={() => {
            setAction(null);
            refresh(ACCOUNT_ACTIONS[action].done(s.fullName));
          }}
        />
      )}
    </div>,
    document.body
  );
}

/* ───────────── Verification ───────────── */

function VerificationSection({ student, busy, setBusy, onDecided }) {
  const v = student.verification;
  const reasonId = useId();
  const [doc, setDoc] = useState({ url: null, type: "", error: null, loading: Boolean(student.registrationId) });
  const [mode, setMode] = useState("view"); // view | reject
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!student.registrationId) return;
    let active = true;
    let url = null;
    getRegistrationDocument(student.registrationId).then(
      (blob) => {
        if (!active) return;
        url = URL.createObjectURL(blob);
        setDoc({ url, type: blob.type, error: null, loading: false });
      },
      (err) => active && setDoc({ url: null, type: "", error: err, loading: false })
    );
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [student.registrationId]);

  const decide = async (fn, message) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      setBusy(false);
      onDecided(message);
    } catch (err) {
      setError(adminErrorText(err, "That didn't work. Please try again."));
      setBusy(false);
    }
  };

  // Blob URLs run with this app's origin: only ever render the allowed document types (never HTML / SVG).
  const previewable = SAFE_PREVIEW_TYPES.includes(doc.type);
  const reasonOk = reason.trim().length >= REJECTION_REASON_MIN;
  const pending = student.verificationStatus === "pending";

  return (
    <section aria-labelledby={`${reasonId}-h`} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 id={`${reasonId}-h`} className="text-[13px] font-bold uppercase tracking-[0.12em] text-fg-3">Verification</h3>
        {doc.url && previewable && (
          <a href={doc.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] font-bold text-primary-text hover:underline">
            <Icon name="eye" size="sm" className="!size-3.5" /> Open document
          </a>
        )}
      </div>

      <div className="flex h-64 items-center justify-center overflow-hidden rounded-2xl border border-line bg-surface-2/60 sm:h-72">
        {!student.registrationId ? (
          <p className="px-4 text-center text-sm text-fg-2">No verification document on file.</p>
        ) : doc.loading ? (
          <p role="status" className="text-sm text-fg-2">Loading document…</p>
        ) : doc.error ? (
          <p className="px-4 text-center text-sm text-fg-2">{adminErrorText(doc.error, "The document couldn't be loaded.")}</p>
        ) : !previewable ? (
          <p className="px-4 text-center text-sm text-fg-2">This file type ({doc.type || "unknown"}) can't be previewed safely.</p>
        ) : doc.type === "application/pdf" ? (
          <iframe src={doc.url} title={`Document of ${student.fullName}`} className="size-full" />
        ) : (
          <img src={doc.url} alt={`${documentTypeLabel(v?.documentType)} of ${student.fullName}`} className="size-full object-contain" />
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-line p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 flex-1 text-sm font-bold text-fg">{v ? documentTypeLabel(v.documentType) : "Registration"}</span>
          <VerificationStatusBadge status={student.verificationStatus} />
        </div>
        {v && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[13px]">
            <Field label="Submitted" value={fmtDateTime(v.submittedAt)} />
            <Field label="Attempt" value={v.attempts ?? 1} />
            {v.reviewedAt && <Field label="Reviewed" value={`${fmtDateTime(v.reviewedAt)}${v.reviewedBy ? ` by ${v.reviewedBy}` : ""}`} wide />}
            {v.rejectionReason && <Field label="Reason given to the student" value={v.rejectionReason} wide />}
          </dl>
        )}

        {error && <ErrorLine>{error}</ErrorLine>}

        {pending && student.registrationId && mode === "view" && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              size="s"
              className="flex-1 !border-success !bg-success hover:!bg-success-ink"
              disabled={busy}
              aria-busy={busy}
              onClick={() => decide(() => approveRegistration(student.registrationId), `${student.fullName} is verified and can now use TANAWAR.`)}
            >
              <Icon name={busy ? "loader" : "verified"} size="sm" className={busy ? "animate-spin" : ""} /> Verify
            </Button>
            <Button size="s" variant="outline" className="flex-1 !border-live/40 !bg-surface !text-live hover:!bg-danger-soft" disabled={busy} onClick={() => setMode("reject")}>
              <Icon name="alert" size="sm" /> Reject…
            </Button>
          </div>
        )}

        {pending && mode === "reject" && (
          <div className="flex flex-col gap-2.5">
            <label htmlFor={reasonId} className="text-[13px] font-bold text-fg">
              Reason for the student <span className="font-normal text-fg-3">(they'll see it and can resubmit)</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {REJECTION_PRESETS.map((p) => (
                <button key={p} type="button" onClick={() => setReason(p)} className="cursor-pointer rounded-full border border-line-strong px-2.5 py-1 text-left text-xs text-fg-2 hover:border-primary hover:text-fg">
                  {p.split(".")[0]}
                </button>
              ))}
            </div>
            <textarea id={reasonId} rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain what's wrong and what to send instead." className={textareaCls} />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button size="s" variant="outline" className="flex-1" disabled={busy} onClick={() => setMode("view")}>Cancel</Button>
              <Button
                size="s"
                variant="danger"
                className="flex-1"
                disabled={busy || !reasonOk}
                aria-busy={busy}
                onClick={() => decide(() => rejectRegistration(student.registrationId, reason), `${student.fullName}'s registration was rejected. They can see your reason and resubmit.`)}
              >
                {busy && <Icon name="loader" size="sm" className="animate-spin" />} Reject registration
              </Button>
            </div>
            {!reasonOk && <p className="text-xs text-fg-3">At least {REJECTION_REASON_MIN} characters.</p>}
          </div>
        )}
      </div>
    </section>
  );
}

/* ───────────── Activity (aggregates only) ───────────── */

function ActivitySection({ stats }) {
  const study = stats.study;
  const tiles = [
    { icon: "calendarPlus", label: "Sessions created", value: stats.sessionsCreated },
    { icon: "calendar", label: "Sessions joined", value: stats.sessionsJoined },
    { icon: "books", label: "Resources uploaded", value: stats.resourcesUploaded },
    { icon: "timer", label: "Study With Me time", value: study ? fmtDuration(study.totalSeconds) : null, hint: study?.studyingNow ? "Studying now" : null },
    { icon: "lamp", label: "Study sittings", value: study?.sittings ?? null, hint: study?.lastStudiedAt ? `Last ${fmtDay(study.lastStudiedAt)}` : null },
    { icon: "door", label: "Study rooms created", value: study?.roomsCreated ?? null },
    { icon: "flag", label: "Reports against them", value: stats.reportsAgainst, warn: stats.reportsAgainst > 0 },
    { icon: "megaphone", label: "Reports they filed", value: stats.reportsFiled },
  ];
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-[13px] font-bold uppercase tracking-[0.12em] text-fg-3">Activity</h3>
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {tiles.map((t) => (
          <li key={t.label} className="flex flex-col gap-1.5 rounded-2xl border border-line p-3">
            <Icon name={t.icon} size="sm" className={t.warn ? "text-warn" : "text-fg-3"} />
            {t.value == null ? (
              <span className="text-[13px] font-semibold leading-5 text-fg-3" title="The server doesn't provide this yet">Not available yet</span>
            ) : (
              <span className="text-lg font-extrabold leading-6 text-fg">{t.value}</span>
            )}
            <span className="text-xs leading-4 text-fg-2">{t.label}</span>
            {t.hint && <span className="text-[11px] font-semibold text-success-ink">{t.hint}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ───────────── Right column ───────────── */

function InfoCard({ student: s }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line p-4">
      <h3 className="text-[13px] font-bold uppercase tracking-[0.12em] text-fg-3">Profile</h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">
        <Field label="Email" value={s.email} wide />
        <Field label="Matricule" value={s.matricule && <span className="font-mono">{s.matricule}</span>} />
        <Field label="Signed up with" value={s.authProvider === "google" ? "Google" : s.authProvider === "email" ? "Email" : null} />
        <Field label="Faculty" value={s.faculty} wide />
        <Field label="Department" value={s.department} />
        <Field label="Level" value={s.level} />
        <Field label="Registered" value={fmtDay(s.registeredAt)} />
      </dl>
    </section>
  );
}

function AccountCard({ student: s, busy, onAction }) {
  const actions = actionsFor(s.accountStatus);
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[13px] font-bold uppercase tracking-[0.12em] text-fg-3">Account</h3>
        <AccountStatusBadge status={s.accountStatus} />
      </div>
      {s.accountStatus === "active" ? (
        <p className="text-[13px] text-fg-2">This student can sign in and use TANAWAR{s.verificationStatus !== "approved" ? " once their registration is verified" : ""}.</p>
      ) : (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[13px]">
          <Field label="Reason" value={s.accountStatusReason} wide />
          <Field label="Since" value={fmtDateTime(s.accountStatusChangedAt)} />
          <Field label="By" value={s.accountStatusChangedBy} />
        </dl>
      )}
      <div className="flex flex-wrap gap-2">
        {actions.map((key) => {
          const a = ACCOUNT_ACTIONS[key];
          const label = key === "reinstate" && s.accountStatus === "banned" ? "Lift ban" : a.label;
          return (
            <Button key={key} size="s" variant={key === "reinstate" ? "primary" : "outline"} className={`flex-1 ${TONE_BUTTON[key] ?? ""}`} disabled={busy} onClick={() => onAction(key)}>
              <Icon name={a.icon} size="sm" /> {label}…
            </Button>
          );
        })}
      </div>
    </section>
  );
}
const TONE_BUTTON = {
  suspend: "!border-warn/50 !bg-surface !text-warn hover:!bg-warn-soft",
  ban: "!border-live/40 !bg-surface !text-live hover:!bg-danger-soft",
};

function HistoryCard({ entries }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line p-4">
      <h3 className="text-[13px] font-bold uppercase tracking-[0.12em] text-fg-3">Reports & moderation history</h3>
      {entries == null ? (
        <p className="text-[13px] text-fg-3">Not available yet.</p>
      ) : entries.length === 0 ? (
        <p className="text-[13px] text-fg-2">No moderation actions on this account.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {entries.map((e) => {
            const m = MODERATION_ACTIONS[e.action] ?? { label: String(e.action).replace(/_/g, " "), icon: "logs", tone: "blue" };
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

/* ───────────── Account action confirmation ───────────── */

function AccountActionDialog({ action, student, onCancel, onDone }) {
  const def = ACCOUNT_ACTIONS[action];
  const panelRef = useRef(null);
  const titleId = useId();
  const reasonId = useId();
  const [reason, setReason] = useState("");
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const onKeyDown = useDialog(panelRef, () => !busy && onCancel());

  const required = def.reason === "required";
  const reasonOk = !required || reason.trim().length >= ACTION_REASON_MIN;
  const canSubmit = reasonOk && (!def.acknowledge || ack) && !busy;
  const lifting = action === "reinstate" && student.accountStatus === "banned";

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError("");
    try {
      await setAccountStatus(student.id, action, reason);
      onDone();
    } catch (err) {
      setError(adminErrorText(err, "That didn't work. Please try again."));
      setBusy(false);
    }
  };

  return createPortal(
    // Keys stay inside this dialog (it's rendered within the profile dialog's React tree).
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      onKeyDown={(e) => {
        onKeyDown(e);
        e.stopPropagation();
      }}
    >
      <div aria-hidden="true" onClick={() => !busy && onCancel()} className="animate-overlay-in fixed inset-0 bg-ink/50 dark:bg-black/60" />
      <form
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onSubmit={submit}
        className="animate-dialog-in relative flex w-full max-w-[460px] flex-col gap-4 rounded-[24px] border border-line bg-surface p-6 shadow-pop outline-none"
      >
        <div className="flex flex-col gap-1.5">
          <h2 id={titleId} className="text-xl font-extrabold leading-7 text-fg">{lifting ? `Lift ${student.fullName}'s ban?` : def.title(student.fullName)}</h2>
          <p className="text-sm leading-5 text-fg-2">{def.message}</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={reasonId} className="text-[13px] font-bold text-fg">
            Reason {required ? <span aria-hidden="true">*</span> : <span className="font-normal text-fg-3">(optional)</span>}
          </label>
          <textarea
            id={reasonId}
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required={required}
            placeholder={required ? "What happened? This is recorded in the activity log." : "Add a note for the activity log."}
            className={textareaCls}
          />
          {required && !reasonOk && <p className="text-xs text-fg-3">At least {ACTION_REASON_MIN} characters.</p>}
        </div>

        {def.acknowledge && (
          <label className="flex cursor-pointer items-start gap-2.5 text-[13px] text-fg-2">
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 size-4 accent-[var(--color-live)]" />
            {def.acknowledge}
          </label>
        )}

        {error && <ErrorLine>{error}</ErrorLine>}

        <div className="flex justify-end gap-2.5">
          <Button variant="outline" size="s" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button type="submit" variant={def.tone} size="s" disabled={!canSubmit} aria-busy={busy}>
            {busy && <Icon name="loader" size="sm" className="animate-spin" />}
            {lifting ? "Lift ban" : def.confirm}
          </Button>
        </div>
      </form>
    </div>,
    document.body
  );
}

/* ───────────── bits ───────────── */

function Field({ label, value, wide = false }) {
  return (
    <div className={`flex min-w-0 flex-col ${wide ? "col-span-2" : ""}`}>
      <dt className="text-xs font-semibold text-fg-3">{label}</dt>
      <dd className="break-words font-semibold text-fg">{value || value === 0 ? value : "—"}</dd>
    </div>
  );
}

function ErrorLine({ children }) {
  return (
    <p role="alert" className="flex items-start gap-2 rounded-[10px] border border-live/25 bg-danger-soft px-3 py-2.5 text-[13px] font-semibold text-live">
      <Icon name="alert" size="sm" className="mt-px" />
      {children}
    </p>
  );
}
