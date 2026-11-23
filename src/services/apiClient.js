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

export async function apiRequest(path, { method = "GET", body, token, signal } = {}) {
  if (!BASE_URL) {
    throw new ApiError("The sign-in service isn't connected yet. Please try again later.", {
      code: "NOT_CONFIGURED",
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  signal?.addEventListener("abort", () => controller.abort(), { once: true });

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
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

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(data?.message || `Request failed (${res.status}).`, {
      status: res.status,
      code: data?.code || "HTTP_ERROR",
      details: data,
    });
  }
  return data;
}
