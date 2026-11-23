import { ApiError, apiRequest } from "./apiClient.js";

/**
 * Authentication: the only place the frontend talks to the auth backend.
 *
 * Expected backend contract (adjust here when the API is built):
 *   POST /auth/login   { matricule, password }
 *   200 → { token: string, user: { matricule, fullName, role: "student" | "admin", profileCompleted: boolean, field?, level?, avatarUrl? } }
 *   401 → invalid credentials · 403 → account not verified / suspended
 */

const SESSION_KEY = "tanawar.session";

/** UMBB matricules: digits only. Adjust the length if the registry differs. */
export const MATRICULE_PATTERN = /^\d{8,14}$/;

/** Where each role lands after signing in. */
export const HOME_BY_ROLE = { admin: "/admin", student: "/app" };

/**
 * Frontend-only demo account, available in `npm run dev` only (stripped from production builds).
 * Remove together with the DEV branch in signIn() once the backend exists.
 */
export const DEMO_ACCOUNT = import.meta.env.DEV
  ? {
      matricule: "202131012345",
      password: "demo1234",
      user: { matricule: "202131012345", fullName: "Meriem Benali", role: "student", field: "Informatique", level: "L3" },
    }
  : null;

export async function signIn({ matricule, password, remember }) {
  if (DEMO_ACCOUNT && matricule === DEMO_ACCOUNT.matricule && password === DEMO_ACCOUNT.password) {
    saveSession({ token: "demo-token", user: DEMO_ACCOUNT.user }, remember);
    return DEMO_ACCOUNT.user;
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
    if (err instanceof ApiError && err.status === 429) {
      throw new ApiError("Too many attempts. Please wait a moment and try again.", { status: 429, code: "RATE_LIMITED" });
    }
    throw err;
  }

  if (!data?.token || !data?.user) {
    throw new ApiError("Unexpected response from the server.", { code: "BAD_RESPONSE" });
  }

  saveSession({ token: data.token, user: data.user }, remember);
  return data.user;
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
