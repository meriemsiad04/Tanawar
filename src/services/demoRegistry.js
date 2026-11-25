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

const userOf = (r) => ({
  id: r.id,
  matricule: r.matricule,
  fullName: r.fullName,
  email: r.email,
  role: "student",
  authProvider: r.method,
  verificationStatus: r.status,
  rejectionReason: r.rejectionReason ?? null,
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
        submittedAt: new Date().toISOString(),
        attempts: 1,
        ...(await docFields({ documentType, document })),
      };
      save([...list, rec]);
      return { token: `demo-reg:${rec.id}`, user: userOf(rec) };
    },

    signIn(matricule, password) {
      const rec = load().find((r) => r.matricule === matricule && r.password && r.password === password);
      return rec ? { token: `demo-reg:${rec.id}`, user: userOf(rec) } : null;
    },

    signInWithGoogle(email) {
      const rec = load().find((r) => r.email?.toLowerCase() === email.toLowerCase());
      return rec ? { token: `demo-reg:${rec.id}`, user: userOf(rec) } : null;
    },

    me: (token) => userOf(byToken(token).rec),
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

    decide(id, decision, reason) {
      const list = load();
      const rec = list.find((r) => r.id === id);
      if (!rec) throw new ApiError("Registration not found.", { status: 404, code: "NOT_FOUND" });
      if (rec.status !== "pending") throw new ApiError("This registration has already been reviewed.", { status: 409, code: "ALREADY_REVIEWED" });
      Object.assign(rec, { status: decision, rejectionReason: decision === "rejected" ? reason : null, reviewedAt: new Date().toISOString(), reviewedBy: "Demo admin" });
      save(list);
      return this.get(id);
    },
  };
}

export const DEMO_REGISTRY = import.meta.env.DEV ? createDemoRegistry() : null;
