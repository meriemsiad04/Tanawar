import { useId, useRef } from "react";
import { createPortal } from "react-dom";
import Button from "../uiC/Button.jsx";
import { useDialog } from "../../hooks/useDialog.js";

/**
 * Small confirmation pop-up (e.g. "Leave this session?"). Mount it only while it is open.
 * Escape / backdrop / Cancel call `onCancel` (blocked while `busy`).
 * `tone` is the confirm Button variant: "danger" (default) | "primary".
 */
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  busy = false,
  onConfirm,
  onCancel,
}) {
  const titleId = useId();
  const messageId = useId();
  const panelRef = useRef(null);
  const cancel = () => {
    if (!busy) onCancel?.();
  };
  const onKeyDown = useDialog(panelRef, cancel);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onKeyDown={onKeyDown}>
      <div aria-hidden="true" onClick={cancel} className="animate-overlay-in fixed inset-0 bg-ink/60 backdrop-blur-md dark:bg-black/60" />

      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        tabIndex={-1}
        className="animate-dialog-in relative flex w-full max-w-[420px] flex-col gap-5 rounded-[24px] border border-line bg-surface p-6 shadow-pop outline-none"
      >
        <div className="flex flex-col gap-1.5">
          <h2 id={titleId} className="text-xl font-extrabold leading-7 text-fg">
            {title}
          </h2>
          <p id={messageId} className="text-sm leading-5 text-fg-2">
            {message}
          </p>
        </div>

        <div className="flex justify-end gap-2.5">
          <Button variant="outline" size="s" onClick={cancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={tone} size="s" onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
