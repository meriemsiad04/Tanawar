import { apiRequest } from "./apiClient.js";
import { getSession } from "./authService.js";

/**
 * Notifications (bell badge + hover preview → Notifications page).
 *
 * Expected backend contract (Bearer token; adjust here when the API is built):
 *   GET  /notifications           → [{ id, kind: "reminder" | "request" | "rating" | "approved", text, createdAt (ISO), read, href?,
 *                                      request?: { id, status: "pending" | "approved" | "declined" } }]
 *                                    (`request` is set on kind "request": someone asked to join one of the user's sessions)
 *   POST /notifications/:id/read  → 204
 *   POST /notifications/read-all  → 204
 *   POST /join-requests/:id/approve | /join-requests/:id/decline → 204  (host only; also marks the notification read)
 *
 * The shared store at the bottom keeps the bell, the preview pop-up and the Notifications page in sync:
 * read it with hooks/useNotifications.js, never fetch notifications directly in components.
 */
const token = () => getSession()?.token;
const isDemo = () => Boolean(import.meta.env.DEV) && token() === "demo-token";
const call = (path, opts) => apiRequest(path, { token: token(), ...opts });

const DEMO_KEY = "tanawar.demoNotificationsRead"; // "1" = all read (legacy) or a JSON array of read ids

function demoReadIds() {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    if (raw === "1") return "all";
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

const DEMO_DECISIONS_KEY = "tanawar.demoJoinDecisions"; // { [requestId]: "approved" | "declined" }
const demoDecisions = () => {
  try {
    return JSON.parse(localStorage.getItem(DEMO_DECISIONS_KEY) ?? "{}");
  } catch {
    return {};
  }
};

export async function listNotifications() {
  if (isDemo()) {
    const read = demoReadIds();
    const decided = demoDecisions();
    return demoNotifications().map((n) => ({
      ...n,
      ...(read === "all" || read.has(n.id) ? { read: true } : {}),
      ...(n.request && decided[n.request.id] ? { request: { ...n.request, status: decided[n.request.id] } } : {}),
    }));
  }
  return call("/notifications");
}

/** Host answers a join request. `decision`: "approved" | "declined". */
export async function respondToJoinRequest(requestId, decision) {
  if (isDemo()) {
    localStorage.setItem(DEMO_DECISIONS_KEY, JSON.stringify({ ...demoDecisions(), [requestId]: decision }));
    return;
  }
  await call(`/join-requests/${encodeURIComponent(requestId)}/${decision === "approved" ? "approve" : "decline"}`, { method: "POST" });
}

export async function markNotificationRead(id) {
  if (isDemo()) {
    const read = demoReadIds();
    if (read !== "all") localStorage.setItem(DEMO_KEY, JSON.stringify([...read, id]));
    return;
  }
  await call(`/notifications/${encodeURIComponent(id)}/read`, { method: "POST" });
}

export async function markAllRead() {
  if (isDemo()) return localStorage.setItem(DEMO_KEY, "1");
  await call("/notifications/read-all", { method: "POST" });
}

/* ───────────── Shared store ───────────── */

let state = { status: "idle", items: [], error: null };
const listeners = new Set();
const emit = (next) => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};

/** Newest first, so every view (pop-up, page) agrees on the order. */
const sortNewest = (list) => [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

export const notificationsStore = {
  getSnapshot: () => state,
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /** Fetches the list. `silent` keeps the current list visible while refreshing (e.g. on window focus). */
  async load({ silent = false } = {}) {
    if (!silent || state.status !== "ready") emit({ status: "loading", error: null });
    try {
      const list = await listNotifications();
      emit({ status: "ready", items: sortNewest(Array.isArray(list) ? list : []), error: null });
    } catch (error) {
      if (state.status !== "ready") emit({ status: "error", error });
    }
  },

  /** Optimistic: the badge drops immediately; rolled back if the server refuses. */
  async markRead(id) {
    const target = state.items.find((n) => n.id === id);
    if (!target || target.read) return;
    emit({ items: state.items.map((n) => (n.id === id ? { ...n, read: true } : n)) });
    try {
      await markNotificationRead(id);
    } catch (err) {
      emit({ items: state.items.map((n) => (n.id === id ? { ...n, read: false } : n)) });
      throw err;
    }
  },

  /** Approve / decline the join request carried by a notification. Optimistic, rolled back on failure. */
  async respond(notificationId, decision) {
    const before = state.items;
    const target = before.find((n) => n.id === notificationId);
    if (!target?.request || target.request.status !== "pending") return;
    emit({ items: before.map((n) => (n.id === notificationId ? { ...n, read: true, request: { ...n.request, status: decision } } : n)) });
    try {
      await respondToJoinRequest(target.request.id, decision);
      await markNotificationRead(notificationId).catch(() => {}); // the server does this too; keeps the demo in sync
    } catch (err) {
      emit({ items: before });
      throw err;
    }
  },

  async markAllRead() {
    const before = state.items;
    if (!before.some((n) => !n.read)) return;
    emit({ items: before.map((n) => ({ ...n, read: true })) });
    try {
      await markAllRead();
    } catch (err) {
      emit({ items: before });
      throw err;
    }
  },
};

/* Dev demo account only: sample notifications. Dead code in production builds. */
const ago = (min) => new Date(Date.now() - min * 60 * 1000).toISOString();
const demoNotifications = () =>
  import.meta.env.DEV
    ? [
        { id: "n1", kind: "reminder", text: "Amine Khelifi starts “Dynamic Programming Bootcamp” today at 18:00.", createdAt: ago(25), read: false, href: "/app/sessions" },
        {
          id: "n5", kind: "request", text: "Yasmine Larbi (L2) asked to join your session “Exercices UML : diagrammes de séquence”.",
          createdAt: ago(5), read: false, href: "/app", request: { id: "jr-1", status: "pending" },
        },
        { id: "n2", kind: "request", text: "Nour Saidi requested to join “Recursion for Beginners”.", createdAt: ago(90), read: false, href: "/app/bookings", request: { id: "jr-2", status: "pending" } },
        { id: "n3", kind: "rating", text: "You received a 5★ rating from Sara Mebarki.", createdAt: ago(60 * 26), read: true, href: "/app/profile" },
        { id: "n4", kind: "approved", text: "Lina Hamidi approved your request for “Eigenvalues Made Simple”.", createdAt: ago(60 * 50), read: true, href: "/app/bookings" },
      ]
    : [];
