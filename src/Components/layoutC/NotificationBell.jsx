import { useEffect, useId, useRef, useState } from "react";
import Icon from "../uiC/Icon.jsx";
import JoinRequestActions from "../sharedC/JoinRequestActions.jsx";
import { NOTIFICATION_ICON, timeAgo, useNotifications } from "../../hooks/useNotifications.js";

const NOTIFICATIONS_PATH = "/app/notifications";
const PREVIEW_COUNT = 5;
const OPEN_DELAY = 120;
const CLOSE_DELAY = 200;

/**
 * App-bar bell: red unread badge + a preview of the newest notifications on hover (or keyboard focus).
 * Clicking the bell, a notification or "View all" opens the Notifications page; a clicked notification is
 * marked read and highlighted there. Touch screens have no hover, so a tap simply opens the page.
 */
export default function NotificationBell() {
  const { status, items, unread, markRead, markAllRead, respond } = useNotifications();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const timer = useRef(null);
  const bellRef = useRef(null);
  const panelId = useId();

  useEffect(() => () => clearTimeout(timer.current), []);

  const schedule = (next, delay) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(next), delay);
  };

  const openNotification = (n) => {
    markRead(n.id).catch(() => {}); // the page shows it as unread again if the server refused
    window.location.assign(`${NOTIFICATIONS_PATH}#notif-${encodeURIComponent(n.id)}`);
  };

  const readAll = async () => {
    setError("");
    try {
      await markAllRead();
    } catch {
      setError("Couldn’t mark them as read. Please try again.");
    }
  };

  const badge = unread > 9 ? "9+" : String(unread);
  const latest = items.slice(0, PREVIEW_COUNT);

  return (
    <div
      className="relative"
      onMouseEnter={() => schedule(true, OPEN_DELAY)}
      onMouseLeave={() => schedule(false, CLOSE_DELAY)}
      onFocus={() => schedule(true, 0)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) schedule(false, 0);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          setOpen(false);
          bellRef.current?.focus();
        }
      }}
    >
      <a
        ref={bellRef}
        href={NOTIFICATIONS_PATH}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-controls={panelId}
        aria-expanded={open}
        className="relative flex size-11 cursor-pointer items-center justify-center rounded-xl border border-line text-fg transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <Icon name="bell" />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute left-[25px] top-0.5 min-w-[22px] rounded-full border-2 border-surface bg-live px-[5px] py-px text-center text-xs font-bold leading-4 text-white"
          >
            {badge}
          </span>
        )}
      </a>

      {/* pt-2 bridges the gap so moving the pointer from the bell into the panel keeps it open. */}
      <div
        id={panelId}
        role="region"
        aria-label="Latest notifications"
        hidden={!open}
        className="absolute right-0 top-full z-40 w-[380px] max-w-[calc(100vw-2rem)] pt-2"
      >
        <div className="animate-dialog-in overflow-hidden rounded-[20px] border border-line bg-surface shadow-pop">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <p className="flex items-center gap-2 text-[15px] font-extrabold leading-5 text-fg">
              Notifications
              {unread > 0 && (
                <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-bold text-live">{unread} new</span>
              )}
            </p>
            {unread > 0 && (
              <button
                type="button"
                onClick={readAll}
                className="cursor-pointer rounded-md text-[13px] font-bold text-primary-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                Mark all read
              </button>
            )}
          </div>

          {error && (
            <p role="alert" className="border-b border-line px-4 py-2 text-xs font-bold text-live">
              {error}
            </p>
          )}

          {status === "loading" || status === "idle" ? (
            <p role="status" className="px-4 py-8 text-center text-[13px] text-fg-2">Loading notifications…</p>
          ) : status === "error" ? (
            <p className="px-4 py-8 text-center text-[13px] text-fg-2">Notifications aren’t available right now.</p>
          ) : latest.length ? (
            <ul className="max-h-[min(420px,60vh)] overflow-y-auto">
              {latest.map((n) => (
                <li key={n.id} className="border-b border-line last:border-b-0">
                  <button
                    type="button"
                    onClick={() => openNotification(n)}
                    className={`flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 ${
                      n.read ? "hover:bg-surface-2" : "bg-accent-soft/60 hover:bg-accent-soft"
                    }`}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-text">
                      <Icon name={NOTIFICATION_ICON[n.kind] ?? "bell"} size="sm" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className={`line-clamp-2 text-[13px] leading-[18px] text-fg ${n.read ? "" : "font-bold"}`}>{n.text}</span>
                      <span className="text-xs leading-4 text-fg-3">{timeAgo(n.createdAt)}</span>
                    </span>
                    {!n.read && <span aria-label="Unread" className="mt-1.5 size-2 shrink-0 rounded-full bg-live" />}
                  </button>
                  {/* Join requests can be answered straight from the preview. */}
                  {n.request && (
                    <div className={`pb-3 pl-16 pr-4 ${n.read ? "" : "bg-accent-soft/60"}`}>
                      <JoinRequestActions compact request={n.request} onRespond={(decision) => respond(n.id, decision)} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-8 text-center text-[13px] text-fg-2">You’re all caught up.</p>
          )}

          <a
            href={NOTIFICATIONS_PATH}
            className="flex items-center justify-center gap-1 border-t border-line px-4 py-3 text-[13px] font-bold text-primary-text hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none"
          >
            View all notifications <span aria-hidden="true">›</span>
          </a>
        </div>
      </div>
    </div>
  );
}
