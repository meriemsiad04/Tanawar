import { apiRequest } from "./apiClient.js";
import { getSession } from "./authService.js";

/**
 * Data about modules and other students (dashboard, Connections, student profiles).
 *
 * Expected backend contract (Bearer token; adjust here when the API is built):
 *   GET  /students/me/modules      → [{ code, name, publishedSessions }]
 *   GET  /students/me/suggestions  → [{ id, fullName, major, level, rating, verified, avatarUrl, modules: [code], friendStatus }]
 *   GET  /students/me/friends      → [{ id, fullName, major, level, rating, verified, avatarUrl }]
 *   POST /students/:id/friend-requests → 204
 *   GET  /students/:id             → { id, fullName, major, level, faculty, bio, avatarUrl, verified, rating, ratingCount,
 *                                      sessionsGiven, strongModules: [name], interests: [string],
 *                                      friendStatus: "none" | "pending" | "friends", myRating: 1–5 | null }
 *   GET  /students/:id/attendance?from=YYYY-MM-DD → [{ date: "YYYY-MM-DD", count }]
 *   PUT  /students/:id/rating      body: { value: 1–5 } → { rating, ratingCount }
 * Ranking happens here (rankSuggestions) so the API only has to return candidates.
 */

const token = () => getSession()?.token;
const isDemo = () => Boolean(import.meta.env.DEV) && token() === "demo-token";
const call = (path, opts) => apiRequest(path, { token: token(), ...opts });

/** Abbreviation shown in the module tile: the code's letters (INF301 → INF), else the name's initials. */
export const moduleAbbr = ({ code = "", name = "" }) =>
  code.match(/^[A-Za-zÀ-ÿ]+/)?.[0].slice(0, 4).toUpperCase() ||
  name.split(/\s+/).map((w) => w[0]).join("").slice(0, 3).toUpperCase();

/**
 * Orders candidates by relevance: shared modules first (strongest signal),
 * then same major, same level, and finally rating. Drops people already friends with / requested by the user.
 */
export function rankSuggestions(students, { modules = [], major = "", level = "" } = {}) {
  const mine = new Set(modules.map((m) => m.code));
  const same = (a, b) => Boolean(a) && a?.toLowerCase() === b?.toLowerCase();
  const score = (s) =>
    (s.modules ?? []).filter((c) => mine.has(c)).length * 10 + (same(s.major, major) ? 4 : 0) + (same(s.level, level) ? 2 : 0) + (Number(s.rating) || 0) / 5;
  return students
    .filter((s) => !s.friendStatus || s.friendStatus === "none")
    .map((s) => ({ ...s, sharedModules: (s.modules ?? []).filter((c) => mine.has(c)).length }))
    .sort((a, b) => score(b) - score(a));
}

export async function getModules() {
  if (isDemo()) return DEMO_MODULES;
  return call("/students/me/modules");
}

export async function getSuggestedStudents(modules = []) {
  const user = getSession()?.user ?? {};
  const list = isDemo() ? DEMO_STUDENTS : await call("/students/me/suggestions");
  return rankSuggestions(list, { modules, major: user.field, level: user.level });
}

export async function sendFriendRequest(id) {
  if (isDemo()) return;
  await call(`/students/${encodeURIComponent(id)}/friend-requests`, { method: "POST" });
}

export async function getFriends() {
  if (isDemo()) return DEMO_FRIENDS;
  return call("/students/me/friends");
}

export const studentPath = (id) => `/app/students/${encodeURIComponent(id)}`;

export async function getStudent(id) {
  if (isDemo()) {
    const base = [...DEMO_FRIENDS, ...DEMO_STUDENTS].find((s) => s.id === id);
    if (!base) throw new Error("Student not found.");
    const myRating = Number(localStorage.getItem(`tanawar.demoRating.${id}`)) || null;
    return { ...base, ...DEMO_DETAILS[id], friendStatus: DEMO_FRIENDS.includes(base) ? "friends" : "none", myRating };
  }
  return call(`/students/${encodeURIComponent(id)}`);
}

export async function getStudentAttendance(id, from) {
  if (isDemo()) return demoAttendance(id, from);
  return call(`/students/${encodeURIComponent(id)}/attendance?from=${from}`);
}

/** Rates a tutor (1–5). Returns the updated { rating, ratingCount }. */
export async function rateStudent(id, value) {
  if (isDemo()) {
    const s = await getStudent(id);
    const first = !s.myRating;
    localStorage.setItem(`tanawar.demoRating.${id}`, String(value));
    const count = s.ratingCount + (first ? 1 : 0);
    const total = s.rating * s.ratingCount - (s.myRating ?? 0) + value;
    return { rating: Math.round((total / count) * 10) / 10, ratingCount: count };
  }
  return call(`/students/${encodeURIComponent(id)}/rating`, { method: "PUT", body: { value } });
}

/** Dev demo account only: deterministic sample days per student so the heatmap can be previewed. */
function demoAttendance(id, from) {
  const out = [];
  let seed = [...String(id)].reduce((n, c) => n + c.charCodeAt(0), 11);
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const today = new Date();
  for (const d = new Date(`${from}T00:00:00`); d <= today; d.setDate(d.getDate() + 1)) {
    if (rand() < (d.getDay() >= 1 && d.getDay() <= 5 ? 0.45 : 0.12)) {
      out.push({ date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, count: rand() < 0.6 ? 1 : rand() < 0.7 ? 2 : 4 });
    }
  }
  return out;
}

/* Dev demo account only: sample data so the dashboard can be previewed. Dead code in production builds. */
const DEMO_MODULES = import.meta.env.DEV
  ? [
      { code: "INF301", name: "Algorithms", publishedSessions: 12 },
      { code: "INF305", name: "Databases", publishedSessions: 9 },
      { code: "INF310", name: "Web Development", publishedSessions: 7 },
      { code: "INF302", name: "Operating Systems", publishedSessions: 5 },
    ]
  : [];
const DEMO_STUDENTS = import.meta.env.DEV
  ? [
      { id: "s1", fullName: "Sara Mebarki", major: "Computer Science", level: "L3", rating: 4.8, verified: true, modules: ["INF301", "INF305"] },
      { id: "s2", fullName: "Nour Saidi", major: "Computer Science", level: "L2", rating: 4.4, verified: true, modules: ["INF302"] },
      { id: "s3", fullName: "Karim Ouali", major: "Electrical Engineering", level: "M2", rating: 4.6, verified: true, modules: [] },
      { id: "s4", fullName: "Walid Bouzid", major: "Hydrocarbons & Chemistry", level: "M1", rating: 4.5, verified: false, modules: [] },
    ]
  : [];
const DEMO_FRIENDS = import.meta.env.DEV
  ? [
      { id: "s5", fullName: "Amine Khelifi", major: "Computer Science", level: "M1", rating: 4.9, verified: true },
      { id: "s6", fullName: "Lina Hamidi", major: "Mathematics", level: "L3", rating: 4.7, verified: true },
    ]
  : [];
// Profile details for the demo students (Connections → student profile).
const DEMO_DETAILS = import.meta.env.DEV
  ? {
      s1: { faculty: "Faculty of Sciences", bio: "Front-end lover. Happy to review your React projects.", ratingCount: 27, sessionsGiven: 18, strongModules: ["Web Development", "Algorithms"], interests: ["Web", "UI design"] },
      s2: { faculty: "Faculty of Sciences", bio: "Graph theory fan, always up for a whiteboard session.", ratingCount: 9, sessionsGiven: 6, strongModules: ["Algorithms"], interests: ["Competitive programming"] },
      s3: { faculty: "Faculty of Engineering", bio: "Signals, MATLAB and coffee.", ratingCount: 15, sessionsGiven: 11, strongModules: ["Signal Processing"], interests: ["Electronics", "Audio"] },
      s4: { faculty: "Faculty of Hydrocarbons", bio: "Chemistry tutoring for first-year students.", ratingCount: 6, sessionsGiven: 4, strongModules: ["Chemistry"], interests: ["Energy"] },
      s5: { faculty: "Faculty of Sciences", bio: "Database nerd, SQL wizard, and part-time chess player.", ratingCount: 41, sessionsGiven: 32, strongModules: ["Databases", "Operating Systems"], interests: ["Data", "Systems"] },
      s6: { faculty: "Faculty of Sciences", bio: "Linear algebra with pictures, not just formulas.", ratingCount: 22, sessionsGiven: 14, strongModules: ["Linear Algebra"], interests: ["Maths", "Teaching"] },
    }
  : {};
