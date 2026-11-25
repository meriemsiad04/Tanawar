import { ApiError, apiRequest } from "./apiClient.js";
import { getSession, updateSessionUser } from "./authService.js";
import { listSessions } from "./sessionsService.js";

/**
 * Student profile: the only place the frontend talks to the profile endpoints.
 *
 * Expected backend contract (Bearer token; adjust here when the API is built):
 *   GET /students/me/profile        → { fullName, major, level, avatarUrl, birthdate, bio, strongModules[], memberSince }
 *   PUT /students/me/profile        body: same fields (avatarUrl: data URL | null | unchanged URL) → saved profile
 *   GET /students/me/rating         → { average: number, count: number, reviews: [{ id, rating, comment, author, createdAt }] }
 *   GET /students/me/hosted-sessions→ [{ id, title, module, level, startsAt, durationMin, mode, location, seats, booked, status }]
 *   GET /students/me/attendance?from=YYYY-MM-DD → [{ date: "YYYY-MM-DD", count }]  (sessions attended per day)
 * The login response must include user.profileCompleted; the profile gate in App.jsx relies on it.
 */

const DEMO_KEY = "tanawar.demoProfile";
const token = () => getSession()?.token;
const isDemo = () => Boolean(import.meta.env.DEV) && token() === "demo-token";

/** Subset of the profile mirrored into the session user (navbar chip, profile gate). */
const sessionPatch = (p) => ({
  fullName: p.fullName,
  field: p.major,
  level: p.level,
  avatarUrl: p.avatarUrl || null,
  profileCompleted: true,
});

export const profileFromSession = () => {
  const u = getSession()?.user ?? {};
  return { fullName: u.fullName ?? "", major: u.field ?? "", level: u.level ?? "", avatarUrl: u.avatarUrl ?? null, birthdate: "", bio: "", strongModules: [] };
};

const call = (path, opts) => apiRequest(path, { token: token(), ...opts });

export async function getProfile() {
  if (isDemo()) {
    // Dev demo account only: persists in localStorage because there is no backend.
    try {
      return { ...profileFromSession(), ...JSON.parse(localStorage.getItem(DEMO_KEY) ?? "{}") };
    } catch {
      return profileFromSession();
    }
  }
  return call("/students/me/profile");
}

export async function saveProfile(profile) {
  let saved;
  if (isDemo()) {
    saved = profile;
    localStorage.setItem(DEMO_KEY, JSON.stringify(profile));
  } else {
    saved = await call("/students/me/profile", { method: "PUT", body: profile });
    if (!saved || typeof saved !== "object") throw new ApiError("Unexpected response from the server.", { code: "BAD_RESPONSE" });
  }
  updateSessionUser(sessionPatch({ ...profile, ...saved }));
  return { ...profile, ...saved };
}

export const getRating = async () => {
  if (isDemo()) return DEMO_RATING;
  return call("/students/me/rating");
};
export const getHostedSessions = async () => {
  if (isDemo()) {
    // Dev demo account only: the demo sessions this student hosts (including ones created on the Sessions page).
    const list = await listSessions();
    return list
      .filter((s) => s.myStatus === "host")
      .map((s) => ({ ...s, booked: s.joined, status: new Date(s.startsAt) < new Date() ? "completed" : "scheduled" }));
  }
  return call("/students/me/hosted-sessions");
};

/* Dev demo account only: sample reviews. Dead code in production builds. */
const DEMO_RATING = import.meta.env.DEV
  ? {
      average: 4.8,
      count: 3,
      reviews: [
        { id: "rv1", rating: 5, comment: "Clear explanations and great exercises, thank you!", author: "Sara Mebarki", createdAt: "2026-11-18T17:00:00Z" },
        { id: "rv2", rating: 5, comment: "Recursion finally makes sense.", author: "Nour Saidi", createdAt: "2026-11-10T15:30:00Z" },
        { id: "rv3", rating: 4, comment: "Very helpful, a bit fast at the end.", author: "Karim Ouali", createdAt: "2026-10-29T10:00:00Z" },
      ],
    }
  : null;
export const getAttendance = async (from) => {
  if (isDemo()) return demoAttendance(from);
  return call(`/students/me/attendance?from=${from}`);
};

/** Dev demo account only: deterministic sample days so the heatmap can be previewed. Remove with the demo account. */
function demoAttendance(from) {
  const out = [];
  const start = new Date(`${from}T00:00:00`);
  const today = new Date();
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (const d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const weekday = d.getDay() >= 1 && d.getDay() <= 5;
    if (rand() < (weekday ? 0.35 : 0.08)) {
      const count = rand() < 0.7 ? 1 : rand() < 0.7 ? 2 : rand() < 0.6 ? 3 : 5;
      out.push({ date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, count });
    }
  }
  return out;
}
