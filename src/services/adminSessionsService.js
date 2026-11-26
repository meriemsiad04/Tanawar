import { DEMO_MODE } from "../config/demo.js";
import { ApiError, apiRequest, isApiConfigured } from "./apiClient.js";
import { getSession } from "./authService.js";
import { DEMO_SESSION_ADMIN, sessionState } from "./sessionsService.js";

/**
 * Admin: sessions directory, session details, approvals and moderation (/admin/sessions, /admin/sessions/approvals).
 * Full contract, status model, transition rules and what the server must enforce: docs/session-management.md.
 *
 * Expected backend contract (Bearer token, admin role only: 401 without a session, 403 for everyone else):
 *   GET  /admin/sessions?q=&type=&module=&level=&visibility=&status=&host=&from=&to=&reported=&sort=&order=&page=&pageSize=
 *        → { items: [SessionSummary], total, page, pageSize, facets: { modules: [], levels: [] }, reportsAvailable }
 *        SessionSummary = { id, title, description, type: "instant" | "scheduled", visibility: "public" | "private",
 *                           module, level, startsAt, durationMin, seats, participantCount, mode, createdAt,
 *                           status: "pending" | "approved" | "active" | "completed" | "cancelled" | "rejected",
 *                           removed, openReports, host: { id, fullName, matricule, avatarUrl } }
 *   GET  /admin/sessions/:id → SessionSummary + { meetingLink, location, statusReason, reviewedAt, reviewedBy,
 *        host: { …, level, department, accountStatus, sessionsHosted, rating }, participants, resources, joinRequests,
 *        reports, history, notes }   (each list null when the server can't provide it yet)
 *   POST /admin/sessions/:id/approve  {}                → 204   pending scheduled session, start time not passed
 *   POST /admin/sessions/:id/reject   { reason? }       → 204   pending scheduled session
 *   POST /admin/sessions/:id/cancel   { reason }        → 204   approved session that hasn't ended
 *   POST /admin/sessions/:id/remove   { reason }        → 204   any session not removed yet (soft delete)
 *        all four: 409 INVALID_TRANSITION (state changed meanwhile) / SESSION_STARTED (approve too late)
 *   POST /admin/sessions/:id/notes    { text }          → the created note { id, text, by, at }
 *   POST /admin/sessions/:id/reports/:reportId/resolve|dismiss { note? } → 204
 *
 * Any list the server can't provide yet is null: the UI shows "Not available yet", never an empty list.
 */

export const PAGE_SIZE = 20;
export const REASON_MIN = 10;
export const NOTE_MAX = 1000;

/** The six statuses an admin sees. "approved" = published and upcoming; active / completed follow from the time. */
export const SESSION_STATUS = {
  pending: { label: "Pending", icon: "clock", className: "bg-warn-soft text-warn" },
  approved: { label: "Approved", icon: "check", className: "bg-primary-soft text-primary-text" },
  active: { label: "Active", icon: "activity", className: "bg-success-soft text-success-ink" },
  completed: { label: "Completed", icon: "verified", className: "bg-surface-2 text-fg-2" },
  cancelled: { label: "Cancelled", icon: "ban", className: "bg-surface-2 text-fg-2 ring-1 ring-inset ring-line-strong" },
  rejected: { label: "Rejected", icon: "circleX", className: "bg-danger-soft text-live" },
};

export const SESSION_TYPES = { instant: { label: "Instant", icon: "bolt" }, scheduled: { label: "Scheduled", icon: "calendar" } };

/**
 * Admin actions and the states they apply to. The server enforces the same rules (409 otherwise); this only decides
 * which buttons to show. `scheduledOnly`: instant sessions are never reviewed (they are published at once).
 * `reason`: "required" (min REASON_MIN, shown to the host / participants), "optional" or "none".
 */
export const SESSION_ACTIONS = {
  approve: {
    from: ["pending"],
    scheduledOnly: true,
    label: "Approve",
    icon: "check",
    reason: "none",
    done: (t) => `“${t}” is approved and now published to students.`,
  },
  reject: {
    from: ["pending"],
    scheduledOnly: true,
    label: "Reject",
    icon: "circleX",
    tone: "danger",
    reason: "optional",
    title: (t) => `Reject “${t}”?`,
    message: "The session isn't published. The host is told it wasn't approved, with your reason if you give one. Nothing is deleted.",
    placeholder: "Why isn't it approved? The host sees this (optional).",
    confirm: "Reject session",
    done: (t) => `“${t}” was rejected. The host has been told.`,
  },
  cancel: {
    from: ["approved", "active"],
    label: "Cancel",
    icon: "ban",
    tone: "warning",
    reason: "required",
    title: (t) => `Cancel “${t}”?`,
    message: "The session is called off: it can't be joined or entered any more, and the host and every participant are notified with your reason. Its records are kept.",
    placeholder: "Why is it cancelled? The host and participants see this.",
    confirm: "Cancel session",
    done: (t) => `“${t}” was cancelled. The host and participants have been notified.`,
  },
  remove: {
    from: Object.keys(SESSION_STATUS),
    label: "Remove",
    icon: "trash",
    tone: "danger",
    reason: "required",
    title: (t) => `Remove “${t}”?`,
    message: "For inappropriate content. The session disappears for every student (its host is told a moderator removed it) and is cancelled if it hasn't ended. Nothing is deleted: it stays here with its history.",
    placeholder: "What's inappropriate about it? Recorded in the history and shown to the host.",
    confirm: "Remove session",
    acknowledge: "I understand students will no longer see this session.",
    done: (t) => `“${t}” was removed from the platform.`,
  },
};

const startPassed = (s, now = Date.now()) => new Date(s.startsAt).getTime() <= now;

/** Action keys available on a session right now. */
export function actionsFor(s, now = Date.now()) {
  if (!s || s.removed) return [];
  return Object.keys(SESSION_ACTIONS).filter((key) => {
    const a = SESSION_ACTIONS[key];
    if (!a.from.includes(s.status)) return false;
    if (a.scheduledOnly && s.type !== "scheduled") return false;
    if (key === "approve" && startPassed(s, now)) return false;
    return true;
  });
}

/** A pending session whose start time went by without a review can only be rejected. */
export const reviewExpired = (s, now = Date.now()) => s.status === "pending" && startPassed(s, now);

/** History entries. Unknown actions are shown generically. */
export const HISTORY_ACTIONS = {
  submitted: { label: "Submitted for approval", icon: "calendarPlus", tone: "blue" },
  published: { label: "Published (instant session)", icon: "bolt", tone: "blue" },
  approved: { label: "Approved", icon: "check", tone: "green" },
  rejected: { label: "Rejected", icon: "circleX", tone: "red" },
  cancelled: { label: "Cancelled by an admin", icon: "ban", tone: "warn" },
  cancelled_by_host: { label: "Cancelled by the host", icon: "ban", tone: "warn" },
  removed: { label: "Removed", icon: "trash", tone: "red" },
  note_added: { label: "Internal note added", icon: "note", tone: "blue" },
  report_resolved: { label: "Report resolved", icon: "flag", tone: "green" },
  report_dismissed: { label: "Report dismissed", icon: "flag", tone: "blue" },
};

const token = () => getSession()?.token;
const adminName = () => getSession()?.user?.fullName ?? "Admin";
const call = (path, opts) => apiRequest(path, { token: token(), ...opts });
const sid = (id) => encodeURIComponent(id);
/** Dev stand-in (no API configured). Null in production builds unless VITE_DEMO_MODE is set. */
const demoActive = () => DEMO_MODE && !isApiConfigured() && Boolean(DEMO_SESSION_ADMIN);

const numOrNull = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const strings = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string" && x) : []);
const listOrNull = (v) => (Array.isArray(v) ? v : null);
const newestFirst = (list) => (list ? [...list].sort((a, b) => String(b.at).localeCompare(String(a.at))) : null);

/** Stored status + time → displayed status. The server already sends active / completed; older shapes are derived. */
function displayStatus(raw, now) {
  const st = SESSION_STATUS[raw.status] ? raw.status : raw.status === "published" ? "approved" : "pending";
  if (st !== "approved" || !raw.startsAt) return st;
  const t = sessionState(raw, now);
  return t === "live" ? "active" : t === "ended" ? "completed" : "approved";
}

const normalizeHost = (h) => ({
  id: h?.id != null ? String(h.id) : null,
  fullName: h?.fullName || h?.name || "Unknown student",
  matricule: h?.matricule ?? null,
  avatarUrl: h?.avatarUrl ?? null,
});

const normalizeSummary = (s, now = Date.now()) => ({
  id: String(s.id),
  title: s.title || "Untitled session",
  description: s.description ?? "",
  type: s.type === "instant" ? "instant" : "scheduled",
  visibility: s.visibility === "private" ? "private" : "public",
  module: s.module ?? null,
  level: s.level ?? null,
  startsAt: s.startsAt ?? null,
  durationMin: numOrNull(s.durationMin),
  seats: numOrNull(s.seats),
  participantCount: numOrNull(s.participantCount ?? s.joined),
  mode: s.mode === "onsite" ? "onsite" : "online",
  createdAt: s.createdAt ?? null,
  status: displayStatus(s, now),
  removed: Boolean(s.removed),
  openReports: numOrNull(s.openReports),
  host: normalizeHost(s.host),
});

export function normalizeSessionList(raw, page) {
  return {
    items: Array.isArray(raw?.items) ? raw.items.map((s) => normalizeSummary(s)) : [],
    total: numOrNull(raw?.total) ?? 0,
    page: numOrNull(raw?.page) ?? page,
    pageSize: numOrNull(raw?.pageSize) ?? PAGE_SIZE,
    facets: { modules: strings(raw?.facets?.modules), levels: strings(raw?.facets?.levels) },
    reportsAvailable: raw?.reportsAvailable !== false,
  };
}

function normalizeDetail(raw) {
  const base = normalizeSummary(raw);
  const h = raw.host ?? {};
  return {
    ...base,
    meetingLink: raw.meetingLink ?? null,
    location: raw.location ?? null,
    statusReason: raw.statusReason ?? null,
    reviewedAt: raw.reviewedAt ?? null,
    reviewedBy: raw.reviewedBy ?? null,
    host: {
      ...base.host,
      level: h.level ?? null,
      department: h.department ?? null,
      accountStatus: h.accountStatus ?? null,
      sessionsHosted: numOrNull(h.sessionsHosted),
      rating: numOrNull(h.rating),
    },
    participants: listOrNull(raw.participants),
    resources: listOrNull(raw.resources),
    joinRequests: listOrNull(raw.joinRequests),
    reports: newestFirst(listOrNull(raw.reports)),
    history: newestFirst(listOrNull(raw.history)),
    notes: newestFirst(listOrNull(raw.notes)),
  };
}

/* ───────────── endpoints ───────────── */

/** `filters`: { q, type, module, level, visibility, status, host, from, to, reported, sort, order, page } — empty values are left out. */
export async function listAdminSessions(filters = {}) {
  const query = { pageSize: PAGE_SIZE, page: 1, ...filters, q: filters.q?.trim() ?? "", host: filters.host?.trim() ?? "" };
  const raw = demoActive()
    ? demoList(query)
    : await call(`/admin/sessions?${new URLSearchParams(Object.entries(query).filter(([, v]) => v !== "" && v != null && v !== false))}`);
  return normalizeSessionList(raw, query.page);
}

export async function getAdminSession(id) {
  if (demoActive()) return normalizeDetail(demoDetail(id));
  return normalizeDetail(await call(`/admin/sessions/${sid(id)}`));
}

/**
 * Runs approve / reject / cancel / remove on `session` (the version on screen).
 * Checks the reason and the transition first, so an impossible action never reaches the server.
 */
export async function moderateSession(session, action, reason = "") {
  const def = SESSION_ACTIONS[action];
  if (!def) throw new ApiError("Unknown action.", { code: "BAD_ACTION" });
  const text = reason.trim();
  if (def.reason === "required" && text.length < REASON_MIN) {
    throw new ApiError(`Give a reason of at least ${REASON_MIN} characters: it's recorded and shown to the host.`, { code: "REASON_REQUIRED" });
  }
  if (demoActive()) return demoAct(session.id, action, text);
  await call(`/admin/sessions/${sid(session.id)}/${action}`, { method: "POST", body: def.reason !== "none" && text ? { reason: text } : {} });
}

export async function addSessionNote(id, text) {
  const t = text.trim();
  if (!t) throw new ApiError("Write a note first.", { code: "NOTE_EMPTY" });
  if (t.length > NOTE_MAX) throw new ApiError(`Notes are limited to ${NOTE_MAX} characters.`, { code: "NOTE_TOO_LONG" });
  if (demoActive()) return DEMO_SESSION_ADMIN.addNote(id, t, adminName());
  return call(`/admin/sessions/${sid(id)}/notes`, { method: "POST", body: { text: t } });
}

/** decision: "resolve" | "dismiss". */
export async function answerSessionReport(sessionId, reportId, decision, note = "") {
  if (!["resolve", "dismiss"].includes(decision)) throw new ApiError("Unknown decision.", { code: "BAD_ACTION" });
  await call(`/admin/sessions/${sid(sessionId)}/reports/${sid(reportId)}/${decision}`, { method: "POST", body: note.trim() ? { note: note.trim() } : {} });
}

/** Server error → sentence for the admin. */
export function moderationErrorText(err) {
  if (err?.code === "INVALID_TRANSITION") return "This session changed in the meantime (another admin may have acted). It has been reloaded.";
  if (err?.code === "SESSION_STARTED") return "Its start time has passed, so it can't be approved any more. Reject it instead.";
  return null;
}

/* ───────────── dev stand-in ───────────── */

function demoRows() {
  const now = Date.now();
  return DEMO_SESSION_ADMIN.list().map((s) => ({
    ...s,
    // Demo hosts aren't real accounts in demoRegistry: no profile to link to.
    host: { id: null, fullName: s.host?.name, matricule: s.host?.matricule ?? null, rating: s.host?.rating ?? null },
    openReports: null,
    status: displayStatus(s, now),
  }));
}

function demoList(q) {
  const text = q.q.toLowerCase();
  const host = q.host.toLowerCase();
  const fromT = q.from ? new Date(`${q.from}T00:00`).getTime() : null;
  const toT = q.to ? new Date(`${q.to}T23:59:59.999`).getTime() : null;
  const all = demoRows();
  const rows = all.filter(
    (s) =>
      (!text || [s.title, s.description, s.module].some((v) => v?.toLowerCase().includes(text))) &&
      (!host || [s.host.fullName, s.host.matricule].some((v) => v?.toLowerCase().includes(host))) &&
      (!q.type || s.type === q.type) &&
      (!q.module || s.module === q.module) &&
      (!q.level || s.level === q.level) &&
      (!q.visibility || s.visibility === q.visibility) &&
      (!q.status || s.status === q.status) &&
      (fromT == null || new Date(s.startsAt).getTime() >= fromT) &&
      (toT == null || new Date(s.startsAt).getTime() <= toT) &&
      !q.reported // no reports in the demo
  );
  const dir = q.order === "asc" ? 1 : -1;
  const key = {
    title: (s) => s.title.toLowerCase(),
    participants: (s) => s.participantCount ?? -1,
    createdAt: (s) => s.createdAt ?? "",
    startsAt: (s) => s.startsAt ?? "",
  }[q.sort] ?? ((s) => s.startsAt ?? "");
  rows.sort((a, b) => {
    const x = key(a);
    const y = key(b);
    return (x < y ? -1 : x > y ? 1 : 0) * dir || a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
  });
  const start = (q.page - 1) * q.pageSize;
  const uniq = (f) => [...new Set(all.map(f).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  return {
    items: rows.slice(start, start + q.pageSize),
    total: rows.length,
    page: q.page,
    pageSize: q.pageSize,
    facets: { modules: uniq((s) => s.module), levels: uniq((s) => s.level) },
    reportsAvailable: false,
  };
}

function demoDetail(id) {
  const s = demoRows().find((r) => r.id === id);
  if (!s) throw new ApiError("Session not found.", { status: 404, code: "NOT_FOUND" });
  const created = s.createdAt ? [{ id: `created-${s.id}`, action: s.type === "instant" ? "published" : "submitted", by: s.host.fullName, at: s.createdAt }] : [];
  return {
    ...s,
    participants: null,
    resources: null,
    joinRequests:
      s.visibility === "private"
        ? DEMO_SESSION_ADMIN.joinRequests(id).map((r) => ({ id: r.id, status: "pending", at: null, student: { fullName: r.student.fullName, level: r.student.level, major: r.student.major } }))
        : [],
    reports: null,
    history: [...created, ...DEMO_SESSION_ADMIN.history(id)],
    notes: DEMO_SESSION_ADMIN.notes(id),
  };
}

/** Same checks as the server: the action must still apply to the stored session. */
function demoAct(id, action, reason) {
  const current = demoRows().find((r) => r.id === id);
  if (!current) throw new ApiError("Session not found.", { status: 404, code: "NOT_FOUND" });
  if (action === "approve" && reviewExpired(current)) throw new ApiError("Start time passed.", { status: 409, code: "SESSION_STARTED" });
  if (!actionsFor(current).includes(action)) throw new ApiError("Invalid transition.", { status: 409, code: "INVALID_TRANSITION" });
  const ended = current.status === "completed";
  const patch = {
    approve: { status: "approved", statusReason: null },
    reject: { status: "rejected", statusReason: reason || null },
    cancel: { status: "cancelled", statusReason: reason },
    remove: {
      removed: true,
      statusReason: reason,
      // Never published → rejected; published and not over → cancelled; already over / closed → unchanged.
      ...(current.status === "pending" ? { status: "rejected" } : !ended && ["approved", "active"].includes(current.status) ? { status: "cancelled" } : {}),
    },
  }[action];
  DEMO_SESSION_ADMIN.act(id, { approve: "approved", reject: "rejected", cancel: "cancelled", remove: "removed" }[action], patch, { reason, by: adminName() });
}

/** Dev only: queue numbers for the sidebar badge and the overview (null without the stand-in). */
export function demoSessionCounts() {
  if (!demoActive()) return null;
  const rows = demoRows().filter((s) => !s.removed);
  const pending = rows.filter((s) => s.status === "pending").sort((a, b) => String(a.createdAt ?? a.startsAt).localeCompare(String(b.createdAt ?? b.startsAt)));
  return {
    pendingSessionApprovals: pending.length,
    activeSessions: rows.filter((s) => s.status === "active" || s.status === "approved").length,
    pending,
  };
}
