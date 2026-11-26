import { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Button from "../../../Components/uiC/Button.jsx";
import Icon from "../../../Components/uiC/Icon.jsx";
import { useDialog } from "../../../hooks/useDialog.js";
import { REASON_MIN, SESSION_ACTIONS, moderateSession, moderationErrorText } from "../../../services/adminSessionsService.js";
import { adminErrorText } from "../students/format.js";
import { textareaCls } from "./sessionFormat.js";

/**
 * Confirmation for reject / cancel / remove: explains the consequence, takes the reason (required or optional per
 * SESSION_ACTIONS) and, for removal, an explicit acknowledgement. Calls `onDone()` once the server accepted it and
 * `onConflict(message)` when the session changed meanwhile (409), so the caller can reload it.
 */
export default function SessionActionDialog({ action, session, onCancel, onDone, onConflict }) {
  const def = SESSION_ACTIONS[action];
  const panelRef = useRef(null);
  const titleId = useId();
  const reasonId = useId();
  const [reason, setReason] = useState("");
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const onKeyDown = useDialog(panelRef, () => !busy && onCancel());

  const required = def.reason === "required";
  const reasonOk = !required || reason.trim().length >= REASON_MIN;
  const canSubmit = reasonOk && (!def.acknowledge || ack) && !busy;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError("");
    try {
      await moderateSession(session, action, reason);
      onDone();
    } catch (err) {
      const conflict = moderationErrorText(err);
      if (conflict && err.status === 409) {
        onConflict?.(conflict);
        return;
      }
      setError(adminErrorText(err, "That didn't work. Please try again."));
      setBusy(false);
    }
  };

  return createPortal(
    // Keys stay inside this dialog (it can be rendered within the session dialog's React tree).
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
        className="animate-dialog-in relative flex w-full max-w-[480px] flex-col gap-4 rounded-[24px] border border-line bg-surface p-6 shadow-pop outline-none"
      >
        <div className="flex flex-col gap-1.5">
          <h2 id={titleId} className="break-words text-xl font-extrabold leading-7 text-fg">{def.title(session.title)}</h2>
          <p className="text-sm leading-5 text-fg-2">{def.message}</p>
          {action === "cancel" && session.participantCount > 0 && (
            <p className="text-sm font-semibold leading-5 text-fg">
              {session.participantCount} participant{session.participantCount === 1 ? "" : "s"} will be notified.
            </p>
          )}
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
            placeholder={def.placeholder}
            className={textareaCls}
          />
          {required && !reasonOk && <p className="text-xs text-fg-3">At least {REASON_MIN} characters.</p>}
        </div>

        {def.acknowledge && (
          <label className="flex cursor-pointer items-start gap-2.5 text-[13px] text-fg-2">
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 size-4 accent-[var(--color-live)]" />
            {def.acknowledge}
          </label>
        )}

        {error && <ErrorLine>{error}</ErrorLine>}

        <div className="flex justify-end gap-2.5">
          <Button variant="outline" size="s" onClick={onCancel} disabled={busy}>Keep it</Button>
          <Button type="submit" variant={def.tone} size="s" disabled={!canSubmit} aria-busy={busy}>
            {busy && <Icon name="loader" size="sm" className="animate-spin" />}
            {def.confirm}
          </Button>
        </div>
      </form>
    </div>,
    document.body
  );
}

export function ErrorLine({ children }) {
  return (
    <p role="alert" className="flex items-start gap-2 rounded-[10px] border border-live/25 bg-danger-soft px-3 py-2.5 text-[13px] font-semibold text-live">
      <Icon name="alert" size="sm" className="mt-px" />
      {children}
    </p>
  );
}
