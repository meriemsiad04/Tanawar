import { useEffect, useState } from "react";
import { listNotifications } from "../services/notificationsService.js";
import { listSessions } from "../services/sessionsService.js";

/**
 * Live badge numbers for the student shell: unread notifications (bell) and bookings (sidebar).
 * Every page is a full load for now (no router), so reading them once per page keeps them current.
 * Falls back to 0 while loading or if the API isn't reachable.
 */
export function useNavCounts() {
  const [counts, setCounts] = useState({ notifications: 0, bookings: 0 });
  useEffect(() => {
    let active = true;
    listNotifications()
      .then((list) => active && setCounts((c) => ({ ...c, notifications: list.filter((n) => !n.read).length })))
      .catch(() => {});
    listSessions()
      .then((list) => active && setCounts((c) => ({ ...c, bookings: list.filter((s) => s.myStatus === "joined" || s.myStatus === "pending").length })))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return counts;
}
