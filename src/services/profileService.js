import { DEMO_MODE } from "../config/demo.js";
import { ApiError, apiRequest } from "./apiClient.js";
import { getSession, updateSessionUser } from "./authService.js";

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
const isDemo = () => Boolean(DEMO_MODE) && token() === "demo-token";

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
      // Sample details fill the empty fields; anything saved from the edit form wins.
      return { ...profileFromSession(), ...DEMO_PROFILE, ...JSON.parse(localStorage.getItem(DEMO_KEY) ?? "{}") };
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

export const getRating = async () => (isDemo() ? DEMO_RATING : call("/students/me/rating"));
export const getHostedSessions = async () => (isDemo() ? demoHostedSessions() : call("/students/me/hosted-sessions"));
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

/* Dev demo account only: sample profile, reviews and hosted sessions so the profile page can be previewed.
   Dead code in production builds; remove with the demo account. */
const DEMO_PROFILE = DEMO_MODE
  ? {
      birthdate: "2004-03-17",
      bio: "L3 Informatique student at UMBB. I love databases and clean code, and I host weekly SQL sessions before exams.\nAlways happy to help with Génie logiciel and UML too.",
      strongModules: ["Bases de données", "Génie logiciel", "Systèmes d’exploitation", "Algorithmique"],
      memberSince: "2025-10-06",
    }
  : null;

const DEMO_RATING = DEMO_MODE
  ? {
      average: 4.7,
      count: 23,
      reviews: [
        { id: "r1", rating: 5, author: "Sara Mebarki", comment: "Super clear explanation of normal forms, the BCNF examples finally made it click.", createdAt: "2026-11-18" },
        { id: "r2", rating: 5, author: "Nour Saidi", comment: "Well prepared, shared the exercises as a PDF before the session. Thank you!", createdAt: "2026-11-04" },
        { id: "r3", rating: 4, author: "Karim Ouali", comment: "Very helpful. A bit fast on the joins part, but the Q&A at the end covered it.", createdAt: "2026-10-21" },
        { id: "r4", rating: 5, author: "Walid Bouzid", comment: "", createdAt: "2026-10-09" },
      ],
    }
  : null;

function demoHostedSessions() {
  const at = (days, hour) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };
  return [
    { id: "h1", title: "Jointures SQL et normalisation (1NF → BCNF)", module: "Bases de données", level: "L3", startsAt: at(0, 12), durationMin: 60, mode: "online", seats: 12, booked: 9, status: "live" },
    { id: "h2", title: "Diagrammes UML : cas d’utilisation et séquence", module: "Génie logiciel", level: "L3", startsAt: at(3, 14), durationMin: 90, mode: "onsite", location: "Bloc 5, Salle 12", seats: 20, booked: 14, status: "scheduled" },
    { id: "h3", title: "Ordonnancement des processus : exercices type examen", module: "Systèmes d’exploitation", level: "L3", startsAt: at(-6, 10), durationMin: 120, mode: "onsite", location: "Amphi B", seats: 30, booked: 30, status: "completed" },
    { id: "h4", title: "Requêtes SQL avancées : sous-requêtes et agrégats", module: "Bases de données", level: "L3", startsAt: at(-20, 16), durationMin: 60, mode: "online", seats: 15, booked: 11, status: "completed" },
    { id: "h5", title: "Révision : modèle OSI en 1 heure", module: "Réseaux", level: "L3", startsAt: at(-27, 18), durationMin: 60, mode: "online", seats: 10, booked: 3, status: "cancelled" },
  ];
}
