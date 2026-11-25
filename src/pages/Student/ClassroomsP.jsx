import { useMemo } from "react";
import Button from "../../Components/uiC/Button.jsx";
import SessionListCard from "../../Components/sharedC/SessionListCard.jsx";
import LeaveSessionDialog from "../../Components/sharedC/LeaveSessionDialog.jsx";
import { useAsync } from "../../hooks/useAsync.js";
import { useSessionActions } from "../../hooks/useSessionActions.js";
import { listSessions, sessionState } from "../../services/sessionsService.js";

const Note = ({ children }) => (
  <div className="flex flex-col items-start gap-3 rounded-[18px] border border-line bg-surface p-5 text-[13px] leading-[19px] text-fg-2">{children}</div>
);

// Live classrooms first, then upcoming ones (soonest first), finished ones last.
const STATE_ORDER = { live: 0, scheduled: 1, ended: 2 };

/**
 * Classrooms: the ONLINE sessions the student hosts or joined, as cards (same card as the Sessions page).
 * On-site sessions have no virtual classroom, so they're left out (they stay in My bookings).
 */
export default function ClassroomsP() {
  const { status, data, reload } = useAsync(listSessions);
  const actions = useSessionActions();
  const { apply } = actions;
  const rooms = useMemo(
    () =>
      apply(data ?? [])
        .filter((s) => s.mode === "online" && (s.myStatus === "host" || s.myStatus === "joined"))
        .map((s) => ({ s, state: sessionState(s) }))
        .sort((a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state] || new Date(a.s.startsAt) - new Date(b.s.startsAt))
        .map(({ s }) => s),
    [apply, data]
  );
  const liveCount = rooms.filter((s) => sessionState(s) === "live").length;

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="font-serif text-[30px] font-bold leading-[38px] tracking-[-0.005em] text-fg">Classrooms</h1>
        <p className="text-[15px] leading-[23px] text-fg-2">
          {status === "ready" && rooms.length
            ? `${rooms.length} online classroom${rooms.length === 1 ? "" : "s"}${liveCount ? ` · ${liveCount} live now` : ""}. Enter one to see its resources and countdown.`
            : "Your online sessions (hosted or joined). Enter one to see its resources and countdown."}
        </p>
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
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {rooms.map((s) => (
            <SessionListCard
              key={s.id}
              session={s}
              busy={actions.busyId === s.id}
              onAction={actions.onAction}
              onCancel={actions.cancelRequest}
              onEnter={actions.enter}
              onLeave={actions.askLeave}
            />
          ))}
        </div>
      ) : (
        <Note>
          No online classroom yet. Join or host an online session to get one.
          <a href="/app/sessions?mode=online" className="text-sm font-bold text-primary-text hover:underline">
            Browse online sessions ›
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
