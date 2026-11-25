import { ApiError, apiRequest } from "./apiClient.js";
import {
  DEMO_ACCOUNT,
  EMAIL_PATTERN,
  PASSWORD_MIN,
  clearSession,
  demoAccountOverrides,
  getSession,
  updateSessionUser,
} from "./authService.js";
import { DEMO_REGISTRY } from "./demoRegistry.js";
import { getProfile } from "./profileService.js";
import { getSettings, settingsStore } from "./settingsService.js";

/**
 * Account & security (Settings → Account and Privacy & Security): email, password, signed-in devices,
 * data export, deactivation and deletion. Full contract: docs/settings.md.
 *
 * Expected backend contract (Bearer token; adjust here when the API is built):
 *   PUT    /auth/me/email     { email, currentPassword }        → user · 401 WRONG_PASSWORD · 409 EMAIL_TAKEN · 409 GOOGLE_ACCOUNT
 *   PUT    /auth/me/password  { currentPassword, newPassword }  → 204 · 401 WRONG_PASSWORD · 422 VALIDATION_ERROR
 *                             (the server signs out every OTHER device: the current token stays valid)
 *   GET    /auth/sessions                                       → [{ id, device, browser, os, location, lastActiveAt, createdAt, current }]
 *   DELETE /auth/sessions/:id                                   → 204 (sign that device out)
 *   POST   /auth/logout-all                                     → 204 (revokes every token, this one included)
 *   GET    /students/me/export                                  → JSON file (Content-Disposition: attachment)
 *   POST   /students/me/deactivate { currentPassword? , confirm } → 204 (hidden until the student signs in again)
 *   DELETE /students/me           { currentPassword? , confirm } → 204 (permanent)
 *   Google accounts have no password: they send `confirm` only, and the server must require a recent sign-in instead.
 */

export const UNIVERSITY = { name: "Université M’Hamed Bougara de Boumerdès", short: "UMBB" };
export const DELETE_CONFIRMATION = "DELETE";

const token = () => getSession()?.token;
const call = (path, opts) => apiRequest(path, { token: token(), ...opts });
const demoKind = () => {
  if (!import.meta.env.DEV) return null;
  const t = token();
  if (t === "demo-token") return "account";
  if (DEMO_REGISTRY?.owns(t)) return "registry";
  return null;
};

/** Accounts created with Google have no TANAWAR password. */
export const hasPassword = (user) => (user?.authProvider ?? "email") !== "google";

/* ───────────── Validation (the server must run the same checks) ───────────── */

export function validatePasswordChange({ currentPassword, newPassword, confirm }) {
  const e = {};
  if (!currentPassword) e.currentPassword = "Enter your current password.";
  if (!newPassword) e.newPassword = "Choose a new password.";
  else if (newPassword.length < PASSWORD_MIN) e.newPassword = `Use at least ${PASSWORD_MIN} characters.`;
  else if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) e.newPassword = "Use at least one letter and one number.";
  else if (newPassword === currentPassword) e.newPassword = "Choose a password you haven’t used here.";
  if (!confirm) e.confirm = "Repeat your new password.";
  else if (confirm !== newPassword) e.confirm = "The passwords don’t match.";
  return e;
}

export function validateEmailChange({ email, currentPassword }, currentEmail) {
  const e = {};
  const v = email.trim();
  if (!v) e.email = "Enter your email address.";
  else if (!EMAIL_PATTERN.test(v)) e.email = "Enter a valid email address.";
  else if (currentEmail && v.toLowerCase() === currentEmail.toLowerCase()) e.email = "This is already your email address.";
  if (!currentPassword) e.currentPassword = "Enter your password to confirm.";
  return e;
}

/** Maps server errors to the form field they belong to. */
function fieldError(err) {
  if (!(err instanceof ApiError)) return err;
  const known = {
    WRONG_PASSWORD: { field: "currentPassword", message: "Your current password is incorrect." },
    EMAIL_TAKEN: { field: "email", message: "Another account already uses this email." },
  }[err.code] ?? (err.status === 401 ? { field: "currentPassword", message: "Your current password is incorrect." } : null);
  if (known) return new ApiError(known.message, { status: err.status, code: err.code, details: { field: known.field } });
  if (err.status === 429) return new ApiError("Too many attempts. Please wait a moment and try again.", { status: 429, code: "RATE_LIMITED" });
  return err;
}

/* ───────────── Email & password ───────────── */

export async function changeEmail({ email, currentPassword }) {
  const next = email.trim();
  const kind = demoKind();
  try {
    if (kind === "account") {
      if (currentPassword !== (demoAccountOverrides.get().password ?? DEMO_ACCOUNT.password)) throw new ApiError("", { status: 401, code: "WRONG_PASSWORD" });
      demoAccountOverrides.set({ email: next });
      updateSessionUser({ email: next });
      return getSession()?.user;
    }
    if (kind === "registry") {
      DEMO_REGISTRY.checkPassword(token(), currentPassword);
      const user = DEMO_REGISTRY.updateAccount(token(), { email: next });
      updateSessionUser(user);
      return user;
    }
    const user = await call("/auth/me/email", { method: "PUT", body: { email: next, currentPassword } });
    updateSessionUser(user && typeof user === "object" ? user : { email: next });
    return getSession()?.user;
  } catch (err) {
    throw fieldError(err);
  }
}

export async function changePassword({ currentPassword, newPassword }) {
  const kind = demoKind();
  try {
    if (kind === "account") {
      if (currentPassword !== (demoAccountOverrides.get().password ?? DEMO_ACCOUNT.password)) throw new ApiError("", { status: 401, code: "WRONG_PASSWORD" });
      demoAccountOverrides.set({ password: newPassword });
      return;
    }
    if (kind === "registry") {
      DEMO_REGISTRY.checkPassword(token(), currentPassword);
      DEMO_REGISTRY.updateAccount(token(), { password: newPassword });
      return;
    }
    await call("/auth/me/password", { method: "PUT", body: { currentPassword, newPassword } });
  } catch (err) {
    throw fieldError(err);
  }
}

/* ───────────── Devices ───────────── */

/** "Chrome on Windows" from the user agent (demo only: the server reports devices for real). */
function describeThisDevice() {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "Unknown OS";
  const device = /Android|iPhone/.test(ua) ? "phone" : /iPad|Tablet/.test(ua) ? "tablet" : "desktop";
  return { browser, os, device };
}

export async function listDevices() {
  if (demoKind()) {
    // Without a backend only this browser is known.
    return [{ id: "this-device", ...describeThisDevice(), location: null, lastActiveAt: new Date().toISOString(), createdAt: null, current: true }];
  }
  const list = await call("/auth/sessions");
  if (!Array.isArray(list)) throw new ApiError("Unexpected response from the server.", { code: "BAD_RESPONSE" });
  return list;
}

export async function revokeDevice(id) {
  if (demoKind()) return;
  await call(`/auth/sessions/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/** Signs out every device, this one included, then returns to the landing page. */
export async function signOutEverywhere() {
  if (!demoKind()) await call("/auth/logout-all", { method: "POST" });
  leave();
}

function leave() {
  settingsStore.reset();
  clearSession();
  window.location.assign("/");
}

/* ───────────── Data export ───────────── */

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Downloads everything TANAWAR stores about the student as a JSON file. */
export async function exportMyData() {
  const stamp = new Date().toISOString().slice(0, 10);
  if (demoKind()) {
    const { token: _token, ...session } = getSession() ?? {};
    const [profile, settings] = await Promise.all([getProfile().catch(() => null), getSettings().catch(() => null)]);
    const data = { exportedAt: new Date().toISOString(), note: "Development demo export (no backend).", account: session.user, profile, settings };
    download(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), `tanawar-data-${stamp}.json`);
    return;
  }
  const blob = await call("/students/me/export", { responseType: "blob" });
  download(blob, `tanawar-data-${stamp}.json`);
}

/* ───────────── Deactivate / delete ───────────── */

function checkDemoPassword(kind, currentPassword) {
  if (kind === "account" && currentPassword !== (demoAccountOverrides.get().password ?? DEMO_ACCOUNT.password))
    throw new ApiError("", { status: 401, code: "WRONG_PASSWORD" });
  if (kind === "registry") DEMO_REGISTRY.checkPassword(token(), currentPassword);
}

/** Hides the account until the student signs in again, then signs out. */
export async function deactivateAccount({ currentPassword }) {
  const kind = demoKind();
  try {
    if (kind) {
      checkDemoPassword(kind, currentPassword);
      if (kind === "registry") DEMO_REGISTRY.deactivate(token());
    } else {
      await call("/students/me/deactivate", { method: "POST", body: { currentPassword: currentPassword || undefined, confirm: true } });
    }
  } catch (err) {
    throw fieldError(err);
  }
  leave();
}

/** Permanently deletes the account and its data, then signs out. */
export async function deleteAccount({ currentPassword, confirm }) {
  if (confirm !== DELETE_CONFIRMATION) throw new ApiError(`Type ${DELETE_CONFIRMATION} to confirm.`, { code: "VALIDATION_ERROR", details: { field: "confirm" } });
  const kind = demoKind();
  try {
    if (kind) {
      checkDemoPassword(kind, currentPassword);
      if (kind === "registry") DEMO_REGISTRY.remove(token());
      else {
        // The built-in demo account can't disappear: wipe everything it saved instead.
        demoAccountOverrides.clear();
        Object.keys(localStorage).filter((k) => k.startsWith("tanawar.demo") && k !== "tanawar.demoRegistry").forEach((k) => localStorage.removeItem(k));
      }
    } else {
      await call("/students/me", { method: "DELETE", body: { currentPassword: currentPassword || undefined, confirm } });
    }
  } catch (err) {
    throw fieldError(err);
  }
  leave();
}
