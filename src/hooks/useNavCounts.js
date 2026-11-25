import { useEffect, useState } from "react";
import { listSessions } from "../services/sessionsService.js";
import { useNotifications } from "./useNotifications.js";

/**
 * Live badge numbers for the student shell: unread notifications (bell) and bookings (sidebar).
 * Unread notifications come from the shared notifications store, so reading one anywhere updates the bell at once.
 * Bookings are read once per page (every page is a full load for now, no router).
 * Falls back to 0 while loading or if the API isn't reachable.
 */
export function useNavCounts() {
  const { unread } = useNotifications();
  const [bookings, setBookings] = useState(0);
  useEffect(() => {
    let active = true;
    listSessions()
      .then((list) => active && setBookings(list.filter((s) => s.myStatus === "joined" || s.myStatus === "pending").length))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return { notifications: unread, bookings };
}
