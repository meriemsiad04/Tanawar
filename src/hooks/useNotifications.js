import { useEffect, useSyncExternalStore } from "react";
import { notificationsStore } from "../services/notificationsService.js";

const REFRESH_MS = 60_000;

/**
 * Shared notifications state for the bell badge, the preview pop-up and the Notifications page.
 * The first component that mounts loads the list; it refreshes when the window regains focus and every minute
 * while the tab is visible. Returns { status, items (newest first), unread, error, reload, markRead, markAllRead,
 * respond(notificationId, "approved" | "declined") } (respond answers a join-request notification).
 */
export function useNotifications() {
  const state = useSyncExternalStore(notificationsStore.subscribe, notificationsStore.getSnapshot);

  useEffect(() => {
    if (notificationsStore.getSnapshot().status === "idle") notificationsStore.load();
    const refresh = () => document.visibilityState === "visible" && notificationsStore.load({ silent: true });
    const timer = setInterval(refresh, REFRESH_MS);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return {
    ...state,
    unread: state.items.filter((n) => !n.read).length,
    reload: () => notificationsStore.load(),
    markRead: notificationsStore.markRead,
    markAllRead: notificationsStore.markAllRead,
    respond: notificationsStore.respond,
  };
}

/** Icon per notification kind (registered in uiC/Icon.jsx). */
export const NOTIFICATION_ICON = { reminder: "clock", request: "userCheck", rating: "star", approved: "check" };

/** "Just now", "25 min ago", "2 h ago", "3 d ago" */
export function timeAgo(iso) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}
