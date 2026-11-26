/** Display helpers shared by the admin student directory and profile. */

export const initialsOf = (name = "") =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

export const fmtDay = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—");

export const fmtDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

/** 0 → "0 min", 5400 → "1 h 30 min". */
export function fmtDuration(seconds) {
  if (seconds == null) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h ? `${h} h${m ? ` ${m} min` : ""}` : `${m} min`;
}

export function adminErrorText(err, fallback) {
  if (err?.code === "NOT_CONFIGURED") return "The server isn't connected yet.";
  if (err?.status === 401) return "Your session has expired. Sign in again.";
  if (err?.status === 403) return "Only administrators can do this.";
  return err?.message || fallback;
}
