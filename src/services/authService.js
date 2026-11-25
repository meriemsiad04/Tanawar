import { ApiError, VERIFICATION_EVENT, apiRequest } from "./apiClient.js";
import { DEMO_REGISTRY } from "./demoRegistry.js";

/**
 * Authentication: the only place the frontend talks to the auth backend.
 * Full contract, storage and security rules: docs/registration-verification.md.
 *
 * Expected backend contract (adjust here when the API is built):
 *   POST /auth/login   { matricule, password }
 *   200 → { token: string, user: { id, matricule, fullName, email, role: "student" | "admin", authProvider: "email" | "google",
 *                                  verificationStatus: "pending" | "approved" | "rejected", rejectionReason: string | null,
 *                                  profileCompleted: boolean, field?, level?, avatarUrl? } }
 *   401 → invalid credentials · 403 ACCOUNT_SUSPENDED → suspended
 *   (pending / rejected students DO get a token: they need it to see their status and resubmit.
 *    Every other student endpoint answers 403 VERIFICATION_PENDING | VERIFICATION_REJECTED for them.)
 *
 *   POST /auth/register  multipart: method ("email" | "google"), email + password (email) or registrationToken (google),
 *                        fullName, matricule, documentType ("student_card" | "enrollment_certificate"), document (file)
 *   201 → { token, user }  (user.verificationStatus === "pending")
 *   409 MATRICULE_TAKEN | EMAIL_TAKEN · 413 FILE_TOO_LARGE · 415 UNSUPPORTED_FILE · 422 VALIDATION_ERROR { fields: { name: message } }
 *
 *   POST /auth/google    { idToken }  (Google Identity Services credential; the server verifies it with Google)
 *   200 → { token, user }                                         existing account → signed in
 *   200 → { registrationRequired: true, registrationToken, profile: { email, fullName } }
 *         new Google user → finish the same verification form; registrationToken is short-lived and signed by our server
 *
 *   GET  /auth/me → user  (same shape as above; used to keep the verification status in sync)
 */

const SESSION_KEY = "tanawar.session";

/** UMBB matricules: digits only. Adjust the length if the registry differs. */
export const MATRICULE_PATTERN = /^\d{8,14}$/;

/** Where each role lands after signing in. */
export const HOME_BY_ROLE = { admin: "/admin", student: "/app" };

/** Where unverified students are kept (see App.jsx). */
export const VERIFY_PATH = "/app/verification";

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PASSWORD_MIN = 8;

/** Registration review states. Only "approved" students reach the platform. */
export const VERIFICATION_STATUS = { pending: "pending", approved: "approved", rejected: "rejected" };

/** Admins are never gated; students need an approved registration. A missing status counts as NOT verified. */
export const isVerified = (user) => user?.role === "admin" || user?.verificationStatus === VERIFICATION_STATUS.approved;

/**
 * Frontend-only demo account, available in `npm run dev` only (stripped from production builds).
 * Remove together with the DEV branch in signIn() once the backend exists.
 */
export const DEMO_ACCOUNT = import.meta.env.DEV
  ? {
      matricule: "202131012345",
      password: "demo1234",
      user: { matricule: "202131012345", fullName: "Meriem Benali", role: "student", verificationStatus: "approved", field: "Informatique", level: "L3" },
    }
  : null;

/** Dev-only admin, to review demo registrations at /admin/registrations. Stripped from production builds. */
export const DEMO_ADMIN = import.meta.env.DEV
  ? {
      matricule: "100000000001",
      password: "admin1234",
      user: { matricule: "100000000001", fullName: "UMBB Admin", role: "admin" },
    }
  : null;

const DEMO_TOKENS = { "demo-token": DEMO_ACCOUNT?.user, "demo-admin-token": DEMO_ADMIN?.user };
const demoRegistry = () => (DEMO_REGISTRY?.active() ? DEMO_REGISTRY : null);

export async function signIn({ matricule, password, remember }) {
  if (DEMO_ACCOUNT && matricule === DEMO_ACCOUNT.matricule && password === DEMO_ACCOUNT.password) {
    saveSession({ token: "demo-token", user: DEMO_ACCOUNT.user }, remember);
    return DEMO_ACCOUNT.user;
  }
  if (DEMO_ADMIN && matricule === DEMO_ADMIN.matricule && password === DEMO_ADMIN.password) {
    saveSession({ token: "demo-admin-token", user: DEMO_ADMIN.user }, remember);
    return DEMO_ADMIN.user;
  }
  const demo = import.meta.env.DEV ? demoRegistry()?.signIn(matricule, password) : null;
  if (demo) {
    saveSession(demo, remember);
    return demo.user;
  }

  let data;
  try {
    data = await apiRequest("/auth/login", {
      method: "POST",
      body: { matricule, password },
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      throw new ApiError("Incorrect matricule or password.", { status: 401, code: "INVALID_CREDENTIALS" });
    }
    throw commonAuthError(err);
  }
  return acceptSession(data, remember);
}

function commonAuthError(err) {
  if (err instanceof ApiError && err.status === 429) {
    return new ApiError("Too many attempts. Please wait a moment and try again.", { status: 429, code: "RATE_LIMITED" });
  }
  if (err instanceof ApiError && err.code === "ACCOUNT_SUSPENDED") {
    return new ApiError("This account has been suspended. Contact the TANAWAR administrators.", { status: 403, code: "ACCOUNT_SUSPENDED" });
  }
  return err;
}

function acceptSession(data, remember = true) {
  if (!data?.token || !data?.user) {
    throw new ApiError("Unexpected response from the server.", { code: "BAD_RESPONSE" });
  }
  saveSession({ token: data.token, user: data.user }, remember);
  return data.user;
}

/** Messages (and the form field to highlight) for registration errors the student can fix. */
const REGISTER_ERRORS = {
  MATRICULE_TAKEN: { field: "matricule", message: "An account already exists for this matricule. Sign in instead, or contact the administrators if it isn't yours." },
  EMAIL_TAKEN: { field: "email", message: "An account already uses this email. Sign in instead." },
  FILE_TOO_LARGE: { field: "document", message: "This file is too large. Upload a smaller scan or photo." },
  UNSUPPORTED_FILE: { field: "document", message: "Upload a JPG, PNG, WEBP or PDF file." },
  REGISTRATION_TOKEN_EXPIRED: { field: null, message: "Your Google sign-up expired. Continue with Google again." },
};

/** Turns a registration ApiError into one carrying `details.field` (or `details.fields` for 422) for the form. */
export function toRegistrationError(err) {
  if (!(err instanceof ApiError)) return err;
  const known =
    REGISTER_ERRORS[err.code] ??
    (err.status === 413 ? REGISTER_ERRORS.FILE_TOO_LARGE : err.status === 415 ? REGISTER_ERRORS.UNSUPPORTED_FILE : null);
  if (known) return new ApiError(known.message, { status: err.status, code: err.code, details: { field: known.field } });
  if (err.status === 422) {
    return new ApiError(err.message || "Some fields need your attention.", {
      status: 422,
      code: "VALIDATION_ERROR",
      details: { fields: err.details?.fields ?? {} },
    });
  }
  return commonAuthError(err);
}

/**
 * Creates the student account in "pending" verification state and signs the student in.
 * Email and Google sign-ups send the same verification fields: Google only replaces email + password with registrationToken.
 */
export async function signUp({ method, email, password, registrationToken, fullName, matricule, documentType, document }) {
  const demo = import.meta.env.DEV ? demoRegistry() : null;
  if (demo) {
    const reserved = [DEMO_ACCOUNT?.matricule, DEMO_ADMIN?.matricule].filter(Boolean);
    const googleEmail = method === "google" ? registrationToken?.replace(/^demo-google:/, "") : null;
    try {
      return acceptSession(await demo.register({ method, email: googleEmail ?? email, password, fullName, matricule, documentType, document }, reserved));
    } catch (err) {
      throw toRegistrationError(err);
    }
  }

  const body = new FormData();
  body.append("method", method);
  if (method === "google") body.append("registrationToken", registrationToken);
  else {
    body.append("email", email);
    body.append("password", password);
  }
  body.append("fullName", fullName);
  body.append("matricule", matricule);
  body.append("documentType", documentType);
  body.append("document", document);

  try {
    return acceptSession(await apiRequest("/auth/register", { method: "POST", body }));
  } catch (err) {
    throw toRegistrationError(err);
  }
}

/**
 * Exchanges a Google Identity Services credential for a TANAWAR session.
 * Returns `{ user }` for an existing account, or `{ registrationRequired: true, registrationToken, profile }`
 * when the Google account isn't registered yet (the caller then shows the verification form).
 */
export async function signInWithGoogle(idToken, { remember = true } = {}) {
  const demo = import.meta.env.DEV ? demoRegistry() : null;
  if (demo && idToken.startsWith("demo-google:")) {
    const email = idToken.slice("demo-google:".length);
    const existing = demo.signInWithGoogle(email);
    if (existing) return { user: acceptSession(existing, remember) };
    const fullName = email.split("@")[0].split(/[._-]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
    return { registrationRequired: true, registrationToken: idToken, profile: { email, fullName } };
  }

  let data;
  try {
    data = await apiRequest("/auth/google", { method: "POST", body: { idToken } });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      throw new ApiError("Google sign-in failed. Please try again.", { status: 401, code: "GOOGLE_INVALID" });
    }
    throw commonAuthError(err);
  }
  if (data?.registrationRequired) {
    if (!data.registrationToken) throw new ApiError("Unexpected response from the server.", { code: "BAD_RESPONSE" });
    return { registrationRequired: true, registrationToken: data.registrationToken, profile: data.profile ?? {} };
  }
  return { user: acceptSession(data, remember) };
}

/** Re-reads the signed-in user from the server and stores it, so the verification status stays current. */
export async function refreshSessionUser() {
  const token = getSession()?.token;
  if (!token) return null;
  let user;
  if (import.meta.env.DEV && DEMO_TOKENS[token]) user = DEMO_TOKENS[token];
  else if (import.meta.env.DEV && DEMO_REGISTRY.owns(token)) user = DEMO_REGISTRY.me(token);
  else user = await apiRequest("/auth/me", { token });
  if (!user || typeof user !== "object") throw new ApiError("Unexpected response from the server.", { code: "BAD_RESPONSE" });
  updateSessionUser(user);
  return getSession()?.user ?? user;
}

/** "Keep me signed in" → localStorage (survives restarts); otherwise this tab only. */
function saveSession(session, remember) {
  try {
    clearSession();
    (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* storage blocked: the session lives only until reload */
  }
}

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/** Merge fields into the stored session user (e.g. after the profile is saved), keeping its storage. */
export function updateSessionUser(patch) {
  try {
    for (const store of [localStorage, sessionStorage]) {
      const raw = store.getItem(SESSION_KEY);
      if (!raw) continue;
      const session = JSON.parse(raw);
      store.setItem(SESSION_KEY, JSON.stringify({ ...session, user: { ...session.user, ...patch } }));
      return;
    }
  } catch {
    /* storage blocked: the change lives only until reload */
  }
}

// The server answered "not verified" to some request (e.g. an admin revoked access): record it and
// send the student to the status screen, so every page agrees on the verification status.
if (typeof window !== "undefined") {
  window.addEventListener(VERIFICATION_EVENT, (e) => {
    const user = getSession()?.user;
    if (!user || user.role === "admin") return;
    updateSessionUser({ verificationStatus: e.detail.status, rejectionReason: e.detail.rejectionReason });
    const path = window.location.pathname;
    if (path.startsWith("/app") && path !== VERIFY_PATH) window.location.replace(VERIFY_PATH);
  });
}
