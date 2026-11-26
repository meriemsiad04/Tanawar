import { DEMO_MODE } from "./demoMode.js";
import { ApiError, apiRequest } from "./apiClient.js";
import { MATRICULE_PATTERN, getSession, toRegistrationError, updateSessionUser } from "./authService.js";
import { DEMO_REGISTRY } from "./demoRegistry.js";

/**
 * Student verification (registration review): the student's own status / resubmission, and the admin review queue.
 * Full contract, storage and security rules: docs/registration-verification.md.
 *
 * Expected backend contract (Bearer token; adjust here when the API is built):
 *  Student (allowed while pending / rejected):
 *   GET  /students/me/verification → { status, fullName, matricule, documentType, submittedAt, reviewedAt, rejectionReason }
 *   POST /students/me/verification   multipart: fullName, matricule, documentType, document → same shape (status "pending")
 *                                    409 NOT_REJECTED (only rejected registrations can be resubmitted) | MATRICULE_TAKEN
 *  Admin only (403 for everyone else):
 *   GET  /admin/registrations?status=pending|approved|rejected|all&q=  → { items: [RegistrationSummary], total }
 *        RegistrationSummary = { id, fullName, email, matricule, method: "email" | "google", documentType, status, submittedAt, attempts }
 *   GET  /admin/registrations/:id          → RegistrationSummary + { reviewedAt, reviewedBy, rejectionReason, document: { name, mimeType, size } }
 *   GET  /admin/registrations/:id/document → the file bytes (Content-Type = mimeType). Never a public URL.
 *   POST /admin/registrations/:id/approve  → updated registration
 *   POST /admin/registrations/:id/reject   { reason } → updated registration
 *        both: 409 ALREADY_REVIEWED if another admin decided first
 */

export const DOCUMENT_TYPES = [
  { value: "student_card", label: "Student card", hint: "Photo of your UMBB student card", icon: "idCard" },
  { value: "enrollment_certificate", label: "Certificate of enrollment", hint: "Current year, scan or PDF", icon: "file" },
];
export const documentTypeLabel = (value) => DOCUMENT_TYPES.find((d) => d.value === value)?.label ?? "Document";

export const DOCUMENT_RULES = {
  maxBytes: 5 * 1024 * 1024,
  mimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  accept: ".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf",
  label: "JPG, PNG, WEBP or PDF · up to 5 MB",
};

/** Client-side check only, for fast feedback. The server re-validates type (by content) and size. */
export function validateDocument(file) {
  if (!file) return "Upload your student card or certificate of enrollment.";
  if (!DOCUMENT_RULES.mimeTypes.includes(file.type)) return "Upload a JPG, PNG, WEBP or PDF file.";
  if (file.size > DOCUMENT_RULES.maxBytes) return "This file is larger than 5 MB. Upload a smaller scan or photo.";
  if (file.size === 0) return "This file is empty.";
  return "";
}

export const VERIFICATION_FIELDS = ["fullName", "matricule", "document"];

/** Shared rules for sign-up (email and Google alike) and resubmission. */
export function validateVerification({ fullName, matricule, document }) {
  const errors = {};
  const name = fullName.trim();
  if (!name) errors.fullName = "Enter your full name as it appears on your student card.";
  else if (name.split(/\s+/).length < 2) errors.fullName = "Enter your first and last name.";
  else if (name.length > 80) errors.fullName = "Keep your name under 80 characters.";
  if (!matricule) errors.matricule = "Enter your student ID (matricule).";
  else if (!MATRICULE_PATTERN.test(matricule)) errors.matricule = "A matricule contains only digits (e.g. 202131012345).";
  const doc = validateDocument(document);
  if (doc) errors.document = doc;
  return errors;
}

/** Minimum length of the reason an admin gives when rejecting (shown to the student). */
export const REJECTION_REASON_MIN = 10;

/** Quick reasons in the admin review panel. The admin can edit the text before sending. */
export const REJECTION_PRESETS = [
  "The document is blurry or unreadable. Please upload a clearer photo or scan.",
  "The matricule you entered doesn't match the one on your document.",
  "The certificate of enrollment isn't for the current academic year.",
  "The name on the document doesn't match the name you entered.",
];

const token = () => getSession()?.token;
const call = (path, opts) => apiRequest(path, { token: token(), ...opts });
const rid = (id) => encodeURIComponent(id);
/** Dev demo (no API configured): the browser-only registry. Null in production builds. */
const demo = () => (DEMO_REGISTRY?.active() ? DEMO_REGISTRY : null);

const verificationFromSession = () => {
  const u = getSession()?.user ?? {};
  return {
    status: u.verificationStatus ?? "pending",
    fullName: u.fullName ?? "",
    matricule: u.matricule ?? "",
    documentType: null,
    submittedAt: null,
    reviewedAt: null,
    rejectionReason: u.rejectionReason ?? null,
  };
};

/** Keeps the session's copy of the status in sync with what the server just said. */
const syncSession = (v) => {
  updateSessionUser({ verificationStatus: v.status, rejectionReason: v.rejectionReason ?? null, ...(v.fullName && { fullName: v.fullName }), ...(v.matricule && { matricule: v.matricule }) });
  return v;
};

/* ───────────── Student ───────────── */

export async function getMyVerification() {
  const t = token();
  if (DEMO_MODE && t === "demo-token") return syncSession({ ...verificationFromSession(), status: "approved" });
  if (DEMO_MODE && DEMO_REGISTRY.owns(t)) return syncSession(DEMO_REGISTRY.myVerification(t));
  const v = await call("/students/me/verification");
  if (!v?.status) throw new ApiError("Unexpected response from the server.", { code: "BAD_RESPONSE" });
  return syncSession(v);
}

/** Last known status, when the server can't be reached. */
export const getCachedVerification = verificationFromSession;

export async function resubmitVerification({ fullName, matricule, documentType, document }) {
  const t = token();
  try {
    if (DEMO_MODE && DEMO_REGISTRY.owns(t)) return syncSession(await DEMO_REGISTRY.resubmit(t, { fullName, matricule, documentType, document }));
    const body = new FormData();
    body.append("fullName", fullName);
    body.append("matricule", matricule);
    body.append("documentType", documentType);
    body.append("document", document);
    return syncSession(await call("/students/me/verification", { method: "POST", body }));
  } catch (err) {
    throw toRegistrationError(err);
  }
}

/* ───────────── Admin ───────────── */

export async function listRegistrations({ status = "pending", q = "" } = {}) {
  if (DEMO_MODE && demo()) return demo().list({ status, q });
  const params = new URLSearchParams({ status });
  if (q.trim()) params.set("q", q.trim());
  return call(`/admin/registrations?${params}`);
}

export async function getRegistration(id) {
  if (DEMO_MODE && demo()) return demo().get(id);
  return call(`/admin/registrations/${rid(id)}`);
}

/** Fetches the document with the admin's token (no public link exists) and returns a Blob for preview. */
export async function getRegistrationDocument(id) {
  if (DEMO_MODE && demo()) return demo().document(id);
  return call(`/admin/registrations/${rid(id)}/document`, { responseType: "blob" });
}

export async function approveRegistration(id) {
  if (DEMO_MODE && demo()) return demo().decide(id, "approved");
  return call(`/admin/registrations/${rid(id)}/approve`, { method: "POST" });
}

export async function rejectRegistration(id, reason) {
  const text = reason.trim();
  if (text.length < REJECTION_REASON_MIN) throw new ApiError("Explain the reason so the student knows what to fix.", { code: "REASON_REQUIRED" });
  if (DEMO_MODE && demo()) return demo().decide(id, "rejected", text);
  return call(`/admin/registrations/${rid(id)}/reject`, { method: "POST", body: { reason: text } });
}
