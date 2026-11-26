import { DEMO_MODE } from "./demoMode.js";
import { ApiError, apiRequest, isApiConfigured } from "./apiClient.js";
import { getSession } from "./authService.js";
import { DEMO_STUDY_ROOMS } from "./demoStudyRooms.js";

/**
 * Study With Me: public study rooms where students study side by side, each with their own timer.
 * Full contract, database schema and timing rules: docs/study-with-me.md. Summary:
 *
 *   GET  /study-rooms                → { serverTime, myActiveRoomId, rooms: [RoomSummary] }
 *   POST /study-rooms {title, module, description?} → { serverTime, room: RoomSummary }   (429 ROOM_LIMIT, 422 VALIDATION_ERROR)
 *   GET  /study-rooms/:id            → RoomDetail                                          (404 ROOM_NOT_FOUND)
 *   POST /study-rooms/:id/join       → RoomDetail  idempotent; ends an open sitting in another room
 *   POST /study-rooms/:id/leave      → RoomDetail  idempotent
 *   POST /study-rooms/:id/heartbeat  → { serverTime, inRoom: true }                        (409 NOT_IN_ROOM)
 *   GET  /study-rooms/me/stats       → MyStudyStats
 * Every endpoint requires an approved student (403 VERIFICATION_PENDING | VERIFICATION_REJECTED otherwise).
 *
 * Timing: the server is the only clock. Every duration it returns (`seconds`, `totalSeconds`, …) is exact as of
 * `serverTime`. The client adds the time elapsed since it RECEIVED the response (measured with performance.now(),
 * so a wrong or changing device clock can't skew it) for whatever is still running. See `liveSeconds`.
 *
 * Real-time: no push channel exists yet, so pages poll (POLL_MS) and refetch at once when this tab changes something,
 * when the tab becomes visible and when the network comes back. Timers tick locally between fetches.
 * A push channel (SSE / WebSocket) only has to call `notifyStudyRoomsChanged()`; pages don't change.
 */

export const STUDY_LIMITS = { title: { min: 3, max: 60 }, description: 140 };
/** How often the room page tells the server the student is still there. The server ends a sitting 90 s after its last heartbeat. */
export const HEARTBEAT_MS = 20_000;
export const POLL_MS = { list: 10_000, room: 5_000, stats: 30_000 };

export const STUDY_PATH = "/app/study";
export const studyRoomPath = (id) => `${STUDY_PATH}/${encodeURIComponent(id)}`;

const token = () => getSession()?.token;
const demo = () => (DEMO_MODE && DEMO_STUDY_ROOMS?.active() && !isApiConfigured() ? DEMO_STUDY_ROOMS : null);
const call = (path, opts) => apiRequest(path, { token: token(), ...opts });
const rid = (id) => encodeURIComponent(id);

/* ───────────── change notifications ───────────── */

const CHANGED = "tanawar:study-rooms-changed";

/** Tells every Study With Me view in this tab to refetch now (after a mutation, or from a push channel). */
export function notifyStudyRoomsChanged() {
  window.dispatchEvent(new Event(CHANGED));
}

/** Subscribes to "something changed": this tab's mutations, plus other tabs in demo mode. Returns an unsubscribe function. */
export function onStudyRoomsChanged(cb) {
  window.addEventListener(CHANGED, cb);
  const offRemote = demo()?.onRemoteChange(cb);
  return () => {
    window.removeEventListener(CHANGED, cb);
    offRemote?.();
  };
}

/* ───────────── server time ───────────── */

/** Marks a response with the moment it arrived, the reference point for every running timer in it. */
function stamp(data) {
  if (!data || typeof data !== "object" || !data.serverTime) {
    throw new ApiError("Unexpected response from the server.", { code: "BAD_RESPONSE" });
  }
  return { ...data, receivedAt: performance.now() };
}

/**
 * A duration that may still be running: `seconds` was exact when `snapshot` arrived; while `running`, add the
 * time elapsed since. `now` is a performance.now() value (see hooks/useNow.js).
 */
export const liveSeconds = (seconds, running, snapshot, now) =>
  Math.floor((seconds ?? 0) + (running && snapshot ? Math.max(0, (now - snapshot.receivedAt) / 1000) : 0));

/** Total studied in a room right now: every active student adds a second per second. */
export const liveRoomSeconds = (room, snapshot, now) =>
  Math.floor((room.totalSeconds ?? 0) + (room.activeCount ?? 0) * (snapshot ? Math.max(0, (now - snapshot.receivedAt) / 1000) : 0));

/* ───────────── endpoints ───────────── */

const ERRORS = {
  ROOM_NOT_FOUND: "This study room doesn’t exist anymore.",
  ROOM_LIMIT: "You’ve opened the maximum number of rooms for today. Join an existing one instead.",
  NOT_IN_ROOM: "You’re no longer in this room.",
};

async function request(demoCall, apiCall) {
  try {
    const d = demo();
    return stamp(d ? await demoCall(d) : await apiCall());
  } catch (err) {
    if (err instanceof ApiError && ERRORS[err.code] && err.code !== "ROOM_LIMIT") {
      throw new ApiError(ERRORS[err.code], { status: err.status, code: err.code, details: err.details });
    }
    throw err;
  }
}

export const listStudyRooms = () => request((d) => d.list(), () => call("/study-rooms"));

export const getStudyRoom = (id) => request((d) => d.get(id), () => call(`/study-rooms/${rid(id)}`));

export const getMyStudyStats = () => request((d) => d.stats(), () => call("/study-rooms/me/stats"));

export async function createStudyRoom({ title, module, description = "" }) {
  const body = { title: title.trim(), module, description: description.trim() };
  const res = await request((d) => d.create(body), () => call("/study-rooms", { method: "POST", body }));
  notifyStudyRoomsChanged();
  return res;
}

/** Starts (or continues, if already here) the student's sitting in this room. Ends a sitting in any other room. */
export async function joinStudyRoom(id) {
  const res = await request((d) => d.join(id), () => call(`/study-rooms/${rid(id)}/join`, { method: "POST" }));
  notifyStudyRoomsChanged();
  return res;
}

export async function leaveStudyRoom(id) {
  const res = await request((d) => d.leave(id), () => call(`/study-rooms/${rid(id)}/leave`, { method: "POST" }));
  notifyStudyRoomsChanged();
  return res;
}

export const sendStudyHeartbeat = (id) =>
  request((d) => d.heartbeat(id), () => call(`/study-rooms/${rid(id)}/heartbeat`, { method: "POST" }));

/** Client-side validation (the server validates again). Returns { field: message }. */
export function validateStudyRoom({ title, module, description = "" }) {
  const errors = {};
  const t = title.trim();
  if (t.length < STUDY_LIMITS.title.min) errors.title = `Give the room a name (at least ${STUDY_LIMITS.title.min} characters).`;
  else if (t.length > STUDY_LIMITS.title.max) errors.title = `Keep it under ${STUDY_LIMITS.title.max} characters.`;
  if (!module) errors.module = "Choose what this room is for.";
  if (description.trim().length > STUDY_LIMITS.description) errors.description = `Keep it under ${STUDY_LIMITS.description} characters.`;
  return errors;
}

/* ───────────── formatting & milestones ───────────── */

const pad = (n) => String(n).padStart(2, "0");

/** 3725 → "01:02:05" (timers). */
export const fmtClock = (sec) => {
  const s = Math.max(0, Math.floor(sec));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
};

/** 3725 → "1h 02m", 300 → "5m", 20 → "<1m" (totals). */
export const fmtDuration = (sec) => {
  const s = Math.max(0, Math.floor(sec));
  if (s < 60) return s === 0 ? "0m" : "<1m";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}h ${pad(m)}m` : `${m}m`;
};

/** Milestones are rules; progress comes from the student's real study time (MyStudyStats). */
const MILESTONES = [
  { id: "first", icon: "lamp", title: "First seat", text: "Study in a room for the first time", metric: "sittings", target: 1, unit: "count" },
  { id: "focus-1h", icon: "timer", title: "Deep focus", text: "Study 1 hour in a single sitting", metric: "longestSittingSeconds", target: 3600, unit: "time" },
  { id: "focus-3h", icon: "target", title: "Marathon", text: "Study 3 hours in a single sitting", metric: "longestSittingSeconds", target: 3 * 3600, unit: "time" },
  { id: "day-4h", icon: "flame", title: "Big day", text: "Study 4 hours in one day", metric: "todaySeconds", target: 4 * 3600, unit: "time" },
  { id: "total-10h", icon: "clock", title: "10 hours", text: "Reach 10 hours of study in total", metric: "totalSeconds", target: 10 * 3600, unit: "time" },
  { id: "total-50h", icon: "medal", title: "50 hours", text: "Reach 50 hours of study in total", metric: "totalSeconds", target: 50 * 3600, unit: "time" },
  { id: "total-100h", icon: "trophy", title: "Centurion", text: "Reach 100 hours of study in total", metric: "totalSeconds", target: 100 * 3600, unit: "time" },
  { id: "streak-3", icon: "flame", title: "On a roll", text: "Study 3 days in a row", metric: "streakDays", target: 3, unit: "count" },
  { id: "streak-7", icon: "crown", title: "Week warrior", text: "Study 7 days in a row", metric: "streakDays", target: 7, unit: "count" },
];

/** `values` = stats with live seconds already added. "Big day" counts only today: it unlocks for good once reached (server keeps the best day). */
export function studyMilestones(values) {
  return MILESTONES.map((m) => {
    const value = m.id === "day-4h" ? Math.max(values.todaySeconds ?? 0, values.bestDaySeconds ?? 0) : values[m.metric] ?? 0;
    return { ...m, current: Math.min(value, m.target), unlocked: value >= m.target };
  });
}

/** Stats with the running sitting added (stats are exact as of serverTime). */
export function liveStats(stats, now) {
  if (!stats) return null;
  const extra = stats.active ? liveSeconds(0, true, stats, now) : 0;
  const last7 = stats.last7?.map((d, i, all) => (i === all.length - 1 ? { ...d, seconds: d.seconds + extra } : d)) ?? [];
  return {
    ...stats,
    todaySeconds: stats.todaySeconds + extra,
    weekSeconds: stats.weekSeconds + extra,
    totalSeconds: stats.totalSeconds + extra,
    bestDaySeconds: Math.max(stats.bestDaySeconds ?? 0, stats.todaySeconds + extra),
    longestSittingSeconds: Math.max(stats.longestSittingSeconds, (stats.active?.sittingSeconds ?? 0) + extra),
    last7,
  };
}
