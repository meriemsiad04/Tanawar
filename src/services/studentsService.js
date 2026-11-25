import { apiRequest } from "./apiClient.js";
import { getSession } from "./authService.js";

/**
 * Dashboard data about modules and other students.
 *
 * Expected backend contract (Bearer token; adjust here when the API is built):
 *   GET  /students/me/modules      → [{ code, name, publishedSessions }]
 *   GET  /students/me/suggestions  → [{ id, fullName, major, level, rating, verified, avatarUrl, modules: [code], friendStatus }]
 *   POST /students/:id/friend-requests → 204
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
