/** Display helpers for the admin session views. */

export const textareaCls =
  "w-full resize-none rounded-[10px] border border-line-strong bg-surface px-3 py-2.5 text-sm text-fg outline-none placeholder:text-fg-3 focus:border-primary focus:ring-4 focus:ring-primary/15";

/** "Wed 25 Nov 2026" */
export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "—");

/** "18:00" */
export const fmtTime = (iso) => (iso ? new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "");

/** "18:00 – 19:30" (or just the start when the duration is unknown). */
export function fmtTimeRange(startsAt, durationMin) {
  if (!startsAt) return "—";
  if (!durationMin) return fmtTime(startsAt);
  return `${fmtTime(startsAt)} – ${fmtTime(new Date(new Date(startsAt).getTime() + durationMin * 60000).toISOString())}`;
}

/** 90 → "1 h 30 min" */
export function fmtMinutes(min) {
  if (min == null) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} h${m ? ` ${m} min` : ""}` : `${m} min`;
}

/** Only http(s) links are rendered as links (never javascript:, data:…). */
export function safeHref(url) {
  try {
    return ["http:", "https:"].includes(new URL(url).protocol) ? url : null;
  } catch {
    return null;
  }
}
