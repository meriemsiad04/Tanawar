import { DEMO_MODE } from "../config/demo.js";
import { SESSION_LIMITS } from "../data/sessionOptions.js";
import { ApiError, apiRequest, isApiConfigured } from "./apiClient.js";
import { DEMO_ADMIN, getSession } from "./authService.js";
import { DEMO_REGISTRY } from "./demoRegistry.js";
import { DEMO_SESSION_ADMIN } from "./sessionsService.js";
import { DOCUMENT_TYPES } from "./verificationService.js";

/**
 * Admin "System" area: change log (/admin/changelog), operators (/admin/operators) and platform settings (/admin/settings).
 * Full contract and what the server must enforce: docs/system-admin.md.
 *
 * Expected backend contract (Bearer token, admin role only: 401 without a session, 403 for everyone else):
 *   GET   /admin/changelog?q=&category=&actor=&period=1|7|30|90&page=&pageSize=
 *         → { items: [ChangeEntry], total, page, pageSize, facets: { actors: [{ id, name }] } }   newest first
 *         ChangeEntry = { id, at, actor: { id, name }, action, category: "students"|"sessions"|"operators"|"settings",
 *                         target: { type, id, label } | null, reason, changes: [{ field, label, from, to }] | null }
 *   GET   /admin/operators → { items: [Operator], me: operatorId }
 *         Operator = { id, fullName, email, role: "super_admin"|"admin"|"moderator", status: "active"|"invited"|"suspended",
 *                      createdAt, invitedBy, lastActiveAt }
 *   POST  /admin/operators              { fullName, email, role } → Operator (status "invited")   409 EMAIL_TAKEN
 *   PATCH /admin/operators/:id          { role }                  → Operator
 *   POST  /admin/operators/:id/suspend  { reason }  → 204
 *   POST  /admin/operators/:id/reactivate          → 204
 *   POST  /admin/operators/:id/resend-invite       → 204   invited only
 *   DELETE /admin/operators/:id                    → 204   revokes an invitation or removes access
 *         all writes: super admin only (403 FORBIDDEN otherwise); 409 SELF_ACTION on your own account;
 *         409 LAST_SUPER_ADMIN when it would leave no active super admin.
 *   GET   /admin/settings → { values: Settings, updatedAt, updatedBy }
 *   PATCH /admin/settings { ...changedKeys } → same shape. Super admin only; 422 INVALID_SETTING { field } out of range.
 *   Every write above adds a ChangeEntry in the same transaction (settings: one entry listing every changed field).
 */

export const PAGE_SIZE = 25;
export const REASON_MIN = 10;

/* ───────────── change log ───────────── */

export const CHANGE_CATEGORIES = {
  students: { label: "Students", icon: "users" },
  sessions: { label: "Sessions", icon: "calendar" },
  operators: { label: "Operators", icon: "userCog" },
  settings: { label: "Settings", icon: "gear" },
};

export const PERIODS = [
  { value: "1", label: "Last 24 hours" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

/** action → how the log shows it. Unknown actions are shown generically (never hidden). */
export const CHANGE_ACTIONS = {
  verification_approved: { category: "students", label: "approved the registration of", icon: "verified", tone: "green" },
  verification_rejected: { category: "students", label: "rejected the registration of", icon: "circleX", tone: "red" },
  suspended: { category: "students", label: "suspended", icon: "clock", tone: "warn" },
  reinstated: { category: "students", label: "reinstated", icon: "flip", tone: "green" },
  banned: { category: "students", label: "banned", icon: "userX", tone: "red" },
  unbanned: { category: "students", label: "lifted the ban on", icon: "flip", tone: "green" },
  approved: { category: "sessions", label: "approved the session", icon: "check", tone: "green" },
  rejected: { category: "sessions", label: "rejected the session", icon: "circleX", tone: "red" },
  cancelled: { category: "sessions", label: "cancelled the session", icon: "ban", tone: "warn" },
  removed: { category: "sessions", label: "removed the session", icon: "trash", tone: "red" },
  note_added: { category: "sessions", label: "added an internal note on", icon: "note", tone: "blue" },
  operator_invited: { category: "operators", label: "invited", icon: "userPlus", tone: "blue" },
  operator_role_changed: { category: "operators", label: "changed the role of", icon: "shield", tone: "blue" },
  operator_suspended: { category: "operators", label: "suspended the operator", icon: "clock", tone: "warn" },
  operator_reactivated: { category: "operators", label: "reactivated the operator", icon: "flip", tone: "green" },
  operator_removed: { category: "operators", label: "removed the operator", icon: "userX", tone: "red" },
  invitation_revoked: { category: "operators", label: "revoked the invitation of", icon: "userX", tone: "warn" },
  invitation_resent: { category: "operators", label: "resent the invitation to", icon: "mail", tone: "blue" },
  settings_updated: { category: "settings", label: "updated the platform settings", icon: "gear", tone: "blue" },
};

/* ───────────── operators ───────────── */

export const OPERATOR_ROLES = {
  super_admin: { label: "Super admin", icon: "crown", className: "bg-highlight/25 text-fg", description: "Full access, including operators and platform settings." },
  admin: { label: "Administrator", icon: "shield", className: "bg-primary-soft text-primary-text", description: "Verifies students, manages accounts and moderates content." },
  moderator: { label: "Moderator", icon: "flag", className: "bg-accent-soft text-accent-ink", description: "Moderates sessions, resources and reports. No account actions." },
};

export const OPERATOR_STATUS = {
  active: { label: "Active", icon: "check", className: "bg-success-soft text-success-ink" },
  invited: { label: "Invitation sent", icon: "mail", className: "bg-primary-soft text-primary-text" },
  suspended: { label: "Suspended", icon: "clock", className: "bg-warn-soft text-warn" },
};

/** What each role may do. The server enforces it on every endpoint; the UI only uses it to show or hide actions. */
export const PERMISSIONS = [
  { key: "registrations", label: "Review registrations", roles: ["super_admin", "admin"] },
  { key: "accounts", label: "Suspend, ban and reinstate students", roles: ["super_admin", "admin"] },
  { key: "sessions", label: "Approve and moderate sessions", roles: ["super_admin", "admin", "moderator"] },
  { key: "content", label: "Moderate resources and reports", roles: ["super_admin", "admin", "moderator"] },
  { key: "changelog", label: "Read the change log", roles: ["super_admin", "admin", "moderator"] },
  { key: "operators", label: "Invite and manage operators", roles: ["super_admin"] },
  { key: "settings", label: "Change platform settings", roles: ["super_admin"] },
];

export const can = (role, permission) => Boolean(PERMISSIONS.find((p) => p.key === permission)?.roles.includes(role));

/* ───────────── settings ───────────── */

/**
 * Every platform setting, grouped as the page shows it. `type`: toggle | number | text | email | multi.
 * `default` is what the platform does today, so saving an untouched form changes nothing.
 */
export const SETTINGS_SECTIONS = [
  {
    key: "registration",
    title: "Registration",
    icon: "userCheck",
    description: "Who can sign up and what they must provide to be verified.",
    fields: [
      { key: "registrationOpen", type: "toggle", label: "Open registrations", hint: "When off, new students can't create an account. Existing accounts are not affected.", default: true },
      { key: "googleSignUp", type: "toggle", label: "Allow Google sign-up", hint: "Students can register with their Google account in addition to email and password.", default: true },
      { key: "acceptedDocuments", type: "multi", label: "Accepted proof of enrollment", hint: "At least one document type must stay accepted.", options: DOCUMENT_TYPES.map(({ value, label }) => ({ value, label })), default: DOCUMENT_TYPES.map((d) => d.value) },
      { key: "maxDocumentMb", type: "number", label: "Maximum document size", unit: "MB", min: 1, max: 20, default: 5 },
      { key: "maxVerificationAttempts", type: "number", label: "Verification attempts", hint: "How many times a rejected student can resubmit before they must contact an admin.", unit: "attempts", min: 1, max: 10, default: 5 },
    ],
  },
  {
    key: "sessions",
    title: "Study sessions",
    icon: "calendar",
    description: "Limits that apply when students create sessions.",
    fields: [
      { key: "scheduledNeedApproval", type: "toggle", label: "Scheduled sessions need approval", hint: "When off, scheduled sessions are published at once, like instant ones.", default: true },
      { key: "instantSessions", type: "toggle", label: "Allow instant sessions", hint: "Students can start a session right now, without scheduling it.", default: true },
      { key: "maxSeats", type: "number", label: "Maximum seats per session", unit: "seats", min: SESSION_LIMITS.seats.min, max: SESSION_LIMITS.seats.max, default: SESSION_LIMITS.seats.max },
      { key: "maxDurationMin", type: "number", label: "Maximum duration", unit: "min", min: SESSION_LIMITS.duration.min, max: SESSION_LIMITS.duration.max, default: SESSION_LIMITS.duration.max },
    ],
  },
  {
    key: "study",
    title: "Study With Me",
    icon: "lamp",
    description: "Silent co-study rooms.",
    fields: [
      { key: "studyRoomsEnabled", type: "toggle", label: "Enable Study With Me", hint: "When off, rooms can't be opened or joined. Study history is kept.", default: true },
      { key: "maxRoomsPerDay", type: "number", label: "Rooms a student can open per day", unit: "rooms", min: 1, max: 10, default: 3 },
    ],
  },
  {
    key: "resources",
    title: "Resources",
    icon: "books",
    description: "Files students share with each other.",
    fields: [
      { key: "maxResourceMb", type: "number", label: "Maximum file size", unit: "MB", min: 1, max: 50, default: SESSION_LIMITS.fileBytes / (1024 * 1024) },
      { key: "resourcesNeedReview", type: "toggle", label: "Review resources before publishing", hint: "New uploads stay hidden until a moderator approves them.", default: false },
    ],
  },
  {
    key: "platform",
    title: "Maintenance & contact",
    icon: "wrench",
    description: "What students see when something is wrong.",
    fields: [
      { key: "maintenanceMode", type: "toggle", label: "Maintenance mode", hint: "Students see the maintenance message instead of the app. Admins keep full access.", default: false, danger: true },
      { key: "maintenanceMessage", type: "text", label: "Maintenance message", placeholder: "TANAWAR is being updated. We'll be back shortly.", maxLength: 200, default: "" },
      { key: "supportEmail", type: "email", label: "Support email", hint: "Shown to students who need help (suspended accounts, rejected registrations).", placeholder: "support@univ-boumerdes.dz", default: "" },
    ],
  },
];

const SETTING_FIELDS = SETTINGS_SECTIONS.flatMap((s) => s.fields);
export const settingField = (key) => SETTING_FIELDS.find((f) => f.key === key);
export const DEFAULT_SETTINGS = Object.fromEntries(SETTING_FIELDS.map((f) => [f.key, f.default]));
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** { key: message } for every invalid value (empty object = valid). Same rules the server applies (422). */
export function validateSettings(values) {
  const errors = {};
  for (const f of SETTING_FIELDS) {
    const v = values[f.key];
    if (f.type === "number" && (!Number.isInteger(v) || v < f.min || v > f.max)) errors[f.key] = `Between ${f.min} and ${f.max}.`;
    if (f.type === "multi" && (!Array.isArray(v) || v.length === 0)) errors[f.key] = "Keep at least one.";
    if (f.type === "email" && v && !EMAIL.test(v)) errors[f.key] = "Enter a valid email address.";
    if (f.type === "text" && f.maxLength && String(v ?? "").length > f.maxLength) errors[f.key] = `${f.maxLength} characters at most.`;
  }
  if (values.maintenanceMode && !String(values.maintenanceMessage ?? "").trim()) errors.maintenanceMessage = "Write the message students will see.";
  return errors;
}

/** Display a setting value in the change log ("On", "5 MB", "Student card, Certificate of enrollment"). */
export function formatSettingValue(key, value) {
  const f = settingField(key);
  if (value == null || value === "") return "empty";
  if (!f) return String(value);
  if (f.type === "toggle") return value ? "On" : "Off";
  if (f.type === "number") return `${value} ${f.unit ?? ""}`.trim();
  if (f.type === "multi") return value.map((v) => f.options.find((o) => o.value === v)?.label ?? v).join(", ") || "none";
  return String(value);
}

const sameValue = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export const changedKeys = (before, after) => SETTING_FIELDS.map((f) => f.key).filter((k) => !sameValue(before[k], after[k]));

/* ───────────── plumbing ───────────── */

const token = () => getSession()?.token;
const call = (path, opts) => apiRequest(path, { token: token(), ...opts });
const sid = (id) => encodeURIComponent(id);
/** Dev stand-in (no API configured). Null in production builds unless VITE_DEMO_MODE is set. */
const demoActive = () => DEMO_MODE && !isApiConfigured() && Boolean(DEMO_SYSTEM);

const numOrNull = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

const normalizeEntry = (e) => {
  const def = CHANGE_ACTIONS[e.action];
  return {
    id: String(e.id),
    at: e.at ?? null,
    actor: { id: e.actor?.id ?? null, name: e.actor?.name || "An admin" },
    action: e.action,
    category: CHANGE_CATEGORIES[e.category] ? e.category : (def?.category ?? null),
    target: e.target?.label ? { type: e.target.type ?? null, id: e.target.id ?? null, label: e.target.label } : null,
    reason: e.reason || null,
    changes: Array.isArray(e.changes) ? e.changes : null,
  };
};

const normalizeOperator = (o) => ({
  id: String(o.id),
  fullName: o.fullName || o.email || "Unnamed operator",
  email: o.email ?? null,
  role: OPERATOR_ROLES[o.role] ? o.role : "moderator", // unknown role → the least privileged reading
  status: OPERATOR_STATUS[o.status] ? o.status : "suspended",
  statusReason: o.statusReason ?? null,
  createdAt: o.createdAt ?? null,
  invitedBy: o.invitedBy ?? null,
  lastActiveAt: o.lastActiveAt ?? null,
});

/* ───────────── endpoints ───────────── */

/** filters: { q, category, actor, period, page } — empty values are left out. */
export async function listChanges(filters = {}) {
  const query = { pageSize: PAGE_SIZE, page: 1, ...filters, q: filters.q?.trim() ?? "" };
  const raw = demoActive()
    ? DEMO_SYSTEM.changelog(query)
    : await call(`/admin/changelog?${new URLSearchParams(Object.entries(query).filter(([, v]) => v !== "" && v != null))}`);
  return {
    items: Array.isArray(raw?.items) ? raw.items.map(normalizeEntry) : [],
    total: numOrNull(raw?.total) ?? 0,
    page: numOrNull(raw?.page) ?? query.page,
    pageSize: numOrNull(raw?.pageSize) ?? PAGE_SIZE,
    facets: { actors: Array.isArray(raw?.facets?.actors) ? raw.facets.actors.filter((a) => a?.id && a?.name) : [] },
  };
}

export async function listOperators() {
  const raw = demoActive() ? DEMO_SYSTEM.operators() : await call("/admin/operators");
  return { items: Array.isArray(raw?.items) ? raw.items.map(normalizeOperator) : [], me: raw?.me != null ? String(raw.me) : null };
}

export async function inviteOperator({ fullName, email, role }) {
  const body = { fullName: fullName.trim(), email: email.trim().toLowerCase(), role };
  if (!body.fullName) throw new ApiError("Enter their full name.", { code: "VALIDATION" });
  if (!EMAIL.test(body.email)) throw new ApiError("Enter a valid email address.", { code: "VALIDATION" });
  if (!OPERATOR_ROLES[role]) throw new ApiError("Choose a role.", { code: "VALIDATION" });
  if (demoActive()) return normalizeOperator(DEMO_SYSTEM.invite(body));
  return normalizeOperator(await call("/admin/operators", { method: "POST", body }));
}

export async function changeOperatorRole(id, role) {
  if (demoActive()) return DEMO_SYSTEM.setRole(id, role);
  await call(`/admin/operators/${sid(id)}`, { method: "PATCH", body: { role } });
}

/** action: suspend | reactivate | resend | remove. `suspend` needs a reason (REASON_MIN). */
export async function operatorAction(id, action, reason = "") {
  const text = reason.trim();
  if (action === "suspend" && text.length < REASON_MIN) throw new ApiError("Give a reason: it's recorded in the change log.", { code: "REASON_REQUIRED" });
  if (demoActive()) return DEMO_SYSTEM.act(id, action, text);
  if (action === "remove") return call(`/admin/operators/${sid(id)}`, { method: "DELETE" });
  const path = { suspend: "suspend", reactivate: "reactivate", resend: "resend-invite" }[action];
  await call(`/admin/operators/${sid(id)}/${path}`, { method: "POST", body: text ? { reason: text } : {} });
}

/** Unknown or missing keys fall back to the defaults (= today's behaviour). */
export async function getSettings() {
  const raw = demoActive() ? DEMO_SYSTEM.settings() : await call("/admin/settings");
  return { values: { ...DEFAULT_SETTINGS, ...(raw?.values ?? {}) }, updatedAt: raw?.updatedAt ?? null, updatedBy: raw?.updatedBy ?? null };
}

/** Sends only the changed keys. Throws VALIDATION before calling the server when a value is out of range. */
export async function saveSettings(before, after) {
  const errors = validateSettings(after);
  if (Object.keys(errors).length) throw new ApiError("Some values need fixing.", { code: "VALIDATION", details: errors });
  const patch = Object.fromEntries(changedKeys(before, after).map((k) => [k, after[k]]));
  if (demoActive()) return DEMO_SYSTEM.saveSettings(patch);
  const raw = await call("/admin/settings", { method: "PATCH", body: patch });
  return { values: { ...DEFAULT_SETTINGS, ...(raw?.values ?? {}) }, updatedAt: raw?.updatedAt ?? null, updatedBy: raw?.updatedBy ?? null };
}

/** Server error → sentence the admin can act on. */
export function systemErrorText(err) {
  return (
    {
      SELF_ACTION: "You can't do this to your own account.",
      LAST_SUPER_ADMIN: "TANAWAR needs at least one active super admin. Promote someone else first.",
      EMAIL_TAKEN: "This email already belongs to an operator.",
      FORBIDDEN: "Only super admins can do this.",
    }[err?.code] ?? null
  );
}

/* ───────────── dev stand-in ───────────── */

/**
 * DEV / demo only: operators, settings and their change-log entries in this browser's localStorage. The change log also
 * reads the student and session actions the other stand-ins recorded. Saved settings are NOT applied to the app here:
 * the real server reads them. The demo admin is the only seeded operator (nobody else is invented).
 */
function createDemoSystem() {
  const KEY = "tanawar.demoSystem";
  const meId = "op-demo-admin";
  const load = () => {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? "null");
    } catch {
      return null;
    }
  };
  const read = () => {
    const stored = load();
    if (stored) return stored;
    const at = new Date().toISOString();
    return {
      operators: [{ id: meId, fullName: DEMO_ADMIN.user.fullName, email: "admin@univ-boumerdes.dz", role: "super_admin", status: "active", createdAt: at, invitedBy: null, lastActiveAt: at }],
      settings: { values: {}, updatedAt: null, updatedBy: null },
      log: [],
    };
  };
  const write = (s) => localStorage.setItem(KEY, JSON.stringify(s));
  const actorName = () => getSession()?.user?.fullName ?? DEMO_ADMIN.user.fullName;
  const rid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  const log = (s, entry) => {
    s.log = [...s.log, { id: `sys-${rid()}`, at: new Date().toISOString(), actor: { id: meId, name: actorName() }, reason: null, changes: null, ...entry }];
  };
  const find = (s, id) => {
    const op = s.operators.find((o) => o.id === id);
    if (!op) throw new ApiError("Operator not found.", { status: 404, code: "NOT_FOUND" });
    if (id === meId) throw new ApiError("You can't do this to your own account.", { status: 409, code: "SELF_ACTION" });
    return op;
  };
  const activeSupers = (s) => s.operators.filter((o) => o.role === "super_admin" && o.status === "active");
  const guardLastSuper = (s, op) => {
    if (op.role === "super_admin" && op.status === "active" && activeSupers(s).length <= 1) {
      throw new ApiError("Last super admin.", { status: 409, code: "LAST_SUPER_ADMIN" });
    }
  };
  const targetOf = (op) => ({ type: "operator", id: op.id, label: op.fullName });

  return {
    operators() {
      const s = read();
      s.operators.find((o) => o.id === meId).lastActiveAt = new Date().toISOString();
      write(s);
      return { items: s.operators, me: meId };
    },
    invite({ fullName, email, role }) {
      const s = read();
      if (s.operators.some((o) => o.email?.toLowerCase() === email)) throw new ApiError("Email taken.", { status: 409, code: "EMAIL_TAKEN" });
      const op = { id: `op-${rid()}`, fullName, email, role, status: "invited", createdAt: new Date().toISOString(), invitedBy: actorName(), lastActiveAt: null };
      s.operators = [...s.operators, op];
      log(s, { action: "operator_invited", category: "operators", target: targetOf(op), changes: [{ field: "role", label: "Role", from: null, to: OPERATOR_ROLES[role].label }] });
      write(s);
      return op;
    },
    setRole(id, role) {
      const s = read();
      const op = find(s, id);
      if (op.role === role) return;
      if (role !== "super_admin") guardLastSuper(s, op);
      log(s, { action: "operator_role_changed", category: "operators", target: targetOf(op), changes: [{ field: "role", label: "Role", from: OPERATOR_ROLES[op.role].label, to: OPERATOR_ROLES[role].label }] });
      op.role = role;
      write(s);
    },
    act(id, action, reason) {
      const s = read();
      const op = find(s, id);
      const invalid = () => new ApiError("This operator changed meanwhile. Refresh to see their current status.", { status: 409, code: "INVALID_TRANSITION" });
      if (action === "suspend") {
        if (op.status !== "active") throw invalid();
        guardLastSuper(s, op);
        Object.assign(op, { status: "suspended", statusReason: reason });
        log(s, { action: "operator_suspended", category: "operators", target: targetOf(op), reason });
      } else if (action === "reactivate") {
        if (op.status !== "suspended") throw invalid();
        Object.assign(op, { status: "active", statusReason: null });
        log(s, { action: "operator_reactivated", category: "operators", target: targetOf(op) });
      } else if (action === "resend") {
        if (op.status !== "invited") throw invalid();
        log(s, { action: "invitation_resent", category: "operators", target: targetOf(op) });
      } else if (action === "remove") {
        guardLastSuper(s, op);
        s.operators = s.operators.filter((o) => o.id !== id);
        log(s, { action: op.status === "invited" ? "invitation_revoked" : "operator_removed", category: "operators", target: targetOf(op), reason: reason || null });
      } else {
        throw new ApiError("Unknown action.", { code: "BAD_ACTION" });
      }
      write(s);
    },
    settings: () => read().settings,
    saveSettings(patch) {
      const s = read();
      const before = { ...DEFAULT_SETTINGS, ...s.settings.values };
      const keys = Object.keys(patch).filter((k) => settingField(k) && !sameValue(before[k], patch[k]));
      if (keys.length) {
        const at = new Date().toISOString();
        s.settings = { values: { ...s.settings.values, ...Object.fromEntries(keys.map((k) => [k, patch[k]])) }, updatedAt: at, updatedBy: actorName() };
        log(s, {
          action: "settings_updated",
          category: "settings",
          changes: keys.map((k) => ({ field: k, label: settingField(k).label, from: formatSettingValue(k, before[k]), to: formatSettingValue(k, patch[k]) })),
        });
        write(s);
      }
      return { values: { ...DEFAULT_SETTINGS, ...s.settings.values }, updatedAt: s.settings.updatedAt, updatedBy: s.settings.updatedBy };
    },
    changelog({ q = "", category = "", actor = "", period = "", page = 1, pageSize = PAGE_SIZE } = {}) {
      // Student and session stand-ins only record the admin's name: they share one actor id per name.
      const byName = (e) => ({ ...e, actor: { id: `name:${e.by}`, name: e.by } });
      const all = [
        ...read().log,
        ...(DEMO_REGISTRY?.auditLog() ?? []).map((e) => ({ ...byName(e), category: "students" })),
        ...(DEMO_SESSION_ADMIN?.auditLog() ?? []).map((e) => ({ ...byName(e), category: "sessions" })),
      ]
        .map((e) => (e.actor?.id === meId ? e : e.actor?.name === actorName() ? { ...e, actor: { id: meId, name: e.actor.name } } : e))
        .sort((a, b) => String(b.at).localeCompare(String(a.at)));
      const needle = q.trim().toLowerCase();
      const since = period ? Date.now() - Number(period) * 86_400_000 : null;
      const rows = all
        .filter((e) => !category || e.category === category)
        .filter((e) => !actor || e.actor?.id === actor)
        .filter((e) => !since || new Date(e.at).getTime() >= since)
        .filter((e) => !needle || [e.actor?.name, e.target?.label, e.reason, CHANGE_ACTIONS[e.action]?.label, ...(e.changes ?? []).map((c) => c.label)].some((v) => v?.toLowerCase().includes(needle)));
      const actors = [...new Map(all.map((e) => [e.actor.id, e.actor])).values()].sort((a, b) => a.name.localeCompare(b.name));
      const p = Math.max(1, page);
      return { items: rows.slice((p - 1) * pageSize, p * pageSize), total: rows.length, page: p, pageSize, facets: { actors } };
    },
  };
}

const DEMO_SYSTEM = DEMO_MODE && DEMO_ADMIN ? createDemoSystem() : null;
