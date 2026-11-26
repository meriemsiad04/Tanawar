import { DEMO_MODE } from "../config/demo.js";
import { ApiError, isApiConfigured } from "./apiClient.js";

/**
 * DEV ONLY: an in-browser stand-in for the registration backend, so the sign-up → pending → admin review
 * → approve / reject → resubmit loop can be previewed with `npm run dev` before the API exists.
 *
 * - Active only in dev builds AND while VITE_API_URL is unset. `DEMO_REGISTRY` is `null` in production
 *   builds, so none of this code ships (same pattern as DEMO_ACCOUNT in authService).
 * - Everything lives in this browser's localStorage, including passwords in plain text and documents
 *   as data URLs. It is NOT secure and is never a model for the real backend (see docs/registration-verification.md).
 * Remove this file together with DEMO_ACCOUNT once the backend exists.
 */

const KEY = "tanawar.demoRegistry";
const MAX_STORED_DOC_BYTES = 1.5 * 1024 * 1024; // localStorage is ~5 MB; bigger files keep their name only

const load = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
};
const save = (list) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    throw new ApiError("Demo storage is full. Clear the site data or use a smaller document.", { code: "DEMO_STORAGE_FULL" });
  }
};

const readAsDataUrl = (file) =>
  new Promise((resolve) => {
    if (!file || file.size > MAX_STORED_DOC_BYTES) return resolve(null);
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });

/** Account access (separate from verification): suspended / banned students are refused everywhere, like the server's 403. */
const accountStatusOf = (r) => r.accountStatus ?? "active";
const blockedError = (r) =>
  accountStatusOf(r) === "banned"
    ? new ApiError("This account has been banned. Contact the TANAWAR administrators.", { status: 403, code: "ACCOUNT_BANNED" })
    : accountStatusOf(r) === "suspended"
      ? new ApiError("This account has been suspended. Contact the TANAWAR administrators.", { status: 403, code: "ACCOUNT_SUSPENDED" })
      : null;

const DEMO_ADMIN_NAME = "UMBB Admin";

/** Moderation log actions → admin overview activity types (adminDashboardService ACTIVITY_TYPES). */
const MODERATION_EVENT = { suspended: "suspension", reinstated: "reinstatement", unbanned: "reinstatement", banned: "ban" };

/** The log entry every admin action on a student leaves (the real server writes it in the same transaction as the change). */
const logModeration = (rec, { action, reason, at }) => {
  rec.moderation = [...(rec.moderation ?? []), { id: Math.random().toString(36).slice(2, 10), action, reason: reason ?? null, by: DEMO_ADMIN_NAME, at }];
};

/** Faculty / department / level aren't collected at sign-up: they stay null until a profile provides them. */
const studentSummaryOf = (r) => ({
  id: r.id,
  fullName: r.fullName,
  email: r.email ?? null,
  matricule: r.matricule,
  avatarUrl: r.avatarUrl ?? null,
  faculty: r.faculty ?? null,
  department: r.department ?? null,
  level: r.level ?? null,
  verificationStatus: r.status,
  accountStatus: accountStatusOf(r),
  registeredAt: r.createdAt ?? r.submittedAt,
});

const userOf = (r) => ({
  id: r.id,
  matricule: r.matricule,
  fullName: r.fullName,
  email: r.email,
  role: "student",
  authProvider: r.method,
  verificationStatus: r.status,
  rejectionReason: r.rejectionReason ?? null,
  accountStatus: accountStatusOf(r),
});

const verificationOf = (r) => ({
  status: r.status,
  fullName: r.fullName,
  matricule: r.matricule,
  documentType: r.documentType,
  submittedAt: r.submittedAt,
  reviewedAt: r.reviewedAt ?? null,
  rejectionReason: r.rejectionReason ?? null,
});

const summaryOf = (r) => ({
  id: r.id,
  fullName: r.fullName,
  email: r.email,
  matricule: r.matricule,
  method: r.method,
  documentType: r.documentType,
  status: r.status,
  submittedAt: r.submittedAt,
  attempts: r.attempts,
});

const taken = (list, { matricule, email }, exceptId, reserved = []) => {
  if (reserved.includes(matricule) || list.some((r) => r.id !== exceptId && r.matricule === matricule)) {
    return new ApiError("This matricule is already registered.", { status: 409, code: "MATRICULE_TAKEN" });
  }
  if (email && list.some((r) => r.id !== exceptId && r.email?.toLowerCase() === email.toLowerCase())) {
    return new ApiError("This email is already registered.", { status: 409, code: "EMAIL_TAKEN" });
  }
  return null;
};

const byToken = (token) => {
  const id = token?.startsWith("demo-reg:") ? token.slice("demo-reg:".length) : null;
  const list = load();
  const rec = list.find((r) => r.id === id);
  if (!rec) throw new ApiError("Your session has expired. Please sign in again.", { status: 401, code: "UNAUTHORIZED" });
  return { list, rec };
};

const docFields = async ({ documentType, document }) => ({
  documentType,
  document: { name: document.name, mimeType: document.type, size: document.size, dataUrl: await readAsDataUrl(document) },
});

function createDemoRegistry() {
  return {
    active: () => !isApiConfigured(),
    owns: (token) => Boolean(token?.startsWith("demo-reg:")),

    async register({ method, email, password, fullName, matricule, documentType, document }, reserved) {
      const list = load();
      const clash = taken(list, { matricule, email }, null, reserved);
      if (clash) throw clash;
      const rec = {
        id: Math.random().toString(36).slice(2, 10),
        method,
        email,
        password: method === "email" ? password : null, // DEV ONLY: plain text, never do this for real
        fullName,
        matricule,
        status: "pending",
        createdAt: new Date().toISOString(),
        submittedAt: new Date().toISOString(),
        attempts: 1,
        ...(await docFields({ documentType, document })),
      };
      save([...list, rec]);
      return { token: `demo-reg:${rec.id}`, user: userOf(rec) };
    },

    signIn(matricule, password) {
      const list = load();
      const rec = list.find((r) => r.matricule === matricule && r.password && r.password === password);
      if (!rec) return null;
      const blocked = blockedError(rec);
      if (blocked) throw blocked;
      if (rec.deactivatedAt) {
        delete rec.deactivatedAt; // signing in again reactivates a deactivated account
        save(list);
      }
      return { token: `demo-reg:${rec.id}`, user: userOf(rec) };
    },

    signInWithGoogle(email) {
      const rec = load().find((r) => r.email?.toLowerCase() === email.toLowerCase());
      if (rec && blockedError(rec)) throw blockedError(rec);
      return rec ? { token: `demo-reg:${rec.id}`, user: userOf(rec) } : null;
    },

    me(token) {
      const { rec } = byToken(token);
      const blocked = blockedError(rec);
      if (blocked) throw blocked; // like the server: an existing token stops working once the account is suspended / banned
      return userOf(rec);
    },

    /* Settings → account (see accountService). `currentPassword` is checked like the real server must. */
    checkPassword(token, currentPassword) {
      const { rec } = byToken(token);
      if (rec.password && rec.password !== currentPassword) {
        throw new ApiError("Your current password is incorrect.", { status: 401, code: "WRONG_PASSWORD" });
      }
    },
    updateAccount(token, { email, password }) {
      const { list, rec } = byToken(token);
      if (email) {
        const clash = taken(list, { matricule: rec.matricule, email }, rec.id);
        if (clash) throw clash;
        rec.email = email;
      }
      if (password) rec.password = password;
      save(list);
      return userOf(rec);
    },
    deactivate(token) {
      const { list, rec } = byToken(token);
      rec.deactivatedAt = new Date().toISOString();
      save(list);
    },
    remove(token) {
      const { list, rec } = byToken(token);
      save(list.filter((r) => r.id !== rec.id));
    },
    myVerification: (token) => verificationOf(byToken(token).rec),

    async resubmit(token, { fullName, matricule, documentType, document }) {
      const { list, rec } = byToken(token);
      if (rec.status !== "rejected") throw new ApiError("Only a rejected registration can be resubmitted.", { status: 409, code: "NOT_REJECTED" });
      const clash = taken(list, { matricule }, rec.id);
      if (clash) throw clash;
      Object.assign(rec, { fullName, matricule, status: "pending", rejectionReason: null, reviewedAt: null, submittedAt: new Date().toISOString(), attempts: (rec.attempts ?? 1) + 1 }, await docFields({ documentType, document }));
      save(list);
      return verificationOf(rec);
    },

    list({ status, q } = {}) {
      const needle = q?.trim().toLowerCase();
      const items = load()
        .filter((r) => !status || status === "all" || r.status === status)
        .filter((r) => !needle || [r.fullName, r.email, r.matricule].some((v) => v?.toLowerCase().includes(needle)))
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
        .map(summaryOf);
      return { items, total: items.length };
    },

    get(id) {
      const rec = load().find((r) => r.id === id);
      if (!rec) throw new ApiError("Registration not found.", { status: 404, code: "NOT_FOUND" });
      const { name, mimeType, size } = rec.document ?? {};
      return { ...summaryOf(rec), reviewedAt: rec.reviewedAt ?? null, reviewedBy: rec.reviewedBy ?? null, rejectionReason: rec.rejectionReason ?? null, document: { name, mimeType, size } };
    },

    async document(id) {
      const rec = load().find((r) => r.id === id);
      if (!rec?.document?.dataUrl) throw new ApiError("This demo document was too large to keep in the browser. Only its name was stored.", { status: 404, code: "DEMO_DOC_MISSING" });
      return (await fetch(rec.document.dataUrl)).blob();
    },

    /**
     * Admin overview (adminDashboardService): only what this registry really holds. Every record is a student account.
     * Records created before createdAt existed fall back to their latest submission date.
     */
    overview() {
      const list = load();
      const count = (status) => list.filter((r) => r.status === status).length;
      return {
        totalStudents: list.length,
        verifiedStudents: count("approved"),
        pendingVerifications: count("pending"),
        signups: list.map((r) => r.createdAt ?? r.submittedAt),
        pending: list
          .filter((r) => r.status === "pending")
          .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
          .map((r) => ({ id: r.id, fullName: r.fullName, matricule: r.matricule, submittedAt: r.submittedAt, attempts: r.attempts ?? 1 })),
        events: list.flatMap((r) => [
          { id: `reg-${r.id}`, type: "registration", actor: r.fullName, at: r.createdAt ?? r.submittedAt },
          ...(r.attempts > 1 && r.status === "pending" ? [{ id: `resub-${r.id}-${r.attempts}`, type: "resubmission", actor: r.fullName, at: r.submittedAt }] : []),
          ...(r.reviewedAt
            ? [{ id: `rev-${r.id}-${r.reviewedAt}`, type: r.status === "approved" ? "approval" : "rejection", actor: r.reviewedBy ?? "Admin", subject: r.fullName, at: r.reviewedAt }]
            : []),
          ...(r.moderation ?? [])
            .filter((m) => MODERATION_EVENT[m.action])
            .map((m) => ({ id: `mod-${m.id}`, type: MODERATION_EVENT[m.action], actor: m.by, subject: r.fullName, at: m.at })),
        ]),
      };
    },

    /** Change log (adminSystemService): every admin action recorded on a student, with the student it targeted. */
    auditLog() {
      return load().flatMap((r) =>
        (r.moderation ?? []).map((m) => ({ ...m, target: { type: "student", id: r.id, label: r.fullName } }))
      );
    },

    /* ── Admin: student directory (adminStudentsService). Same filter / sort / paging rules as the real endpoint. ── */

    students({ q = "", faculty = "", department = "", level = "", verification = "", status = "", sort = "registeredAt", order = "desc", page = 1, pageSize = 20 } = {}) {
      const all = load().map(studentSummaryOf);
      const needle = q.trim().toLowerCase();
      const facet = (key) => [...new Set(all.map((s) => s[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b));
      const cmp =
        {
          name: (a, b) => a.fullName.localeCompare(b.fullName),
          registeredAt: (a, b) => (a.registeredAt ?? "").localeCompare(b.registeredAt ?? ""),
        }[sort] ?? (() => 0);
      const filtered = all
        .filter((s) => !needle || [s.fullName, s.email, s.matricule].some((v) => v?.toLowerCase().includes(needle)))
        .filter((s) => (!faculty || s.faculty === faculty) && (!department || s.department === department) && (!level || s.level === level))
        .filter((s) => (!verification || s.verificationStatus === verification) && (!status || s.accountStatus === status))
        .sort((a, b) => (order === "asc" ? 1 : -1) * cmp(a, b) || a.fullName.localeCompare(b.fullName));
      const size = Math.min(Math.max(1, pageSize), 100);
      const p = Math.max(1, page);
      return {
        items: filtered.slice((p - 1) * size, p * size),
        total: filtered.length,
        page: p,
        pageSize: size,
        facets: { faculties: facet("faculty"), departments: facet("department"), levels: facet("level") },
      };
    },

    student(id, studyStats = null) {
      const rec = load().find((r) => r.id === id);
      if (!rec) throw new ApiError("Student not found.", { status: 404, code: "NOT_FOUND" });
      return {
        ...studentSummaryOf(rec),
        authProvider: rec.method,
        registrationId: rec.id,
        verification: {
          status: rec.status,
          documentType: rec.documentType ?? null,
          submittedAt: rec.submittedAt ?? null,
          reviewedAt: rec.reviewedAt ?? null,
          reviewedBy: rec.reviewedBy ?? null,
          rejectionReason: rec.rejectionReason ?? null,
          attempts: rec.attempts ?? 1,
        },
        accountStatusReason: rec.accountStatusReason ?? null,
        accountStatusChangedAt: rec.accountStatusChangedAt ?? null,
        accountStatusChangedBy: rec.accountStatusChangedBy ?? null,
        deactivated: Boolean(rec.deactivatedAt),
        // Only what this browser really holds: sessions, resources and reports have no platform-wide stand-in (null = not available).
        stats: { sessionsCreated: null, sessionsJoined: null, resourcesUploaded: null, reportsAgainst: null, reportsFiled: null, study: studyStats },
        moderation: [...(rec.moderation ?? [])].sort((a, b) => b.at.localeCompare(a.at)),
      };
    },

    /** suspend | reinstate | ban, with the transitions the server must enforce (409 INVALID_TRANSITION otherwise). */
    setAccountStatus(id, action, reason) {
      const list = load();
      const rec = list.find((r) => r.id === id);
      if (!rec) throw new ApiError("Student not found.", { status: 404, code: "NOT_FOUND" });
      const from = accountStatusOf(rec);
      const to = { suspend: "suspended", reinstate: "active", ban: "banned" }[action];
      const allowed = { suspend: ["active"], reinstate: ["suspended", "banned"], ban: ["active", "suspended"] }[action] ?? [];
      if (!allowed.includes(from)) {
        throw new ApiError(`This account is already ${from}. Refresh to see its current status.`, { status: 409, code: "INVALID_TRANSITION" });
      }
      const at = new Date().toISOString();
      Object.assign(rec, { accountStatus: to, accountStatusReason: reason || null, accountStatusChangedAt: at, accountStatusChangedBy: DEMO_ADMIN_NAME });
      logModeration(rec, { action: action === "reinstate" ? (from === "banned" ? "unbanned" : "reinstated") : to, reason, at });
      save(list);
    },

    decide(id, decision, reason) {
      const list = load();
      const rec = list.find((r) => r.id === id);
      if (!rec) throw new ApiError("Registration not found.", { status: 404, code: "NOT_FOUND" });
      if (rec.status !== "pending") throw new ApiError("This registration has already been reviewed.", { status: 409, code: "ALREADY_REVIEWED" });
      const at = new Date().toISOString();
      Object.assign(rec, { status: decision, rejectionReason: decision === "rejected" ? reason : null, reviewedAt: at, reviewedBy: DEMO_ADMIN_NAME });
      logModeration(rec, { action: decision === "approved" ? "verification_approved" : "verification_rejected", reason: decision === "rejected" ? reason : null, at });
      save(list);
      return this.get(id);
    },
  };
}

export const DEMO_REGISTRY = DEMO_MODE ? createDemoRegistry() : null;
