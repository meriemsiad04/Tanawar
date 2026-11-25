// S stands for session and P stands for page in the pages naming inside the student pannel
import { useMemo, useState } from "react";
import Button from "../../../Components/uiC/Button.jsx";
import BookingRow from "../../../Components/sharedC/BookingRow.jsx";
import LeaveSessionDialog from "../../../Components/sharedC/LeaveSessionDialog.jsx";
import JoinReq from "./JoinReq.jsx";
import { useAsync } from "../../../hooks/useAsync.js";
import { useSessionActions } from "../../../hooks/useSessionActions.js";
import { listJoinRequests, listSessions } from "../../../services/sessionsService.js";

const Note = ({ children }) => (
  <div className="flex flex-col items-start gap-3 rounded-[18px] border border-line bg-surface p-5 text-[13px] leading-[19px] text-fg-2">{children}</div>
);

/** Segmented tabs (My bookings / Requests to approve). */
function Tabs({ tabs, value, onChange }) {
  return (
    <div role="tablist" aria-label="Bookings" className="inline-flex gap-1 self-start rounded-[14px] bg-surface-2 p-1">
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={`h-9 cursor-pointer rounded-[10px] px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 ${
              active ? "bg-surface text-fg shadow-sm" : "text-fg-2 hover:text-fg"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/** Bookings: sessions the student joined or asked to join, and join requests on the sessions they host. */
export default function MySessionsP() {
  const sessions = useAsync(listSessions);
  const requests = useAsync(listJoinRequests);
  const actions = useSessionActions();
  const { apply } = actions;
  const [tab, setTab] = useState("bookings");
  const [answered, setAnswered] = useState([]); // request ids answered on this page

  const bookings = useMemo(
    () =>
      apply(sessions.data ?? [])
        .filter((s) => s.myStatus === "joined" || s.myStatus === "pending")
        .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)),
    [apply, sessions.data]
  );
  const pending = (requests.data ?? []).filter((r) => !answered.includes(r.id));

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="font-serif text-[30px] font-bold leading-[38px] tracking-[-0.005em] text-fg">Bookings</h1>
        <p className="text-[15px] leading-[23px] text-fg-2">Public sessions join instantly. Private ones need the host’s approval.</p>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "bookings", label: `My bookings${sessions.status === "ready" ? ` (${bookings.length})` : ""}` },
          { value: "requests", label: `Requests to approve${requests.status === "ready" ? ` (${pending.length})` : ""}` },
        ]}
      />

      {tab === "requests" ? (
        <JoinReq state={{ ...requests, requests: pending }} onAnswered={(r) => setAnswered((a) => [...a, r.id])} />
      ) : sessions.status === "loading" ? (
        <Note>Loading your bookings…</Note>
      ) : sessions.status === "error" ? (
        <Note>
          Your bookings aren’t available right now.
          <Button variant="outline" size="s" onClick={sessions.reload}>
            Try again
          </Button>
        </Note>
      ) : bookings.length ? (
        <div className="flex flex-col gap-3">
          {actions.error && (
            <p role="alert" className="text-[13px] font-bold text-live">
              {actions.error}
            </p>
          )}
          {bookings.map((s) => (
            <BookingRow key={s.id} session={s} busy={actions.busyId === s.id} onEnter={actions.enter} onLeave={actions.askLeave} onCancel={actions.cancelRequest} />
          ))}
        </div>
      ) : (
        <Note>
          You haven’t booked any session yet.
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
