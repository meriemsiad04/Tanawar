import Button from "../uiC/Button.jsx";
import Icon from "../uiC/Icon.jsx";
import SessionStatusBadge from "./SessionStatusBadge.jsx";

/** "Sat 28 Nov, 10:00" */
const formatWhen = (iso) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}, ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
};

/**
 * One booking (Bookings page): status badge + module, title, date · host, and the action.
 * Joined → Enter classroom + Leave; hosting → Enter classroom; pending → Pending (waiting for the host) + Cancel.
 */
export default function BookingRow({ session, busy = false, onEnter, onLeave, onCancel }) {
  const { title, module, startsAt, host, myStatus } = session;
  const joined = myStatus === "joined";
  const hosting = myStatus === "host";
  return (
    <article className="flex flex-col gap-3 rounded-[18px] border border-line bg-surface px-5 py-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <SessionStatusBadge tone={hosting ? "clay" : joined ? "joined" : "warn"}>{hosting ? "Hosting" : joined ? "Joined" : "Pending"}</SessionStatusBadge>
          <span className="truncate text-xs font-semibold text-fg-2">{module}</span>
        </div>
        <h3 className="truncate text-[15px] font-bold leading-5 text-fg">{title}</h3>
        <p className="text-[13px] leading-[19px] text-fg-2">
          {formatWhen(startsAt)}
          {hosting ? "" : ` · ${host.name}`}
        </p>
      </div>
      {hosting ? (
        <Button size="s" onClick={() => onEnter?.(session)}>
          Enter classroom
        </Button>
      ) : joined ? (
        <div className="flex items-center gap-1">
          <Button size="s" onClick={() => onEnter?.(session)}>
            Enter classroom
          </Button>
          <button
            type="button"
            onClick={() => onLeave?.(session)}
            disabled={busy}
            className="h-[38px] cursor-pointer rounded-[10px] px-3 text-sm font-bold text-fg-2 hover:text-fg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Leave
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <Button size="s" variant="outline" disabled className="disabled:opacity-70">
            <Icon name="clock" size="sm" /> Pending
          </Button>
          <button
            type="button"
            onClick={() => onCancel?.(session)}
            disabled={busy}
            className="h-[38px] cursor-pointer rounded-[10px] px-3 text-sm font-bold text-fg-2 hover:text-fg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      )}
    </article>
  );
}
