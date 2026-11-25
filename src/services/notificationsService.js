import { apiRequest } from "./apiClient.js";
import { getSession } from "./authService.js";

/**
 * Notifications (bell → Notifications page).
 *
 * Expected backend contract (Bearer token; adjust here when the API is built):
 *   GET  /notifications          → [{ id, kind: "reminder" | "request" | "rating" | "approved", text, createdAt (ISO), read, href? }]
 *   POST /notifications/read-all → 204
 */
const token = () => getSession()?.token;
const isDemo = () => Boolean(import.meta.env.DEV) && token() === "demo-token";
const call = (path, opts) => apiRequest(path, { token: token(), ...opts });

const DEMO_KEY = "tanawar.demoNotificationsRead";

export async function listNotifications() {
  if (isDemo()) {
    const allRead = localStorage.getItem(DEMO_KEY) === "1";
    return demoNotifications().map((n) => (allRead ? { ...n, read: true } : n));
  }
  return call("/notifications");
}

export async function markAllRead() {
  if (isDemo()) return localStorage.setItem(DEMO_KEY, "1");
  await call("/notifications/read-all", { method: "POST" });
}

/* Dev demo account only: sample notifications. Dead code in production builds. */
const ago = (min) => new Date(Date.now() - min * 60 * 1000).toISOString();
const demoNotifications = () =>
  import.meta.env.DEV
    ? [
        { id: "n1", kind: "reminder", text: "Amine Khelifi starts “Dynamic Programming Bootcamp” today at 18:00.", createdAt: ago(25), read: false, href: "/app/sessions" },
        { id: "n2", kind: "request", text: "Nour Saidi requested to join “Recursion for Beginners”.", createdAt: ago(90), read: false, href: "/app/bookings" },
        { id: "n3", kind: "rating", text: "You received a 5★ rating from Sara Mebarki.", createdAt: ago(60 * 26), read: true, href: "/app/profile" },
        { id: "n4", kind: "approved", text: "Lina Hamidi approved your request for “Eigenvalues Made Simple”.", createdAt: ago(60 * 50), read: true, href: "/app/bookings" },
      ]
    : [];
