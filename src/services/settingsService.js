import { apiRequest } from "./apiClient.js";
import { getSession } from "./authService.js";

/**
 * Student preferences (Settings page). The profile itself is saved through profileService.
 *
 * Expected backend contract (Bearer token; adjust here when the API is built):
 *   GET /students/me/settings → { language: "en" | "fr" | "ar", notifications: { sessionReminders, bookingRequests, weeklyEmail } }
 *   PUT /students/me/settings body: same shape → saved settings
 */
const token = () => getSession()?.token;
const isDemo = () => Boolean(import.meta.env.DEV) && token() === "demo-token";
const call = (path, opts) => apiRequest(path, { token: token(), ...opts });

export const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "ar", label: "العربية" },
];

export const NOTIFICATION_OPTIONS = [
  { key: "sessionReminders", label: "Session reminders", hint: "Before a session you joined or host starts." },
  { key: "bookingRequests", label: "Booking requests", hint: "When a student asks to join your private session." },
  { key: "weeklyEmail", label: "Weekly recommendations email", hint: "A summary of sessions picked for you." },
];

export const DEFAULT_SETTINGS = { language: "en", notifications: { sessionReminders: true, bookingRequests: true, weeklyEmail: false } };

const DEMO_KEY = "tanawar.demoSettings";

export async function getSettings() {
  if (isDemo()) {
    // Dev demo account only: persists in localStorage because there is no backend.
    try {
      const saved = JSON.parse(localStorage.getItem(DEMO_KEY) ?? "{}");
      return { ...DEFAULT_SETTINGS, ...saved, notifications: { ...DEFAULT_SETTINGS.notifications, ...saved.notifications } };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }
  return call("/students/me/settings");
}

export async function saveSettings(settings) {
  if (isDemo()) {
    localStorage.setItem(DEMO_KEY, JSON.stringify(settings));
    return settings;
  }
  return call("/students/me/settings", { method: "PUT", body: settings });
}
