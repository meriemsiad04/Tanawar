import { DEMO_MODE } from "../config/demo.js";
import { ApiError, apiRequest, isApiConfigured } from "./apiClient.js";
import { getSession } from "./authService.js";
import { DEMO_REGISTRY } from "./demoRegistry.js";
import { DEMO_STUDY_ROOMS } from "./demoStudyRooms.js";

/**
 * Admin: student directory, student profiles and account actions (/admin/users).
 * Full contract, transition rules and what the server must enforce: docs/student-management.md.
 *
 * Expected backend contract (Bearer token, admin role only: 401 without a session, 403 for everyone else):
 *   GET  /admin/students?q=&faculty=&department=&level=&verification=&status=&sort=name|registeredAt&order=asc|desc&page=&pageSize=
 *        → { items: [StudentSummary], total, page, pageSize, facets: { faculties: [], departments: [], levels: [] } }
 *        StudentSummary = { id, fullName, email, matricule, avatarUrl, faculty, department, level,
 *                           verificationStatus: "pending" | "approved" | "rejected", accountStatus: "active" | "suspended" | "banned", registeredAt }
 *   GET  /admin/students/:id → StudentSummary + { authProvider, registrationId, verification: {…}, accountStatusReason,
 *        accountStatusChangedAt, accountStatusChangedBy, deactivated, stats: {…}, moderation: [{ id, action, reason, by, at }] }
 *   POST /admin/students/:id/suspend   { reason }   → 204
 *   POST /admin/students/:id/reinstate { reason? }  → 204
 *   POST /admin/students/:id/ban       { reason }   → 204
 *        all three: 409 INVALID_TRANSITION when the account isn't in a state the action applies to
 *   Verify / reject reuse the registration review endpoints (verificationService) with `registrationId`.
 *
 * Any stat the server can't compute yet is null: the UI shows "Not available yet", never 0.
 */

export const PAGE_SIZE = 20;
export const ACTION_REASON_MIN = 10;

export const ACCOUNT_STATUS = {
  active: { label: "Active", icon: "check", className: "bg-success-soft text-success-ink" },
  suspended: { label: "Suspended", icon: "clock", className: "bg-warn-soft text-warn" },
  banned: { label: "Banned", icon: "userX", className: "bg-danger-soft text-live" },
};

/**
 * What an admin can do from each account status. `reason`: required (min ACTION_REASON_MIN) or optional.
 * The server enforces the same transitions; this only decides which buttons to show.
 */
export const ACCOUNT_ACTIONS = {
  suspend: {
    from: ["active"],
    label: "Suspend",
    icon: "clock",
    tone: "warning",
    reason: "required",
    title: (n) => `Suspend ${n}?`,
    message: "They're signed out at once and can't use TANAWAR until an admin reinstates the account. Their sessions, resources and history are kept.",
    confirm: "Suspend account",
    done: (n) => `${n}'s account was suspended.`,
  },
  ban: {
    from: ["active", "suspended"],
    label: "Ban",
    icon: "userX",
    tone: "danger",
    reason: "required",
    title: (n) => `Ban ${n}?`,
    message: "For serious or repeated violations. They're signed out and can't sign in or register again with this matricule or email. Nothing is deleted, and an admin can lift the ban later.",
    confirm: "Ban account",
    done: (n) => `${n}'s account was banned.`,
    acknowledge: "I understand this blocks the student from TANAWAR.",
  },
  reinstate: {
    from: ["suspended", "banned"],
    label: "Reinstate",
    icon: "flip",
    tone: "primary",
    reason: "optional",
    title: (n) => `Reinstate ${n}?`,
    message: "They can sign in and use TANAWAR again straight away.",
    confirm: "Reinstate account",
    done: (n) => `${n}'s account is active again.`,
  },
};

export const actionsFor = (accountStatus) => Object.keys(ACCOUNT_ACTIONS).filter((k) => ACCOUNT_ACTIONS[k].from.includes(accountStatus));

/** Moderation history entries (the activity log, filtered to one student). Unknown actions are shown generically. */
export const MODERATION_ACTIONS = {
  verification_approved: { label: "Verification approved", icon: "verified", tone: "green" },
  verification_rejected: { label: "Verification rejected", icon: "alert", tone: "warn" },
  suspended: { label: "Account suspended", icon: "clock", tone: "warn" },
  reinstated: { label: "Account reinstated", icon: "flip", tone: "green" },
  banned: { label: "Account banned", icon: "userX", tone: "red" },
  unbanned: { label: "Ban lifted", icon: "flip", tone: "green" },
  report_resolved: { label: "Report resolved", icon: "flag", tone: "blue" },
  content_removed: { label: "Content removed", icon: "trash", tone: "warn" },
};

const token = () => getSession()?.token;
const call = (path, opts) => apiRequest(path, { token: token(), ...opts });
const sid = (id) => encodeURIComponent(id);
/** Dev stand-in (no API configured). Null in production builds unless VITE_DEMO_MODE is set. */
const demoActive = () => DEMO_MODE && !isApiConfigured() && Boolean(DEMO_REGISTRY);

const numOrNull = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const strings = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string" && x) : []);

/** Server response → what the page renders. Unknown statuses fall back to the safest reading. */
const normalizeSummary = (s) => ({
  id: String(s.id),
  fullName: s.fullName || "Unnamed student",
  email: s.email ?? null,
  matricule: s.matricule ?? null,
  avatarUrl: s.avatarUrl ?? null,
  faculty: s.faculty ?? null,
  department: s.department ?? null,
  level: s.level ?? null,
  verificationStatus: ["pending", "approved", "rejected"].includes(s.verificationStatus) ? s.verificationStatus : "pending",
  accountStatus: ACCOUNT_STATUS[s.accountStatus] ? s.accountStatus : "active",
  registeredAt: s.registeredAt ?? null,
});

export function normalizeStudentList(raw, page) {
  return {
    items: Array.isArray(raw?.items) ? raw.items.map(normalizeSummary) : [],
    total: numOrNull(raw?.total) ?? 0,
    page: numOrNull(raw?.page) ?? page,
    pageSize: numOrNull(raw?.pageSize) ?? PAGE_SIZE,
    facets: { faculties: strings(raw?.facets?.faculties), departments: strings(raw?.facets?.departments), levels: strings(raw?.facets?.levels) },
  };
}

function normalizeDetail(raw) {
  const st = raw?.stats ?? {};
  const study = st.study && typeof st.study === "object" ? st.study : null;
  return {
    ...normalizeSummary(raw),
    authProvider: raw.authProvider ?? null,
    registrationId: raw.registrationId ?? null,
    verification: raw.verification ?? null,
    accountStatusReason: raw.accountStatusReason ?? null,
    accountStatusChangedAt: raw.accountStatusChangedAt ?? null,
    accountStatusChangedBy: raw.accountStatusChangedBy ?? null,
    deactivated: Boolean(raw.deactivated),
    stats: {
      sessionsCreated: numOrNull(st.sessionsCreated),
      sessionsJoined: numOrNull(st.sessionsJoined),
      resourcesUploaded: numOrNull(st.resourcesUploaded),
      reportsAgainst: numOrNull(st.reportsAgainst),
      reportsFiled: numOrNull(st.reportsFiled),
      study: study
        ? {
            totalSeconds: numOrNull(study.totalSeconds),
            sittings: numOrNull(study.sittings),
            roomsCreated: numOrNull(study.roomsCreated),
            lastStudiedAt: study.lastStudiedAt ?? null,
            studyingNow: Boolean(study.studyingNow),
          }
        : null,
    },
    moderation: Array.isArray(raw.moderation) ? [...raw.moderation].sort((a, b) => String(b.at).localeCompare(String(a.at))) : null,
  };
}

/* ───────────── endpoints ───────────── */

/** `filters`: { q, faculty, department, level, verification, status, sort, order, page } — empty values are left out. */
export async function listStudents(filters = {}) {
  const query = { pageSize: PAGE_SIZE, page: 1, ...filters, q: filters.q?.trim() ?? "" };
  const raw = demoActive()
    ? DEMO_REGISTRY.students(query)
    : await call(`/admin/students?${new URLSearchParams(Object.entries(query).filter(([, v]) => v !== "" && v != null))}`);
  return normalizeStudentList(raw, query.page);
}

export async function getStudentDetail(id) {
  if (demoActive()) return normalizeDetail(DEMO_REGISTRY.student(id, DEMO_STUDY_ROOMS?.studentStats(id) ?? null));
  return normalizeDetail(await call(`/admin/students/${sid(id)}`));
}

/** action: "suspend" | "reinstate" | "ban". Throws REASON_REQUIRED before calling the server when the reason is too short. */
export async function setAccountStatus(id, action, reason = "") {
  const def = ACCOUNT_ACTIONS[action];
  if (!def) throw new ApiError("Unknown action.", { code: "BAD_ACTION" });
  const text = reason.trim();
  if (def.reason === "required" && text.length < ACTION_REASON_MIN) {
    throw new ApiError("Give a reason: it's recorded in the activity log.", { code: "REASON_REQUIRED" });
  }
  if (demoActive()) return DEMO_REGISTRY.setAccountStatus(id, action, text);
  await call(`/admin/students/${sid(id)}/${action}`, { method: "POST", body: text ? { reason: text } : {} });
}
