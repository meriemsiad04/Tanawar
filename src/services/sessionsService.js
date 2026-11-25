import { apiRequest } from "./apiClient.js";
import { getSession } from "./authService.js";

/**
 * Sessions list, classroom, join/leave and join requests.
 *
 * Expected backend contract (Bearer token; adjust here when the API is built):
 *   GET  /sessions            → [{ id, title, description, module, level, startsAt (ISO), durationMin, seats, joined (participants so far),
 *                                  mode: "online" | "onsite", meetingLink, location, visibility: "public" | "private",
 *                                  host: { name, rating, verified }, myStatus: "none" | "joined" | "pending" | "host" }]
 *                               (myStatus = the signed-in student's relation to the session)
 *   GET  /sessions/:id        → { id, type: "instant" | "scheduled", title, module, startsAt (ISO), durationMin, seats, joined (participants so far),
 *                                 mode: "online" | "onsite", meetingLink, location, host: { name },
 *                                 resources: [{ id, kind: "file" | "link", name, url }] }
 *                               (only returned to students who joined the session)
 *   POST /sessions/:id/resources (multipart, field "file") → { id, kind: "file", name, url }
 *                               (any student who joined the session may attach; 403 otherwise)
 *   POST /sessions/:id/join   → 204
 *   POST /sessions/:id/leave  → 204
 *   POST /sessions/:id/join-requests → 204 (private sessions: the host then approves or declines)
 * Filtering happens here (filterSessions) so the API only has to return the list.
 */
const token = () => getSession()?.token;
const isDemo = () => Boolean(import.meta.env.DEV) && token() === "demo-token";
const call = (path, opts) => apiRequest(path, { token: token(), ...opts });
const sid = (id) => encodeURIComponent(id);

export const classroomPath = (id) => `/app/classroom/${sid(id)}`;

export async function listSessions() {
  if (isDemo()) return demoSessions();
  return call("/sessions");
}

/**
 * Keeps the sessions matching every active filter. Empty values mean "All".
 * `query` matches the title, description, module and host name (case-insensitive).
 */
export function filterSessions(list, { query = "", module = "", level = "", mode = "", visibility = "", availableOnly = false } = {}) {
  const q = query.trim().toLowerCase();
  return list.filter(
    (s) =>
      (!q || [s.title, s.description, s.module, s.host?.name].some((t) => t?.toLowerCase().includes(q))) &&
      (!module || s.module === module) &&
      (!level || s.level === level) &&
      (!mode || s.mode === mode) &&
      (!visibility || s.visibility === visibility) &&
      (!availableOnly || s.seats - s.joined > 0)
  );
}

/** Where the session happens: the platform name for online sessions (from the meeting link), else the room. */
export function sessionPlace({ mode, meetingLink, location }) {
  if (mode !== "online") return location ?? "";
  let host = "";
  try {
    host = new URL(meetingLink).hostname;
  } catch {
    /* no or invalid link */
  }
  if (host.includes("meet.google")) return "Google Meet";
  if (host.includes("discord")) return "Discord";
  if (host.includes("zoom")) return "Zoom";
  if (host.includes("teams")) return "Microsoft Teams";
  return "Online classroom";
}

export async function getClassroom(id) {
  if (isDemo()) {
    const demo = DEMO_CLASSROOMS[id]?.() ?? demoSessionClassroom(id);
    if (!demo) throw new Error("Session not found.");
    return demo;
  }
  return call(`/sessions/${sid(id)}`);
}

export const MAX_UPLOAD_MB = 20;

/** Attach a file to a session the student joined. Returns the new resource. */
export async function uploadResource(id, file) {
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) throw new Error(`“${file.name}” is larger than ${MAX_UPLOAD_MB} MB.`);
  if (isDemo()) return { id: `up-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, kind: "file", name: file.name, url: URL.createObjectURL(file) };
  const body = new FormData();
  body.append("file", file);
  return call(`/sessions/${sid(id)}/resources`, { method: "POST", body });
}

export async function joinSession(id) {
  if (!isDemo()) await call(`/sessions/${sid(id)}/join`, { method: "POST" });
}

export async function leaveSession(id) {
  if (!isDemo()) await call(`/sessions/${sid(id)}/leave`, { method: "POST" });
}

export async function requestToJoin(id) {
  if (!isDemo()) await call(`/sessions/${sid(id)}/join-requests`, { method: "POST" });
}

/* Dev demo account only: sample sessions matching the dashboard placeholders. Dead code in production builds. */
const inHours = (h) => new Date(Date.now() + h * 3600 * 1000).toISOString();
const DEMO_CLASSROOMS = import.meta.env.DEV
  ? {
      1: () => ({
        id: 1, type: "scheduled", title: "Ordonnancement des processus : exercices type examen", module: "Systèmes d’exploitation · L3",
        startsAt: inHours(20), durationMin: 90, seats: 15, joined: 7, mode: "onsite", location: "Bloc 2, Salle 7", host: { name: "Lina Ouali" },
        resources: [
          { id: "r1", kind: "link", name: "Cours : ordonnancement (Moodle)", url: "https://example.com/os-scheduling" },
          { id: "r2", kind: "file", name: "Série d’exercices.pdf", url: "https://example.com/serie.pdf" },
        ],
      }),
      2: () => ({
        id: 2, type: "scheduled", title: "Diagrammes UML : cas d’utilisation et séquence", module: "Génie logiciel · L3",
        startsAt: inHours(0.02), durationMin: 60, seats: 10, joined: 8, mode: "online", meetingLink: "https://meet.google.com/", host: { name: "Rania Saadi" }, resources: [],
      }),
      "live-sql": () => ({
        id: "live-sql", type: "instant", title: "Jointures SQL et normalisation", module: "Bases de données",
        startsAt: inHours(0), durationMin: 60, seats: 15, joined: 12, mode: "online", meetingLink: "https://meet.jit.si/tanawar-live-sql", host: { name: "Yacine Haddad" }, resources: [],
      }),
    }
  : {};

/* Dev demo account only: the Sessions page list (one card per button state). Dead code in production builds. */
const at = (days, h, m = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};
const DEMO_SESSIONS = import.meta.env.DEV
  ? [
      { id: "dp-bootcamp", title: "Dynamic Programming Bootcamp", description: "From memoization to tabulation: solve 6 classic exam problems together.", module: "Algorithms", level: "L2", startsAt: at(0, 18), durationMin: 90, seats: 20, joined: 14, mode: "online", meetingLink: "https://meet.google.com/", visibility: "public", host: { name: "Amine Khelifi", rating: 4.9, verified: true, className: "bg-primary" }, myStatus: "none" },
      { id: "sql-joins", title: "SQL Joins & Normalization", description: "Hands-on practice before the TD exam.", module: "Databases", level: "L3", startsAt: at(1, 14), durationMin: 60, seats: 12, joined: 12, mode: "onsite", location: "Library, Room B12", visibility: "public", host: { name: "Amine Khelifi", rating: 4.9, verified: true, className: "bg-primary" }, myStatus: "none" },
      { id: "react-hooks", title: "React Hooks Deep Dive", description: "useEffect, useMemo and custom hooks with a mini-project.", module: "Web Development", level: "L3", startsAt: at(2, 16, 30), durationMin: 120, seats: 15, joined: 6, mode: "online", meetingLink: "https://discord.gg/", visibility: "private", host: { name: "Sara Mebarki", rating: 4.8, verified: true, className: "bg-accent" }, myStatus: "none" },
      { id: "eigenvalues", title: "Eigenvalues Made Simple", description: "Geometric intuition + exam-style exercises.", module: "Linear Algebra", level: "L1", startsAt: at(3, 10), durationMin: 75, seats: 25, joined: 9, mode: "onsite", location: "Amphi C, Faculty of Sciences", visibility: "public", host: { name: "Lina Hamidi", rating: 4.7, verified: true, className: "bg-warn" }, myStatus: "joined" },
      { id: "fourier", title: "Fourier Transform Workshop", description: "MATLAB demos and solved series.", module: "Signal Processing", level: "M1", startsAt: at(4, 13), durationMin: 90, seats: 10, joined: 4, mode: "onsite", location: "FT Lab 3", visibility: "private", host: { name: "Karim Ouali", rating: 4.6, verified: true, className: "bg-ink-2" }, myStatus: "pending" },
      { id: "os-scheduling", title: "Process Scheduling Q&A", description: "Bring your questions on FCFS, SJF, Round-Robin.", module: "Operating Systems", level: "L3", startsAt: at(5, 17), durationMin: 45, seats: 30, joined: 11, mode: "online", meetingLink: "https://meet.google.com/", visibility: "public", host: { name: "Amine Khelifi", rating: 4.9, verified: true, className: "bg-primary" }, myStatus: "none" },
      { id: "graphs", title: "Graph Algorithms Study Group", description: "BFS, DFS and Dijkstra with paper-and-pen practice.", module: "Algorithms", level: "L2", startsAt: at(6, 15), durationMin: 60, seats: 8, joined: 3, mode: "onsite", location: "Library, Room A04", visibility: "public", host: { name: "Nour Saidi", rating: 4.4, verified: true, className: "bg-accent" }, myStatus: "none" },
      { id: "recursion", title: "Recursion for Beginners", description: "Base cases, the call stack and classic recursive exercises.", module: "Algorithms", level: "L1", startsAt: at(0, 18), durationMin: 90, seats: 10, joined: 5, mode: "online", meetingLink: "https://meet.google.com/", visibility: "private", host: { name: "You", rating: 4.8, verified: true, className: "bg-primary" }, myStatus: "host" },
    ]
  : [];

// Sessions the demo user hosts show their own name.
const demoSessions = () => {
  const me = getSession()?.user?.fullName;
  return DEMO_SESSIONS.map((s) => (s.myStatus === "host" && me ? { ...s, host: { ...s.host, name: me } } : s));
};

// "Enter classroom" from the Sessions page opens the matching demo session.
const demoSessionClassroom = (id) => {
  const s = demoSessions().find((d) => d.id === id);
  return s ? { ...s, type: "scheduled", host: { name: s.host.name }, resources: [] } : null;
};
