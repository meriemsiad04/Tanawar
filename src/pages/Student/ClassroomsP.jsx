import { useMemo } from "react";
import Button from "../../Components/uiC/Button.jsx";
import BookingRow from "../../Components/sharedC/BookingRow.jsx";
import LeaveSessionDialog from "../../Components/sharedC/LeaveSessionDialog.jsx";
import { useAsync } from "../../hooks/useAsync.js";
import { useSessionActions } from "../../hooks/useSessionActions.js";
import { listSessions } from "../../services/sessionsService.js";

const Note = ({ children }) => (
  <div className="flex flex-col items-start gap-3 rounded-[18px] border border-line bg-surface p-5 text-[13px] leading-[19px] text-fg-2">{children}</div>
);

/** Classrooms: every session the student can enter (hosting or joined), soonest first. */
export default function ClassroomsP() {
  const { status, data, reload } = useAsync(listSessions);
  const actions = useSessionActions();
  const { apply } = actions;
  const rooms = useMemo(
    () =>
      apply(data ?? [])
        .filter((s) => s.myStatus === "host" || s.myStatus === "joined")
        .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)),
    [apply, data]
  );

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="font-serif text-[30px] font-bold leading-[38px] tracking-[-0.005em] text-fg">Classrooms</h1>
        <p className="text-[15px] leading-[23px] text-fg-2">The sessions you host or joined. Enter one to see its resources and countdown.</p>
      </div>

      {actions.error && (
        <p role="alert" className="text-[13px] font-bold text-live">
          {actions.error}
        </p>
      )}

      {status === "loading" ? (
        <Note>Loading your classrooms…</Note>
      ) : status === "error" ? (
        <Note>
          Your classrooms aren’t available right now.
          <Button variant="outline" size="s" onClick={reload}>
            Try again
          </Button>
        </Note>
      ) : rooms.length ? (
        <div className="flex flex-col gap-3">
          {rooms.map((s) => (
            <BookingRow key={s.id} session={s} busy={actions.busyId === s.id} onEnter={actions.enter} onLeave={actions.askLeave} />
          ))}
        </div>
      ) : (
        <Note>
          No classroom yet. Join or host a session to get one.
          <a href="/app/sessions" className="text-sm font-bold text-primary-text hover:underline">
            Browse sessions ›
          </a>
        </Note>
      )}

      <LeaveSessionDialog
        session={actions.leaving}
        busy={actions.busyId === actions.leaving?.id}
        onConfirm={actions.confirmLeave}
        onCancel={actions.cancelLeave}
      />
    </>
  );
}
