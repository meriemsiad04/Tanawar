import { useState } from "react";
import Button from "../../Components/uiC/Button.jsx";
import Icon from "../../Components/uiC/Icon.jsx";
import { useAsync } from "../../hooks/useAsync.js";
import { listNotifications, markAllRead } from "../../services/notificationsService.js";

// Icon per notification kind (see notificationsService).
const KIND_ICON = { reminder: "clock", request: "userCheck", rating: "star", approved: "check" };

const Note = ({ children }) => (
  <div className="flex flex-col items-start gap-3 rounded-[18px] border border-line bg-surface p-5 text-[13px] leading-[19px] text-fg-2">{children}</div>
);

/** "25 min ago", "2 h ago", "3 d ago" */
function timeAgo(iso) {
  const min = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}

/** Notifications: reminders, join requests, ratings and approvals. Unread ones are tinted. */
export default function NotfP() {
  const { status, data, reload } = useAsync(listNotifications);
  const [allRead, setAllRead] = useState(false);
  const [error, setError] = useState("");

  const items = (data ?? []).map((n) => (allRead ? { ...n, read: true } : n));
  const unread = items.filter((n) => !n.read).length;

  const readAll = async () => {
    setError("");
    try {
      await markAllRead();
      setAllRead(true);
    } catch {
      setError("Couldn’t mark them as read. Please try again.");
    }
  };

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-serif text-[30px] font-bold leading-[38px] tracking-[-0.005em] text-fg">Notifications</h1>
          <p className="text-[15px] leading-[23px] text-fg-2">{status === "ready" ? `${unread} unread` : "What happened on your sessions."}</p>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="s" onClick={readAll}>
            <Icon name="check" size="sm" /> Mark all read
          </Button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-[13px] font-bold text-live">
          {error}
        </p>
      )}

      {status === "loading" ? (
        <Note>Loading notifications…</Note>
      ) : status === "error" ? (
        <Note>
          Notifications aren’t available right now.
          <Button variant="outline" size="s" onClick={reload}>
            Try again
          </Button>
        </Note>
      ) : items.length ? (
        <ul className="flex max-w-[760px] flex-col gap-2.5">
          {items.map((n) => (
            <li key={n.id}>
              <a
                href={n.href ?? "#"}
                className={`flex items-start gap-3.5 rounded-[18px] border px-5 py-4 transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 ${
                  n.read ? "border-line bg-surface hover:bg-surface-2" : "border-accent-line bg-accent-soft hover:border-primary"
                }`}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface text-primary-text">
                  <Icon name={KIND_ICON[n.kind] ?? "bell"} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className={`text-sm leading-5 text-fg ${n.read ? "" : "font-bold"}`}>{n.text}</span>
                  <span className="text-xs leading-4 text-fg-2">{timeAgo(n.createdAt)}</span>
                </span>
                {!n.read && <span aria-label="Unread" className="mt-1.5 size-2.5 shrink-0 rounded-full bg-primary" />}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <Note>You’re all caught up. New activity on your sessions will show here.</Note>
      )}
    </>
  );
}
