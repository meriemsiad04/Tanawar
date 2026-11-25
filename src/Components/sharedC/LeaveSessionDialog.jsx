import ConfirmDialog from "./ConfirmDialog.jsx";

/** "Leave this session?" confirmation, driven by useSessionActions (`leaving`, `busyId`, `confirmLeave`, `cancelLeave`). */
export default function LeaveSessionDialog({ session, busy, onConfirm, onCancel }) {
  if (!session) return null;
  return (
    <ConfirmDialog
      title="Leave this session?"
      message={`You’ll lose your seat in “${session.title}”. You can join again later if seats are still available.`}
      confirmLabel="Leave session"
      busy={busy}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
