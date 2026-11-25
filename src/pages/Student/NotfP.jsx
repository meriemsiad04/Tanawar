import { useEffect, useState } from "react";
import Button from "../../Components/uiC/Button.jsx";
import Icon from "../../Components/uiC/Icon.jsx";
import JoinRequestActions from "../../Components/sharedC/JoinRequestActions.jsx";
import { NOTIFICATION_ICON, timeAgo, useNotifications } from "../../hooks/useNotifications.js";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
];

const Note = ({ children }) => (
  <div className="flex max-w-[760px] flex-col items-start gap-3 rounded-[18px] border border-line bg-surface p-5 text-[13px] leading-[19px] text-fg-2">{children}</div>
);

/** "Today" / "Yesterday" / "Earlier" section for a notification date. */
function groupOf(iso) {
  const day = new Date(iso);
  day.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today - day) / 86400000);
  return diff <= 0 ? "Today" : diff === 1 ? "Yesterday" : "Earlier";
}
const GROUPS = ["Today", "Yesterday", "Earlier"];

const fullDate = (iso) =>
  new Date(iso).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * Notifications page (inside StudentLayout): reminders, join requests, ratings and approvals.
 * Shares its state with the bell (hooks/useNotifications.js), so marking as read here updates the badge at once.
 * Arriving from the bell preview (#notif-<id>) scrolls to and highlights that notification.
 */
export default function NotfP() {
  const { status, items, unread, error: loadError, reload, markRead, markAllRead, respond } = useNotifications();
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");

  // Scroll the notification opened from the bell preview into view once the list is there.
  useEffect(() => {
    if (status !== "ready" || !window.location.hash.startsWith("#notif-")) return;
    document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView({ block: "center" });
  }, [status]);

  const run = async (action) => {
    setError("");
    try {
      await action();
    } catch {
      setError("Couldn’t update your notifications. Please try again.");
    }
  };

  const open = (n) => {
    markRead(n.id).catch(() => {});
    if (n.href) window.location.assign(n.href);
  };

  const shown = filter === "unread" ? items.filter((n) => !n.read) : items;
  const grouped = GROUPS.map((g) => ({ label: g, list: shown.filter((n) => groupOf(n.createdAt) === g) })).filter((g) => g.list.length);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-serif text-[30px] font-bold leading-[38px] tracking-[-0.005em] text-fg">Notifications</h1>
          <p className="text-[15px] leading-[23px] text-fg-2">
            {status === "ready" ? (unread ? `${unread} unread` : "You’re all caught up.") : "What happened on your sessions."}
          </p>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="s" onClick={() => run(markAllRead)}>
            <Icon name="check" size="sm" /> Mark all as read
          </Button>
        )}
      </div>

      {status === "ready" && items.length > 0 && (
        <div role="tablist" aria-label="Filter notifications" className="flex w-fit gap-1 rounded-xl bg-surface-2 p-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={`cursor-pointer rounded-lg px-3.5 py-2 text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                filter === f.value ? "bg-surface text-fg shadow-sm" : "text-fg-2 hover:text-fg"
              }`}
            >
              {f.label}
              {f.value === "unread" && unread > 0 && <span className="ml-1.5 rounded-full bg-live px-1.5 text-[11px] text-white">{unread}</span>}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="text-[13px] font-bold text-live">
          {error}
        </p>
      )}

      {status === "loading" || status === "idle" ? (
        <Note>Loading notifications…</Note>
      ) : status === "error" ? (
        <Note>
          {loadError?.code === "NOT_CONFIGURED" ? "Notifications will appear here once the server is connected." : "Notifications aren’t available right now."}
          <Button variant="outline" size="s" onClick={reload}>
            Try again
          </Button>
        </Note>
      ) : grouped.length ? (
        <div className="flex max-w-[760px] flex-col gap-5">
          {grouped.map((g) => (
            <section key={g.label} className="flex flex-col gap-2.5" aria-label={g.label}>
              <h2 className="text-xs font-extrabold uppercase leading-4 tracking-[0.14em] text-fg-3">{g.label}</h2>
              <ul className="flex flex-col gap-2.5">
                {g.list.map((n) => (
                  <li
                    key={n.id}
                    id={`notif-${n.id}`}
                    className={`flex scroll-mt-28 items-start gap-2 rounded-[18px] border transition-colors target:ring-4 target:ring-primary/30 ${
                      n.read ? "border-line bg-surface" : "border-accent-line bg-accent-soft"
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 flex-col">
                    <button
                      type="button"
                      onClick={() => open(n)}
                      className={`flex min-w-0 flex-1 cursor-pointer items-start gap-3.5 rounded-[18px] pl-5 pt-4 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 ${n.request ? "pb-2.5" : "pb-4"}`}
                    >
                      <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${n.read ? "bg-surface-2 text-fg-2" : "bg-surface text-primary-text"}`}>
                        <Icon name={NOTIFICATION_ICON[n.kind] ?? "bell"} />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className={`text-sm leading-5 text-fg ${n.read ? "" : "font-bold"}`}>{n.text}</span>
                        <time dateTime={n.createdAt} title={fullDate(n.createdAt)} className="text-xs leading-4 text-fg-2">
                          {timeAgo(n.createdAt)}
                        </time>
                      </span>
                    </button>
                    {/* Join request: answer right here (outside the button so the actions stay separate). */}
                    {n.request && (
                      <div className="pb-4 pl-[74px] pr-2">
                        <JoinRequestActions request={n.request} onRespond={(decision) => respond(n.id, decision)} />
                      </div>
                    )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1 py-3.5 pr-3.5">
                      {n.read ? (
                        <span className="px-2 text-xs font-semibold text-fg-3">Read</span>
                      ) : (
                        <>
                          <span aria-hidden="true" className="size-2.5 rounded-full bg-live" />
                          <button
                            type="button"
                            onClick={() => run(() => markRead(n.id))}
                            aria-label="Mark as read"
                            title="Mark as read"
                            className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg text-primary-text hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                          >
                            <Icon name="check" size="sm" />
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <Note>
          {filter === "unread" ? "No unread notifications. You’re all caught up." : "You’re all caught up. New activity on your sessions will show here."}
        </Note>
      )}
    </>
  );
}
