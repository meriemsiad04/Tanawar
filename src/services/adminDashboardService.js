import { DEMO_MODE } from "./demoMode.js";
import { apiRequest, isApiConfigured } from "./apiClient.js";
import { getSession } from "./authService.js";
import { DEMO_REGISTRY } from "./demoRegistry.js";
import { DEMO_STUDY_ROOMS } from "./demoStudyRooms.js";

/**
 * Admin dashboard overview (/admin). Full contract and permission rules: docs/admin-dashboard.md.
 *
 * Expected backend contract (Bearer token, admin role only: 401 without a session, 403 for everyone else):
 *   GET /admin/overview?days=7|30|90 → {
 *     serverTime,
 *     stats: { totalStudents, verifiedStudents, pendingVerifications, activeSessions, pendingSessionApprovals,
 *              unresolvedReports, studyParticipants },
 *     series: { registrations: [{ date: "YYYY-MM-DD", value }], sessions: [...], studyHours: [...] },   (value = hours)
 *     popularModules: [{ code, name, sessions }],                       (most sessions in the period first, max 6)
 *     activity: [{ id, type, actor, subject, at }],                     (newest first, max 12; types: see ACTIVITY_TYPES)
 *     tasks: { verifications | sessionApprovals | reports: { total, items: [{ id, title, meta, at }] } }  (oldest first, max 4)
 *   }
 *   GET /admin/counts → { pendingVerifications, pendingSessionApprovals, unresolvedReports }   (sidebar badges)
 *
 * Any field the server can't compute yet may be null: the UI shows it as "not available", never as 0.
 * Days with no data may be omitted from a series; they are filled with 0 here.
 */

export const RANGES = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

export const ACTIVITY_TYPES = ["registration", "resubmission", "approval", "rejection", "session", "sessionApproval", "resource", "report", "studyRoom"];

const token = () => getSession()?.token;
const call = (path, opts) => apiRequest(path, { token: token(), ...opts });
/** Dev stand-ins (no API configured). Null in production builds unless VITE_DEMO_MODE is set. */
const demoActive = () => DEMO_MODE && !isApiConfigured() && Boolean(DEMO_REGISTRY);

/* ───────────── time buckets ───────────── */

const DAY = 86_400_000;
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const startOfDay = (t) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Turns [{ date: "YYYY-MM-DD", value }] into chart bars covering the last `days` days up to `now`:
 * one bar per day up to 31 days, one per week (7-day blocks ending today) beyond. Missing days count as 0.
 * Returns null when the server didn't send the series (unavailable, not empty).
 */
export function toBuckets(points, days, now = Date.now()) {
  if (!Array.isArray(points)) return null;
  const byDay = new Map();
  for (const p of points) byDay.set(p.date, (byDay.get(p.date) ?? 0) + (Number(p.value) || 0));

  const step = days > 31 ? 7 : 1;
  const today = startOfDay(now);
  const buckets = [];
  for (let end = 0; end < days; end += step) {
    const span = Math.min(step, days - end); // the oldest week may be shorter, so the range is exactly `days` long
    let value = 0;
    const last = new Date(today.getTime() - end * DAY);
    const first = new Date(today.getTime() - (end + span - 1) * DAY);
    for (let i = 0; i < span; i++) value += byDay.get(dayKey(new Date(last.getTime() - i * DAY))) ?? 0;
    const fmt = (d, o) => d.toLocaleDateString(undefined, o);
    buckets.unshift(
      step === 1
        ? { label: days <= 7 ? fmt(last, { weekday: "short" }) : String(last.getDate()), long: fmt(last, { weekday: "short", day: "numeric", month: "short" }), value }
        : { label: fmt(first, { day: "numeric", month: "short" }), long: `${fmt(first, { day: "numeric", month: "short" })} – ${fmt(last, { day: "numeric", month: "short" })}`, value }
    );
  }
  return buckets.map((b) => ({ ...b, value: Math.round(b.value * 10) / 10 }));
}

const sum = (buckets) => (buckets ? buckets.reduce((n, b) => n + b.value, 0) : null);
const numOrNull = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const taskGroup = (g) => (g && typeof g.total === "number" ? { total: g.total, items: Array.isArray(g.items) ? g.items : [] } : null);

/** Server response → what the page renders. Keeps null (unavailable) apart from 0 (none). */
export function normalizeOverview(raw, days) {
  const now = raw?.serverTime ? new Date(raw.serverTime).getTime() : Date.now();
  const s = raw?.stats ?? {};
  const series = {
    registrations: toBuckets(raw?.series?.registrations, days, now),
    sessions: toBuckets(raw?.series?.sessions, days, now),
    studyHours: toBuckets(raw?.series?.studyHours, days, now),
  };
  return {
    serverTime: new Date(now).toISOString(),
    days,
    stats: {
      totalStudents: numOrNull(s.totalStudents),
      verifiedStudents: numOrNull(s.verifiedStudents),
      pendingVerifications: numOrNull(s.pendingVerifications),
      activeSessions: numOrNull(s.activeSessions),
      pendingSessionApprovals: numOrNull(s.pendingSessionApprovals),
      unresolvedReports: numOrNull(s.unresolvedReports),
      studyParticipants: numOrNull(s.studyParticipants),
    },
    series,
    totals: { registrations: sum(series.registrations), sessions: sum(series.sessions), studyHours: sum(series.studyHours) },
    popularModules: Array.isArray(raw?.popularModules) ? raw.popularModules.slice(0, 6) : null,
    activity: Array.isArray(raw?.activity)
      ? raw.activity.filter((a) => ACTIVITY_TYPES.includes(a.type)).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 12)
      : null,
    tasks: {
      verifications: taskGroup(raw?.tasks?.verifications),
      sessionApprovals: taskGroup(raw?.tasks?.sessionApprovals),
      reports: taskGroup(raw?.tasks?.reports),
    },
  };
}

/* ───────────── endpoints ───────────── */

export async function getAdminOverview(days = 30) {
  const raw = demoActive() ? demoOverview(days) : await call(`/admin/overview?days=${encodeURIComponent(days)}`);
  return normalizeOverview(raw, days);
}

export async function getAdminCounts() {
  if (demoActive()) {
    const { pendingVerifications } = DEMO_REGISTRY.overview();
    return { pendingVerifications, pendingSessionApprovals: null, unresolvedReports: null };
  }
  return call("/admin/counts");
}

/**
 * Dev only: the overview built from what the in-browser stand-ins really hold (registrations from demoRegistry,
 * rooms and sittings from demoStudyRooms). Sessions, approvals, reports and resources have no platform-wide
 * stand-in, so they stay null and the page shows them as unavailable instead of inventing numbers.
 */
function demoOverview(days) {
  const now = Date.now();
  const since = startOfDay(now).getTime() - (days - 1) * DAY;
  const inRange = (iso) => new Date(iso).getTime() >= since;
  const reg = DEMO_REGISTRY.overview();
  const study = DEMO_STUDY_ROOMS?.adminOverview() ?? null;

  const countByDay = (isoList, weight = () => 1) => {
    const m = new Map();
    for (const item of isoList) {
      const iso = typeof item === "string" ? item : item.at;
      if (!iso || !inRange(iso)) continue;
      const k = dayKey(new Date(iso));
      m.set(k, (m.get(k) ?? 0) + weight(item));
    }
    return [...m].map(([date, value]) => ({ date, value }));
  };

  const activity = [
    ...reg.events,
    ...(study?.rooms ?? []).map((r) => ({ id: `room-${r.id}`, type: "studyRoom", actor: r.creator, subject: r.title, at: r.createdAt })),
  ];

  return {
    serverTime: new Date(now).toISOString(),
    stats: {
      totalStudents: reg.totalStudents,
      verifiedStudents: reg.verifiedStudents,
      pendingVerifications: reg.pendingVerifications,
      activeSessions: null,
      pendingSessionApprovals: null,
      unresolvedReports: null,
      studyParticipants: study ? study.participants : null,
    },
    series: {
      registrations: countByDay(reg.signups),
      sessions: null,
      studyHours: study ? countByDay(study.sittings.map((s) => ({ at: s.startedAt, seconds: s.seconds })), (s) => s.seconds / 3600) : null,
    },
    popularModules: null,
    activity,
    tasks: {
      verifications: {
        total: reg.pendingVerifications,
        items: reg.pending.slice(0, 4).map((p) => ({
          id: p.id,
          title: p.fullName,
          meta: `Matricule ${p.matricule}${p.attempts > 1 ? ` · attempt ${p.attempts}` : ""}`,
          at: p.submittedAt,
        })),
      },
      sessionApprovals: null,
      reports: null,
    },
  };
}
