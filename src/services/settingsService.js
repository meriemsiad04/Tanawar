import { ApiError, apiRequest } from "./apiClient.js";
import { getSession } from "./authService.js";
import { FONT_SIZES, THEMES, applyAppearance, getDeviceAppearance } from "./appearance.js";

/**
 * Student preferences (Settings page → Preferences and Privacy tabs). The profile is saved through profileService,
 * email / password / devices / data / deletion through accountService.
 * Full contract and who enforces what: docs/settings.md.
 *
 * Expected backend contract (Bearer token; adjust here when the API is built):
 *   GET /students/me/settings → Settings (see DEFAULT_SETTINGS for the shape; missing keys fall back to the defaults)
 *   PUT /students/me/settings body: Settings → saved Settings · 422 VALIDATION_ERROR { fields: { "learning.dailyGoalMinutes": msg } }
 *
 * Read settings through hooks/useSettings.js (shared store at the bottom), never fetch them in components.
 */
const token = () => getSession()?.token;
const isDemo = () => Boolean(import.meta.env.DEV) && token() === "demo-token";
const call = (path, opts) => apiRequest(path, { token: token(), ...opts });

export const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "ar", label: "العربية" },
];

export const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: "sun" },
  { value: "dark", label: "Dark", icon: "moon" },
  { value: "system", label: "System", icon: "monitor" },
];

export const FONT_SIZE_OPTIONS = [
  { value: "small", label: "Small" },
  { value: "default", label: "Default" },
  { value: "large", label: "Large" },
];

export const STUDY_TIMES = [
  { value: "morning", label: "Morning", hint: "8:00 – 12:00" },
  { value: "afternoon", label: "Afternoon", hint: "12:00 – 17:00" },
  { value: "evening", label: "Evening", hint: "17:00 – 21:00" },
  { value: "night", label: "Night", hint: "21:00 – 00:00" },
];

/** Who can see / do something. `friends` = accepted connections. */
export const AUDIENCES = [
  { value: "everyone", label: "All UMBB students" },
  { value: "friends", label: "Friends only" },
  { value: "private", label: "Only me" },
];

export const FRIEND_REQUEST_OPTIONS = [
  { value: "everyone", label: "All UMBB students" },
  { value: "sameMajor", label: "Students in my major" },
  { value: "nobody", label: "Nobody" },
];

export const NOTIFICATION_OPTIONS = [
  { key: "sessions", label: "Study sessions", hint: "Join requests, approvals and changes to sessions you host or joined." },
  { key: "reminders", label: "Reminders", hint: "Shortly before a session you joined or host starts." },
  { key: "friendRequests", label: "Friend requests", hint: "When a student asks to connect with you." },
  { key: "messages", label: "Messages", hint: "New direct messages from other students." },
  { key: "studyWithMe", label: "Study With Me", hint: "When a friend starts studying in a room." },
  { key: "resources", label: "Resources", hint: "New resources in your favourite modules, and reviews of the ones you shared." },
  { key: "achievements", label: "Achievements", hint: "Ratings you receive, milestones and streaks." },
  { key: "email", label: "Email updates", hint: "A weekly summary by email. Security emails are always sent." },
];

/** Which preference controls each in-app notification kind (see notificationsService). */
export const NOTIFICATION_KIND_PREF = { reminder: "reminders", request: "sessions", approved: "sessions", rating: "achievements" };

export const SETTINGS_LIMITS = {
  favoriteModules: 10,
  goals: 3,
  goalText: 80,
  dailyGoalMinutes: { min: 15, max: 720, step: 15 },
  weeklyGoalHours: { min: 1, max: 80 },
};

export const DEFAULT_SETTINGS = {
  language: "en",
  appearance: { theme: "system", fontSize: "default", reduceMotion: false },
  learning: {
    favoriteModules: [],
    goals: [],
    dailyGoalMinutes: 120,
    weeklyGoalHours: 10,
    studyTimes: [],
    studyWithMe: { confirmLeave: true, timerInTab: true, showInRanking: true },
  },
  notifications: {
    sessions: true,
    reminders: true,
    friendRequests: true,
    messages: true,
    studyWithMe: false,
    resources: true,
    achievements: true,
    email: false,
  },
  privacy: {
    profileVisibility: "everyone",
    friendRequests: "everyone",
    activityVisibility: "friends",
    statsVisibility: "friends",
  },
};

const pick = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback);
const bool = (value, fallback) => (typeof value === "boolean" ? value : fallback);
const num = (value, fallback) => (Number.isFinite(Number(value)) && value !== "" && value !== null ? Number(value) : fallback);
const strings = (value) => (Array.isArray(value) ? value.filter((v) => typeof v === "string") : []);
const values = (list) => list.map((o) => o.value);

/**
 * Fills missing keys with defaults and drops unknown values, so older or partial server data never breaks the page.
 * Also migrates the first version's notification keys (sessionReminders / bookingRequests / weeklyEmail).
 * Without a saved appearance, keeps what this device already uses instead of forcing the defaults on it.
 */
export function normalizeSettings(raw = {}) {
  const d = DEFAULT_SETTINGS;
  const a = raw.appearance ?? getDeviceAppearance();
  const l = raw.learning ?? {};
  const swm = l.studyWithMe ?? {};
  const n = raw.notifications ?? {};
  const p = raw.privacy ?? {};
  return {
    language: pick(raw.language, values(LANGUAGES), d.language),
    appearance: {
      theme: pick(a.theme, THEMES, d.appearance.theme),
      fontSize: pick(a.fontSize, FONT_SIZES, d.appearance.fontSize),
      reduceMotion: bool(a.reduceMotion, d.appearance.reduceMotion),
    },
    learning: {
      favoriteModules: strings(l.favoriteModules),
      goals: strings(l.goals),
      dailyGoalMinutes: num(l.dailyGoalMinutes, d.learning.dailyGoalMinutes),
      weeklyGoalHours: num(l.weeklyGoalHours, d.learning.weeklyGoalHours),
      studyTimes: strings(l.studyTimes).filter((t) => values(STUDY_TIMES).includes(t)),
      studyWithMe: {
        confirmLeave: bool(swm.confirmLeave, d.learning.studyWithMe.confirmLeave),
        timerInTab: bool(swm.timerInTab, d.learning.studyWithMe.timerInTab),
        showInRanking: bool(swm.showInRanking, d.learning.studyWithMe.showInRanking),
      },
    },
    notifications: Object.fromEntries(
      NOTIFICATION_OPTIONS.map(({ key }) => {
        const legacy = { reminders: n.sessionReminders, sessions: n.bookingRequests, email: n.weeklyEmail }[key];
        return [key, bool(n[key], bool(legacy, d.notifications[key]))];
      })
    ),
    privacy: {
      profileVisibility: pick(p.profileVisibility, values(AUDIENCES), d.privacy.profileVisibility),
      friendRequests: pick(p.friendRequests, values(FRIEND_REQUEST_OPTIONS), d.privacy.friendRequests),
      activityVisibility: pick(p.activityVisibility, values(AUDIENCES), d.privacy.activityVisibility),
      statsVisibility: pick(p.statsVisibility, values(AUDIENCES), d.privacy.statsVisibility),
    },
  };
}

/** Field errors keyed by path ("learning.dailyGoalMinutes"). The server must run the same checks. */
export function validateSettings(s) {
  const e = {};
  const L = SETTINGS_LIMITS;
  const daily = s.learning.dailyGoalMinutes;
  if (!Number.isInteger(daily) || daily < L.dailyGoalMinutes.min || daily > L.dailyGoalMinutes.max)
    e["learning.dailyGoalMinutes"] = `Pick a daily goal between ${L.dailyGoalMinutes.min} minutes and ${L.dailyGoalMinutes.max / 60} hours.`;
  const weekly = s.learning.weeklyGoalHours;
  if (!Number.isInteger(weekly) || weekly < L.weeklyGoalHours.min || weekly > L.weeklyGoalHours.max)
    e["learning.weeklyGoalHours"] = `Enter a whole number of hours between ${L.weeklyGoalHours.min} and ${L.weeklyGoalHours.max}.`;
  else if (Number.isInteger(daily) && weekly * 60 < daily)
    e["learning.weeklyGoalHours"] = "Your weekly goal is smaller than one day of your daily goal.";
  if (s.learning.favoriteModules.length > L.favoriteModules) e["learning.favoriteModules"] = `Pick up to ${L.favoriteModules} modules.`;
  if (s.learning.goals.length > L.goals) e["learning.goals"] = `Keep up to ${L.goals} goals.`;
  else if (s.learning.goals.some((g) => !g.trim() || g.trim().length > L.goalText))
    e["learning.goals"] = `Each goal needs 1 to ${L.goalText} characters.`;
  return e;
}

/* ───────────── API ───────────── */

const DEMO_KEY = "tanawar.demoSettings";

export async function getSettings() {
  if (isDemo()) {
    // Dev demo account only: persists in localStorage because there is no backend.
    try {
      return normalizeSettings(JSON.parse(localStorage.getItem(DEMO_KEY) ?? "{}"));
    } catch {
      return normalizeSettings();
    }
  }
  const data = await call("/students/me/settings");
  if (!data || typeof data !== "object") throw new ApiError("Unexpected response from the server.", { code: "BAD_RESPONSE" });
  return normalizeSettings(data);
}

export async function saveSettings(settings) {
  const clean = normalizeSettings({
    ...settings,
    learning: { ...settings.learning, goals: settings.learning.goals.map((g) => g.trim()) },
  });
  const errors = validateSettings(clean);
  if (Object.keys(errors).length) {
    throw new ApiError("Some settings need your attention.", { status: 422, code: "VALIDATION_ERROR", details: { fields: errors } });
  }
  if (isDemo()) {
    localStorage.setItem(DEMO_KEY, JSON.stringify(clean));
    return clean;
  }
  const saved = await call("/students/me/settings", { method: "PUT", body: clean });
  return normalizeSettings(saved && typeof saved === "object" ? saved : clean);
}

/* ───────────── Shared store ───────────── */

let state = { status: "idle", data: null, error: null };
const listeners = new Set();
const set = (next) => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};

/** Applying the account's appearance makes it follow the student across devices (and restores it after sign-in). */
const applyAccountAppearance = (data) => applyAppearance(data.appearance, { animate: false });

export const settingsStore = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: () => state,

  async load({ silent = false } = {}) {
    if (!silent) set({ status: state.data ? "ready" : "loading", error: null });
    try {
      const data = await getSettings();
      set({ status: "ready", data, error: null });
      applyAccountAppearance(data);
      return data;
    } catch (error) {
      if (!state.data) set({ status: "error", error });
      throw error;
    }
  },

  /** Saves the full settings object; the store (and every reader) updates on success. */
  async save(next) {
    const data = await saveSettings(next);
    set({ status: "ready", data, error: null });
    applyAccountAppearance(data);
    return data;
  },

  /** Navbar theme toggle: keeps the account's theme in step, so the choice survives the next sign-in. Best effort. */
  saveTheme(theme) {
    if (!state.data || getSession()?.user?.role !== "student") return;
    settingsStore.save({ ...state.data, appearance: { ...state.data.appearance, theme } }).catch(() => {});
  },

  /** Forget the signed-in student's settings (sign-out / account deletion). */
  reset: () => set({ status: "idle", data: null, error: null }),
};
