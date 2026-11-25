import { useEffect, useState } from "react";
import Button from "../../Components/uiC/Button.jsx";
import Icon from "../../Components/uiC/Icon.jsx";
import JoinRequestActions from "../../Components/sharedC/JoinRequestActions.jsx";
import { NOTIFICATION_ICON, timeAgo, useNotifications } from "../../hooks/useNotifications.js";

/** Per-type label + icon tile colours (design tokens only, so dark mode follows). */
const KINDS = {
  request: { label: "Join request", plural: "Join requests", tile: "bg-primary-soft text-primary-text" },
  reminder: { label: "Reminder", plural: "Reminders", tile: "bg-warn-soft text-warn" },
  rating: { label: "Rating", plural: "Ratings", tile: "bg-highlight/15 text-warn" },
  approved: { label: "Approval", plural: "Approvals", tile: "bg-accent-soft text-accent-ink" },
};
const kindOf = (k) => KINDS[k] ?? { label: "Update", plural: "Updates", tile: "bg-surface-2 text-fg-2" };

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

/** Big round icon + text, for empty / error states inside the panel. */
function PanelState({ icon, title, children }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary-text">
        <Icon name={icon} size="lg" />
      </span>
      <p className="text-base font-extrabold text-fg">{title}</p>
      <div className="flex max-w-sm flex-col items-center gap-3 text-[13px] leading-[19px] text-fg-2">{children}</div>
    </div>
  );
}

/** Placeholder rows while the list loads. */
const Skeleton = () => (
  <ul aria-hidden="true" className="divide-y divide-line">
    {[0, 1, 2, 3].map((i) => (
      <li key={i} className="flex items-start gap-3.5 px-5 py-4">
        <span className="size-10 shrink-0 animate-pulse rounded-xl bg-surface-2" />
        <span className="flex flex-1 flex-col gap-2 pt-1">
          <span className="h-3.5 w-4/5 animate-pulse rounded bg-surface-2" />
          <span className="h-3 w-1/3 animate-pulse rounded bg-surface-2" />
        </span>
      </li>
    ))}
  </ul>
);

/**
 * Notifications page (inside StudentLayout): reminders, join requests, ratings and approvals, as one inbox panel
 * with type filters, plus a summary card on wide screens.
 * Shares its state with the bell (hooks/useNotifications.js), so marking as read here updates the badge at once.
 * Arriving from the bell preview (#notif-<id>) scrolls to and highlights that notification.
 */
export default function NotfP() {
  const { status, items, unread, error: loadError, reload, markRead, markAllRead, respond } = useNotifications();
  const [filter, setFilter] = useState("all"); // "all" | "unread" | a kind
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

  // Tabs: All, Unread, then one per type that actually has notifications.
  const kindsPresent = Object.keys(KINDS).filter((k) => items.some((n) => n.kind === k));
  const tabs = [
    { value: "all", label: "All", count: items.length },
    { value: "unread", label: "Unread", count: unread, alert: true },
    ...kindsPresent.map((k) => ({ value: k, label: KINDS[k].plural, count: items.filter((n) => n.kind === k).length })),
  ];
  const pendingRequests = items.filter((n) => n.request?.status === "pending").length;

  const shown = filter === "all" ? items : filter === "unread" ? items.filter((n) => !n.read) : items.filter((n) => n.kind === filter);
  const grouped = GROUPS.map((g) => ({ label: g, list: shown.filter((n) => groupOf(n.createdAt) === g) })).filter((g) => g.list.length);
  const ready = status === "ready";

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-serif text-[30px] font-bold leading-[38px] tracking-[-0.005em] text-fg">Notifications</h1>
          <p className="text-[15px] leading-[23px] text-fg-2">
            {ready
              ? unread
                ? `You have ${unread} unread notification${unread === 1 ? "" : "s"}${pendingRequests ? ` and ${pendingRequests} join request${pendingRequests === 1 ? "" : "s"} to answer` : ""}.`
                : "You’re all caught up."
              : "Reminders, join requests, ratings and approvals."}
          </p>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="s" onClick={() => run(markAllRead)}>
            <Icon name="check" size="sm" /> Mark all as read
          </Button>
        )}
      </div>

      {error && (
        <p role="alert" className="flex items-center gap-2 text-[13px] font-bold text-live">
          <Icon name="alert" size="sm" /> {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
        {/* Inbox */}
        <section aria-label="Notifications" className="overflow-hidden rounded-[20px] border border-line bg-surface">
          {ready && items.length > 0 && (
            <div className="border-b border-line px-3 py-3 sm:px-4">
              <div role="tablist" aria-label="Filter notifications" className="-mx-1 flex gap-1 overflow-x-auto px-1 [scrollbar-width:none]">
                {tabs.map((t) => {
                  const active = filter === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setFilter(t.value)}
                      className={`inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 ${
                        active ? "bg-primary text-white" : "text-fg-2 hover:bg-surface-2 hover:text-fg"
                      }`}
                    >
                      {t.label}
                      <span
                        className={`rounded-full px-1.5 text-[11px] leading-4 ${
                          active ? "bg-white/20 text-white" : t.alert && t.count ? "bg-live text-white" : "bg-surface-2 text-fg-3"
                        }`}
                      >
                        {t.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {status === "loading" || status === "idle" ? (
            <Skeleton />
          ) : status === "error" ? (
            <PanelState icon="alert" title="Notifications aren’t available">
              {loadError?.code === "NOT_CONFIGURED" ? "They will appear here once the server is connected." : "Something went wrong while loading them."}
              <Button variant="outline" size="s" onClick={reload}>
                Try again
              </Button>
            </PanelState>
          ) : grouped.length ? (
            grouped.map((g) => (
              <section key={g.label} aria-label={g.label}>
                <h2 className="border-b border-line bg-surface-2/60 px-5 py-2 text-[11px] font-extrabold uppercase leading-4 tracking-[0.14em] text-fg-3">
                  {g.label}
                </h2>
                <ul className="divide-y divide-line">
                  {g.list.map((n) => {
                    const kind = kindOf(n.kind);
                    return (
                      <li
                        key={n.id}
                        id={`notif-${n.id}`}
                        className={`group relative flex scroll-mt-28 items-start gap-2 transition-colors target:bg-primary-soft ${
                          n.read ? "hover:bg-surface-2/50" : "bg-accent-soft/40 hover:bg-accent-soft/70"
                        }`}
                      >
                        {/* Unread accent bar */}
                        {!n.read && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-primary" />}

                        <div className="flex min-w-0 flex-1 flex-col">
                          <button
                            type="button"
                            onClick={() => open(n)}
                            className={`flex min-w-0 cursor-pointer items-start gap-3.5 pl-5 pt-4 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary/30 ${n.request ? "pb-2.5" : "pb-4"}`}
                          >
                            <span className={`relative flex size-10 shrink-0 items-center justify-center rounded-xl ${kind.tile}`}>
                              <Icon name={NOTIFICATION_ICON[n.kind] ?? "bell"} size="sm" />
                              {!n.read && (
                                <span aria-label="Unread" className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-surface bg-live" />
                              )}
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col gap-1">
                              <span className={`text-sm leading-5 ${n.read ? "text-fg-2" : "font-bold text-fg"}`}>{n.text}</span>
                              <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs leading-4 text-fg-3">
                                <span className="font-semibold">{kind.label}</span>
                                <span aria-hidden="true">·</span>
                                <time dateTime={n.createdAt} title={fullDate(n.createdAt)}>
                                  {timeAgo(n.createdAt)}
                                </time>
                              </span>
                            </span>
                          </button>

                          {/* Join request: answer right here (outside the button so the actions stay separate). */}
                          {n.request && (
                            <div className="pb-4 pl-[74px] pr-2">
                              <JoinRequestActions request={n.request} onRespond={(decision) => respond(n.id, decision)} />
                            </div>
                          )}
                        </div>

                        {/* Row actions: always visible on touch screens, on hover / focus with a mouse. */}
                        <div className="flex shrink-0 items-center gap-1 py-3.5 pr-3 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100">
                          {!n.read && (
                            <button
                              type="button"
                              onClick={() => run(() => markRead(n.id))}
                              aria-label="Mark as read"
                              title="Mark as read"
                              className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg text-primary-text hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                            >
                              <Icon name="check" size="sm" />
                            </button>
                          )}
                          {n.href && (
                            <a
                              href={n.href}
                              onClick={() => markRead(n.id).catch(() => {})}
                              aria-label="Open"
                              title="Open"
                              className="inline-flex size-9 items-center justify-center rounded-lg text-fg-3 hover:bg-surface hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                            >
                              <Icon name="chevronRight" size="sm" />
                            </a>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          ) : (
            <PanelState icon={filter === "all" ? "bell" : "check"} title={filter === "all" ? "No notifications yet" : "Nothing here"}>
              {filter === "all"
                ? "Reminders, join requests, ratings and approvals for your sessions will show up here."
                : filter === "unread"
                  ? "No unread notifications. You’re all caught up."
                  : `No ${kindOf(filter).plural.toLowerCase()} right now.`}
              {filter !== "all" && (
                <button type="button" onClick={() => setFilter("all")} className="cursor-pointer text-[13px] font-bold text-primary-text hover:underline">
                  Show all notifications
                </button>
              )}
            </PanelState>
          )}
        </section>

        {/* Summary (wide screens) */}
        {ready && items.length > 0 && (
          <aside aria-label="Summary" className="hidden flex-col gap-4 rounded-[20px] border border-line bg-surface p-5 xl:flex">
            <div className="flex items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-ink text-white">
                <Icon name="bell" />
              </span>
              <div className="flex flex-col">
                <span className="text-2xl font-extrabold leading-7 text-fg">{unread}</span>
                <span className="text-[13px] text-fg-2">unread of {items.length}</span>
              </div>
            </div>

            <ul className="flex flex-col gap-1">
              {kindsPresent.map((k) => {
                const list = items.filter((n) => n.kind === k);
                const newCount = list.filter((n) => !n.read).length;
                return (
                  <li key={k}>
                    <button
                      type="button"
                      onClick={() => setFilter(k)}
                      className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${filter === k ? "bg-surface-2" : ""}`}
                    >
                      <span className={`flex size-8 items-center justify-center rounded-lg ${KINDS[k].tile}`}>
                        <Icon name={NOTIFICATION_ICON[k]} size="sm" className="!size-4" />
                      </span>
                      <span className="flex-1 text-sm font-semibold text-fg">{KINDS[k].plural}</span>
                      {newCount > 0 && <span className="rounded-full bg-live px-1.5 text-[11px] font-bold leading-4 text-white">{newCount} new</span>}
                      <span className="w-5 text-right text-sm font-bold text-fg-3">{list.length}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <a
              href="/app/settings"
              className="flex items-center gap-2 border-t border-line pt-4 text-[13px] font-bold text-primary-text hover:underline"
            >
              <Icon name="gear" size="sm" className="!size-4" /> Notification settings
            </a>
          </aside>
        )}
      </div>
    </>
  );
}
