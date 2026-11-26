import { DEMO_MODE } from "../config/demo.js";
import { ApiError, apiRequest, isApiConfigured } from "./apiClient.js";
import { getSession } from "./authService.js";
import { DEMO_ADMIN_STUDY } from "./demoAdminStudyRooms.js";

/**
 * Admin: Study With Me management (/admin/study). Full contract and what the server must enforce:
 * docs/study-with-me-admin.md. Summary (Bearer token, admin role only: 401 without a session, 403 for everyone else):
 *
 *   GET  /admin/study-rooms/overview                       → StudyOverview
 *   GET  /admin/study-rooms?q=&status=&visibility=&module=&host=&from=&to=&reported=&sort=&order=&page=&pageSize=
 *        → { serverTime, items: [AdminRoomSummary], total, page, pageSize, facets: { modules }, visibilityAvailable }
 *   GET  /admin/study-rooms/analytics?days=7|30|90         → StudyAnalytics
 *   GET  /admin/study-rooms/reports?status=open|resolved|dismissed → { serverTime, items: [Report + room], total }
 *   GET  /admin/study-rooms/:id                            → AdminRoomDetail
 *   POST /admin/study-rooms/:id/close    { reason }        → 204   ends every open sitting (end_reason room_closed)
 *   POST /admin/study-rooms/:id/reopen   { reason? }       → 204   closed → ended (joinable again)
 *        both: 409 INVALID_TRANSITION when the room's state changed meanwhile
 *   POST /admin/study-rooms/:id/participants/:studentId/remove { reason } → 204 (409 NOT_IN_ROOM)
 *   POST /admin/study-rooms/:id/participants/:studentId/warn   { reason } → 204 (student notified)
 *   POST /admin/study-rooms/:id/notes    { text }          → { id, text, by, at }
 *   POST /admin/study-rooms/:id/reports/:reportId/resolve|dismiss { note? } → 204
 *
 * Durations are whole seconds exact as of `serverTime` (same rule as the student API: the server is the only clock).
 * A list the server can't provide yet is null: the UI says "Not available yet", never shows an empty list or a 0.
 */

export const PAGE_SIZE = 12;
export const REASON_MIN = 10;
export const NOTE_MAX = 1000;
export const ANALYTICS_RANGES = [7, 30, 90];

/** Room status as an admin sees it. Active = someone studying now; Ended = nobody (still joinable); Closed = by an admin. */
export const ROOM_STATUS = {
  active: { label: "Active", icon: "activity", className: "bg-success-soft text-success-ink" },
  ended: { label: "Ended", icon: "clock", className: "bg-surface-2 text-fg-2" },
  closed: { label: "Closed", icon: "doorClosed", className: "bg-danger-soft text-live" },
};

export const REPORT_STATUS = {
  open: { label: "Open", className: "bg-warn-soft text-warn" },
  resolved: { label: "Resolved", className: "bg-success-soft text-success-ink" },
  dismissed: { label: "Dismissed", className: "bg-surface-2 text-fg-2" },
};

/**
 * Confirmed actions. `reason`: "required" (min REASON_MIN) | "optional". The server enforces the same rules (409 otherwise).
 * Room actions take the room; participant actions also take `participant`.
 */
export const ROOM_ACTIONS = {
  close: {
    label: "Close room",
    icon: "doorClosed",
    tone: "danger",
    reason: "required",
    title: (r) => `Close “${r.title}”?`,
    message: (r) =>
      `The room disappears from the students' list and nobody can join it.${r.activeCount ? ` The ${r.activeCount} student${r.activeCount === 1 ? "" : "s"} studying in it now will be stopped and their time saved.` : ""} The host is told why. Nothing is deleted and you can reopen it.`,
    placeholder: "Why is it closed? The host sees this.",
    confirm: "Close room",
    acknowledge: (r) => (r.activeCount ? "I understand the students studying now will be taken out of the room." : null),
    done: (r) => `“${r.title}” is closed.`,
  },
  reopen: {
    label: "Reopen room",
    icon: "reopen",
    tone: "primary",
    reason: "optional",
    title: (r) => `Reopen “${r.title}”?`,
    message: () => "The room is listed again and students can join it. The host is told it was reopened.",
    placeholder: "Note for the history (optional)",
    confirm: "Reopen room",
    done: (r) => `“${r.title}” is open again.`,
  },
  removeParticipant: {
    label: "Remove from room",
    icon: "userMinus",
    tone: "danger",
    reason: "required",
    title: (r, p) => `Remove ${p.fullName} from the room?`,
    message: () => "Their current sitting ends now (the time already studied is kept). They can join again unless their account is suspended from Students.",
    placeholder: "Why are they removed? They see this.",
    confirm: "Remove student",
    done: (r, p) => `${p.fullName} was removed from “${r.title}”.`,
  },
  warn: {
    label: "Warn student",
    icon: "shieldAlert",
    tone: "warning",
    reason: "required",
    title: (r, p) => `Send a warning to ${p.fullName}?`,
    message: () => "The student gets a notification with your message. The warning is recorded in this room's activity.",
    placeholder: "What should they change? They see this.",
    confirm: "Send warning",
    done: (r, p) => `${p.fullName} has been warned.`,
  },
};

/** Activity entries. Unknown types are shown generically. */
export const ACTIVITY_TYPES = {
  created: { label: "Room created", icon: "plusCircle", tone: "blue" },
  joined: { label: "Joined", icon: "enter", tone: "green" },
  left: { label: "Left", icon: "door", tone: "neutral" },
  timeout: { label: "Disconnected (no heartbeat)", icon: "wifi", tone: "neutral" },
  reported: { label: "Room reported", icon: "flag", tone: "warn" },
  closed: { label: "Closed by an admin", icon: "doorClosed", tone: "red" },
  reopened: { label: "Reopened by an admin", icon: "reopen", tone: "blue" },
  participant_removed: { label: "Student removed", icon: "userMinus", tone: "red" },
  user_warned: { label: "Student warned", icon: "shieldAlert", tone: "warn" },
  note_added: { label: "Internal note added", icon: "note", tone: "blue" },
  report_resolved: { label: "Report resolved", icon: "check", tone: "green" },
  report_dismissed: { label: "Report dismissed", icon: "flag", tone: "neutral" },
};

const token = () => getSession()?.token;
const adminName = () => getSession()?.user?.fullName ?? "Admin";
const call = (path, opts) => apiRequest(path, { token: token(), ...opts });
const rid = (id) => encodeURIComponent(id);
/** Mock data (no API configured). Null in production builds unless VITE_DEMO_MODE is set. */
const demo = () => (DEMO_MODE && !isApiConfigured() ? DEMO_ADMIN_STUDY : null);
/** The mock answers instantly; a short wait keeps loading states honest while designing. */
const later = (fn) => new Promise((resolve, reject) => setTimeout(() => {
  try {
    resolve(fn());
  } catch (err) {
    reject(err);
  }
}, 220));

const numOrNull = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const listOrNull = (v) => (Array.isArray(v) ? v : null);
const stamp = (data) => ({ ...data, receivedAt: performance.now() });

const normalizePerson = (p) => ({
  id: p?.id != null ? String(p.id) : null,
  fullName: p?.fullName || "Unknown student",
  matricule: p?.matricule ?? null,
  avatarUrl: p?.avatarUrl ?? null,
  profileLinkable: p?.id != null && p?.profileLinkable !== false,
});

const normalizeSummary = (r) => ({
  id: String(r.id),
  title: r.title || "Untitled room",
  module: r.module ?? null,
  description: r.description ?? "",
  visibility: r.visibility === "private" ? "private" : "public",
  status: ROOM_STATUS[r.status] ? r.status : "ended",
  createdAt: r.createdAt ?? null,
  lastActivityAt: r.lastActivityAt ?? null,
  host: normalizePerson(r.host),
  activeCount: numOrNull(r.activeCount) ?? 0,
  participantCount: numOrNull(r.participantCount),
  totalSeconds: numOrNull(r.totalSeconds),
  openReports: numOrNull(r.openReports),
});

const normalizeReport = (rep) => ({
  id: String(rep.id),
  reason: rep.reason || "Reported",
  details: rep.details ?? "",
  reporter: rep.reporter ? normalizePerson(rep.reporter) : null,
  reportedUser: rep.reportedUser ? normalizePerson(rep.reportedUser) : null,
  at: rep.at ?? null,
  status: REPORT_STATUS[rep.status] ? rep.status : "open",
  resolvedBy: rep.resolvedBy ?? null,
  resolvedAt: rep.resolvedAt ?? null,
  resolution: rep.resolution ?? null,
  room: rep.room ? normalizeSummary(rep.room) : null,
});

/* ───────────── endpoints ───────────── */

export async function getStudyOverview() {
  const d = demo();
  const raw = d ? await later(() => d.overview()) : await call("/admin/study-rooms/overview");
  return stamp({
    serverTime: raw.serverTime,
    totalRooms: numOrNull(raw.totalRooms),
    activeRooms: numOrNull(raw.activeRooms),
    studyingNow: numOrNull(raw.studyingNow),
    totalSeconds: numOrNull(raw.totalSeconds),
    reportedRooms: numOrNull(raw.reportedRooms),
    openReports: numOrNull(raw.openReports),
  });
}

/** `filters`: { q, status, visibility, module, host, from, to, reported, sort, order, page }. Empty values are left out. */
export async function listStudyRoomsAdmin(filters = {}) {
  const query = { pageSize: PAGE_SIZE, page: 1, ...filters, q: filters.q?.trim() ?? "", host: filters.host?.trim() ?? "" };
  const d = demo();
  const raw = d
    ? await later(() => d.list(query))
    : await call(`/admin/study-rooms?${new URLSearchParams(Object.entries(query).filter(([, v]) => v !== "" && v != null && v !== false))}`);
  return {
    items: Array.isArray(raw?.items) ? raw.items.map(normalizeSummary) : [],
    total: numOrNull(raw?.total) ?? 0,
    page: numOrNull(raw?.page) ?? query.page,
    pageSize: numOrNull(raw?.pageSize) ?? PAGE_SIZE,
    facets: { modules: Array.isArray(raw?.facets?.modules) ? raw.facets.modules.filter(Boolean) : [] },
    visibilityAvailable: raw?.visibilityAvailable !== false,
  };
}

export async function getStudyRoomAdmin(id) {
  const d = demo();
  const raw = d ? await later(() => d.detail(id)) : await call(`/admin/study-rooms/${rid(id)}`);
  const base = normalizeSummary(raw);
  const h = raw.host ?? {};
  return stamp({
    ...base,
    serverTime: raw.serverTime,
    closedAt: raw.closedAt ?? null,
    closedReason: raw.closedReason ?? null,
    closedBy: raw.closedBy ?? null,
    host: {
      ...base.host,
      level: h.level ?? null,
      department: h.department ?? null,
      accountStatus: h.accountStatus ?? null,
      roomsCreated: numOrNull(h.roomsCreated),
      totalSeconds: numOrNull(h.totalSeconds),
    },
    participants: listOrNull(raw.participants)?.map((p) => ({
      ...normalizePerson(p),
      level: p.level ?? null,
      active: Boolean(p.active),
      seconds: numOrNull(p.seconds) ?? 0,
      sittingSeconds: numOrNull(p.sittingSeconds) ?? 0,
      sittings: numOrNull(p.sittings),
      joinedAt: p.joinedAt ?? null,
      lastSeenAt: p.lastSeenAt ?? null,
      warned: Boolean(p.warned),
    })) ?? null,
    activity: listOrNull(raw.activity),
    activityTruncated: Boolean(raw.activityTruncated),
    reports: listOrNull(raw.reports)?.map(normalizeReport) ?? null,
    notes: listOrNull(raw.notes),
  });
}

export async function getStudyAnalytics(days = 30) {
  const d = demo();
  const raw = d ? await later(() => d.analytics(days)) : await call(`/admin/study-rooms/analytics?days=${days}`);
  return {
    days: numOrNull(raw.days) ?? days,
    hours: listOrNull(raw.hours),
    dailyActive: listOrNull(raw.dailyActive),
    weeklyActive: listOrNull(raw.weeklyActive),
    periods: Array.isArray(raw.periods) && raw.periods.length === 7 ? raw.periods : null,
    averageSittingSeconds: numOrNull(raw.averageSittingSeconds),
    averageByDay: listOrNull(raw.averageByDay),
    sittings: numOrNull(raw.sittings),
    topRooms: listOrNull(raw.topRooms),
  };
}

export async function listStudyReports(status = "open") {
  const d = demo();
  const raw = d ? await later(() => d.reportQueue(status)) : await call(`/admin/study-rooms/reports?status=${encodeURIComponent(status)}`);
  return { items: Array.isArray(raw?.items) ? raw.items.map(normalizeReport) : [], total: numOrNull(raw?.total) ?? 0 };
}

const checkReason = (def, reason) => {
  const text = reason.trim();
  if (def.reason === "required" && text.length < REASON_MIN) {
    throw new ApiError(`Give a reason of at least ${REASON_MIN} characters: it's recorded and shown to the student.`, { code: "REASON_REQUIRED" });
  }
  return text;
};

/** close | reopen on `room`, or removeParticipant | warn on `participant` of `room`. */
export async function moderateStudyRoom(room, action, reason = "", participant = null) {
  const def = ROOM_ACTIONS[action];
  if (!def) throw new ApiError("Unknown action.", { code: "BAD_ACTION" });
  const text = checkReason(def, reason);
  const body = text ? { reason: text } : {};
  const d = demo();
  if (action === "close" || action === "reopen") {
    if (d) return later(() => d.act(room.id, action, { reason: text, by: adminName() }));
    return call(`/admin/study-rooms/${rid(room.id)}/${action}`, { method: "POST", body });
  }
  if (!participant?.id) throw new ApiError("Unknown student.", { code: "BAD_ACTION" });
  const verb = action === "warn" ? "warn" : "remove";
  if (d) return later(() => d.participantAct(room.id, participant.id, verb, { reason: text, by: adminName() }));
  return call(`/admin/study-rooms/${rid(room.id)}/participants/${rid(participant.id)}/${verb}`, { method: "POST", body });
}

export async function addStudyRoomNote(id, text) {
  const t = text.trim();
  if (!t) throw new ApiError("Write a note first.", { code: "NOTE_EMPTY" });
  if (t.length > NOTE_MAX) throw new ApiError(`Notes are limited to ${NOTE_MAX} characters.`, { code: "NOTE_TOO_LONG" });
  const d = demo();
  if (d) return later(() => d.addNote(id, t, adminName()));
  return call(`/admin/study-rooms/${rid(id)}/notes`, { method: "POST", body: { text: t } });
}

/** decision: "resolve" | "dismiss". */
export async function answerStudyReport(roomId, reportId, decision, note = "") {
  if (!["resolve", "dismiss"].includes(decision)) throw new ApiError("Unknown decision.", { code: "BAD_ACTION" });
  const d = demo();
  if (d) return later(() => d.answerReport(roomId, reportId, decision, { note: note.trim(), by: adminName() }));
  return call(`/admin/study-rooms/${rid(roomId)}/reports/${rid(reportId)}/${decision}`, { method: "POST", body: note.trim() ? { note: note.trim() } : {} });
}

/** Server error → sentence for the admin (null when the generic message is fine). */
export function studyModerationErrorText(err) {
  if (err?.code === "INVALID_TRANSITION") return "This room changed in the meantime (another admin may have acted). It has been reloaded.";
  if (err?.code === "NOT_IN_ROOM") return "This student has already left the room.";
  return null;
}

/** Demo only: wipes the admin decisions made on the mock data. */
export const resetStudyDemo = () => demo()?.reset();
export const isStudyDemo = () => Boolean(demo());

/* ───────────── formatting ───────────── */

const nf = new Intl.NumberFormat();
export const fmtNum = (v) => (v == null ? "—" : nf.format(v));
/** 3725 → "1h 02m", 300 → "5m" (same style as the student pages). */
export function fmtStudy(sec) {
  if (sec == null) return "—";
  const s = Math.max(0, Math.floor(sec));
  if (s < 60) return s === 0 ? "0m" : "<1m";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${nf.format(h)}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}
/** Seconds → "1,234 h" for big totals. */
export const fmtHoursTotal = (sec) => (sec == null ? "—" : `${nf.format(Math.round(sec / 3600))} h`);
