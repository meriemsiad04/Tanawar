/**
 * Thin fetch wrapper for the TANAWAR backend.
 *
 * The backend isn't built yet. Once it exists, set VITE_API_URL in a `.env.local`
 * file (e.g. VITE_API_URL=http://localhost:8000/api) and every call goes there.
 * Until then, calls fail with an ApiError(code: "NOT_CONFIGURED"). Nothing is faked.
 */
const BASE_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");
const TIMEOUT_MS = 15000;

export class ApiError extends Error {
  constructor(message, { status = 0, code = "UNKNOWN", details } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const isApiConfigured = () => Boolean(BASE_URL);

/**
 * Fired on `window` when the server refuses a request because the student's registration isn't approved
 * (403 + code VERIFICATION_PENDING | VERIFICATION_REJECTED). authService listens and syncs the session,
 * so the verification status stays consistent everywhere without each page handling it.
 */
export const VERIFICATION_EVENT = "tanawar:verification-required";
const VERIFICATION_CODES = { VERIFICATION_PENDING: "pending", VERIFICATION_REJECTED: "rejected" };

/** `responseType: "blob"` returns the raw body (used for protected files such as verification documents). */
export async function apiRequest(path, { method = "GET", body, token, signal, responseType = "json" } = {}) {
  if (!BASE_URL) {
    throw new ApiError("The sign-in service isn't connected yet. Please try again later.", {
      code: "NOT_CONFIGURED",
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  signal?.addEventListener("abort", () => controller.abort(), { once: true });

  const isForm = typeof FormData !== "undefined" && body instanceof FormData; // multipart: browser sets the boundary header

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined && !isForm && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(
      controller.signal.aborted && !signal?.aborted
        ? "The server took too long to respond. Please try again."
        : "Can't reach the server. Check your connection and try again.",
      { code: "NETWORK" }
    );
  } finally {
    clearTimeout(timer);
  }

  if (res.ok && responseType === "blob") return res.blob();

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 403 && VERIFICATION_CODES[data?.code] && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(VERIFICATION_EVENT, {
          detail: { status: VERIFICATION_CODES[data.code], rejectionReason: data?.rejectionReason ?? null },
        })
      );
    }
    throw new ApiError(data?.message || `Request failed (${res.status}).`, {
      status: res.status,
      code: data?.code || "HTTP_ERROR",
      details: data,
    });
  }
  return data;
}
