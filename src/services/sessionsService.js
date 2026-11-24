import { apiRequest } from "./apiClient.js";
import { getSession } from "./authService.js";

/**
 * Session classroom + join/leave.
 *
 * Expected backend contract (Bearer token; adjust here when the API is built):
 *   GET  /sessions/:id        → { id, type: "instant" | "scheduled", title, module, startsAt (ISO), durationMin, seats, joined (participants so far),
 *                                 mode: "online" | "onsite", meetingLink, location, host: { name },
 *                                 resources: [{ id, kind: "file" | "link", name, url }] }
 *                               (only returned to students who joined the session)
 *   POST /sessions/:id/resources (multipart, field "file") → { id, kind: "file", name, url }
 *                               (any student who joined the session may attach; 403 otherwise)
 *   POST /sessions/:id/join   → 204
 *   POST /sessions/:id/leave  → 204
 */
const token = () => getSession()?.token;
const isDemo = () => Boolean(import.meta.env.DEV) && token() === "demo-token";
const call = (path, opts) => apiRequest(path, { token: token(), ...opts });
const sid = (id) => encodeURIComponent(id);

export const classroomPath = (id) => `/app/classroom/${sid(id)}`;

export async function getClassroom(id) {
  if (isDemo()) {
    const demo = DEMO_CLASSROOMS[id];
    if (!demo) throw new Error("Session not found.");
    return demo();
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
