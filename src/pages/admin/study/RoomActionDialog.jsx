import { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Button from "../../../Components/uiC/Button.jsx";
import Icon from "../../../Components/uiC/Icon.jsx";
import { useDialog } from "../../../hooks/useDialog.js";
import { REASON_MIN, ROOM_ACTIONS, moderateStudyRoom, studyModerationErrorText } from "../../../services/adminStudyRoomsService.js";
import { adminErrorText } from "../students/format.js";
import { ErrorLine } from "../sessions/SessionActionDialog.jsx";
import { textareaCls } from "../sessions/sessionFormat.js";

/**
 * Confirmation for the sensitive Study With Me actions (close / reopen a room, remove / warn a participant):
 * explains the consequence, takes the reason (required or optional per ROOM_ACTIONS) and, where defined, an explicit
 * acknowledgement. `onDone()` once the server accepted it; `onConflict(message)` when the state changed meanwhile (409).
 */
export default function RoomActionDialog({ action, room, participant = null, onCancel, onDone, onConflict }) {
  const def = ROOM_ACTIONS[action];
  const panelRef = useRef(null);
  const titleId = useId();
  const reasonId = useId();
  const [reason, setReason] = useState("");
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const onKeyDown = useDialog(panelRef, () => !busy && onCancel());

  const acknowledge = def.acknowledge?.(room, participant) ?? null;
  const required = def.reason === "required";
  const reasonOk = !required || reason.trim().length >= REASON_MIN;
  const canSubmit = reasonOk && (!acknowledge || ack) && !busy;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError("");
    try {
      await moderateStudyRoom(room, action, reason, participant);
      onDone(def.done(room, participant));
    } catch (err) {
      const conflict = studyModerationErrorText(err);
      if (conflict && err.status === 409) {
        onConflict?.(conflict);
        return;
      }
      setError(adminErrorText(err, "That didn't work. Please try again."));
      setBusy(false);
    }
  };

  return createPortal(
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
        <div className="flex items-start gap-3">
          <span className={`flex size-11 shrink-0 items-center justify-center rounded-[14px] ${def.tone === "danger" ? "bg-danger-soft text-live" : def.tone === "warning" ? "bg-warn-soft text-warn" : "bg-primary-soft text-primary-text"}`}>
            <Icon name={def.icon} />
          </span>
          <div className="flex min-w-0 flex-col gap-1.5">
            <h2 id={titleId} className="break-words text-xl font-extrabold leading-7 text-fg">{def.title(room, participant)}</h2>
            <p className="text-sm leading-5 text-fg-2">{def.message(room, participant)}</p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={reasonId} className="text-[13px] font-bold text-fg">
            {required ? "Reason" : "Note"} {required ? <span aria-hidden="true">*</span> : <span className="font-normal text-fg-3">(optional)</span>}
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

        {acknowledge && (
          <label className="flex cursor-pointer items-start gap-2.5 text-[13px] text-fg-2">
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 size-4 accent-[var(--color-live)]" />
            {acknowledge}
          </label>
        )}

        {error && <ErrorLine>{error}</ErrorLine>}

        <div className="flex justify-end gap-2.5">
          <Button variant="outline" size="s" onClick={onCancel} disabled={busy}>Cancel</Button>
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
