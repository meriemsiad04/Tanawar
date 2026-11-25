import { getSession } from "./authService.js";
import { getAttendance, getHostedSessions, getRating } from "./profileService.js";
import { listResources } from "./resourcesService.js";

/**
 * Activity & Consistency: built only from the student's real records, combined from existing endpoints
 * (no endpoint of its own yet, nothing estimated or invented):
 *   GET /students/me/attendance?from=   → [{ date, count, minutes?, sessions?: [{ id, title }] }]  sessions attended per day
 *   GET /students/me/hosted-sessions    → [{ id, title, module, startsAt, durationMin, booked, status }]
 *   GET /students/me/rating             → { average, count, reviews: [{ id, rating, comment, author, createdAt }] }
 *   GET /resources                      → [{ id, title, kind, module, author: { id }, sharedAt?, session? }]  (the student's own = author.id)
 * Optional fields the backend should add for richer stats: attendance `minutes` (learning hours from attended
 * sessions) and `sessions` (titles in the timeline), resource `sharedAt` (shared resources on the calendar).
 * Missing optional fields are left out of the numbers, never guessed; `hoursComplete` says whether attended
 * minutes were known.
 * A future single endpoint (GET /students/me/activity) can replace this composition without changing the page.
 */

const pad = (n) => String(n).padStart(2, "0");
export const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const keyOf = (iso) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : dayKey(new Date(iso)));
const parseKey = (k) => new Date(`${k}T00:00:00`);
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Hosted sessions that actually took place (or are running now) count as activity; scheduled / cancelled don't. */
const HAPPENED = new Set(["completed", "ended", "live"]);

const settle = (p) => p.then((value) => ({ ok: true, value }), (error) => ({ ok: false, error }));

/** Loads every source in parallel. Throws only if all of them fail; otherwise `failed` lists what's missing. */
export async function getActivity(now = new Date()) {
  const from = dayKey(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate() + 1));
  const [attendance, hosted, rating, resources] = await Promise.all([
    settle(getAttendance(from)),
    settle(getHostedSessions()),
    settle(getRating()),
    settle(listResources()),
  ]);
  const sources = { attendance, hosted, rating, resources };
  const failed = Object.entries(sources).filter(([, r]) => !r.ok).map(([name]) => name);
  if (failed.length === 4) throw attendance.error;

  const me = getSession()?.user?.id;
  const own = (resources.ok ? resources.value ?? [] : []).filter((r) => r.author?.id === "me" || (me && r.author?.id === me));
  return buildActivity(
    {
      attendance: attendance.ok ? attendance.value ?? [] : [],
      hosted: hosted.ok ? hosted.value ?? [] : [],
      rating: rating.ok ? rating.value : null,
      resources: own,
    },
    { now, from, failed }
  );
}

/** Pure: raw records → everything the page shows. Exported so it can be tested / reused with a future endpoint. */
export function buildActivity({ attendance, hosted, rating, resources }, { now = new Date(), from, failed = [] } = {}) {
  const days = new Map(); // dayKey → { attended, hosted, shared, minutes }
  const day = (k) => {
    if (!days.has(k)) days.set(k, { attended: 0, hosted: 0, shared: 0, minutes: 0 });
    return days.get(k);
  };
  const events = [];
  const hoursComplete = attendance.length === 0 || attendance.every((a) => Number.isFinite(a.minutes));

  for (const a of attendance) {
    if (!a.count) continue;
    const d = day(keyOf(a.date));
    d.attended += a.count;
    if (Number.isFinite(a.minutes)) d.minutes += a.minutes;
    events.push({ id: `att-${a.date}`, type: "attended", at: parseKey(keyOf(a.date)).toISOString(), count: a.count, sessions: a.sessions ?? [] });
  }

  const happened = hosted.filter((s) => HAPPENED.has(String(s.status).toLowerCase()) && new Date(s.startsAt) <= now);
  for (const s of happened) {
    const d = day(keyOf(s.startsAt));
    d.hosted += 1;
    if (String(s.status).toLowerCase() !== "live") d.minutes += s.durationMin ?? 0;
    events.push({ id: `host-${s.id}`, type: "hosted", at: s.startsAt, title: s.title, module: s.module, durationMin: s.durationMin, booked: s.booked, live: String(s.status).toLowerCase() === "live" });
  }

  for (const r of resources) {
    if (!r.sharedAt) continue; // undated resources still count in the totals, but can't be placed in time
    day(keyOf(r.sharedAt)).shared += 1;
    events.push({ id: `res-${r.id}`, type: "shared", at: r.sharedAt, title: r.title, module: r.module, kind: r.kind });
  }

  for (const rv of rating?.reviews ?? []) {
    events.push({ id: `rev-${rv.id}`, type: "review", at: rv.createdAt, author: rv.author, rating: rv.rating, comment: rv.comment });
  }

  events.sort((a, b) => new Date(b.at) - new Date(a.at));

  const activeKeys = new Set([...days].filter(([, d]) => d.attended + d.hosted + d.shared > 0).map(([k]) => k));
  const totalMinutes = [...days.values()].reduce((m, d) => m + d.minutes, 0);
  const streaks = computeStreaks(activeKeys, now);

  const totals = {
    attended: [...days.values()].reduce((n, d) => n + d.attended, 0),
    hosted: happened.length,
    learningHours: Math.round((totalMinutes / 60) * 10) / 10,
    resourcesShared: resources.length,
    reviews: rating?.count ?? (rating?.reviews ?? []).length,
    rating: rating?.count ? Number(rating.average) : null,
  };

  return {
    from,
    failed,
    hoursComplete,
    days,
    heatmap: [...days].map(([date, d]) => ({ date, count: d.attended + d.hosted + d.shared })),
    events,
    totals,
    streaks,
    weekly: series(days, now, "week", 12),
    monthly: series(days, now, "month", 12),
    achievements: achievementsFor(totals, streaks),
    isEmpty: activeKeys.size === 0 && totals.resourcesShared === 0 && totals.reviews === 0,
  };
}

/**
 * Streaks from actual activity dates (attending, hosting or sharing), not logins.
 * current: consecutive active days ending today; if today has no activity yet, ending yesterday (the streak is
 * still alive until the day is over). longest: best run ever. activeDays: number of active days.
 */
export function computeStreaks(activeKeys, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let cursor = activeKeys.has(dayKey(today)) ? today : addDays(today, -1);
  let current = 0;
  while (activeKeys.has(dayKey(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  let longest = 0;
  let run = 0;
  let prev = null;
  for (const k of [...activeKeys].sort()) {
    const d = parseKey(k);
    run = prev && dayKey(addDays(prev, 1)) === k ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }

  const monthPrefix = dayKey(today).slice(0, 7);
  return {
    current,
    longest,
    activeDays: activeKeys.size,
    activeThisMonth: [...activeKeys].filter((k) => k.startsWith(monthPrefix)).length,
    activeToday: activeKeys.has(dayKey(today)),
    lastActive: [...activeKeys].sort().at(-1) ?? null,
  };
}

/** Last `n` weeks (Monday start) or months, oldest first: sessions (attended + hosted) and hours per bucket. */
export function series(days, now, unit, n) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const buckets = [];
  for (let i = n - 1; i >= 0; i--) {
    let start, end, label, long;
    if (unit === "week") {
      const monday = addDays(today, -((today.getDay() + 6) % 7) - i * 7);
      start = monday;
      end = addDays(monday, 7);
      label = monday.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      long = `Week of ${monday.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`;
    } else {
      start = new Date(today.getFullYear(), today.getMonth() - i, 1);
      end = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
      label = start.toLocaleDateString("en-GB", { month: "short" });
      long = start.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    }
    buckets.push({ start, end, label, long, sessions: 0, minutes: 0, activeDays: 0 });
  }
  for (const [k, d] of days) {
    const date = parseKey(k);
    const b = buckets.find((x) => date >= x.start && date < x.end);
    if (!b) continue;
    b.sessions += d.attended + d.hosted;
    b.minutes += d.minutes;
    if (d.attended + d.hosted + d.shared > 0) b.activeDays += 1;
  }
  return buckets.map(({ label, long, sessions, minutes, activeDays }) => ({ label, long, sessions, hours: Math.round((minutes / 60) * 10) / 10, activeDays }));
}

/**
 * Milestones. Targets are rules (not statistics); progress and unlocked state come from the student's real totals.
 * Groups: learning, teaching, consistency, community.
 */
const ACHIEVEMENTS = [
  { id: "attend-1", group: "Learning", icon: "cap", title: "First steps", text: "Attend your first session", metric: "attended", target: 1 },
  { id: "attend-10", group: "Learning", icon: "cap", title: "Regular", text: "Attend 10 sessions", metric: "attended", target: 10 },
  { id: "attend-50", group: "Learning", icon: "cap", title: "Dedicated learner", text: "Attend 50 sessions", metric: "attended", target: 50 },
  { id: "hours-10", group: "Learning", icon: "clock", title: "Deep focus", text: "Reach 10 learning hours", metric: "learningHours", target: 10 },
  { id: "hours-50", group: "Learning", icon: "clock", title: "Scholar", text: "Reach 50 learning hours", metric: "learningHours", target: 50 },
  { id: "host-1", group: "Teaching", icon: "users", title: "First class", text: "Host your first session", metric: "hosted", target: 1 },
  { id: "host-5", group: "Teaching", icon: "users", title: "Mentor", text: "Host 5 sessions", metric: "hosted", target: 5 },
  { id: "host-20", group: "Teaching", icon: "users", title: "Master tutor", text: "Host 20 sessions", metric: "hosted", target: 20 },
  { id: "streak-3", group: "Consistency", icon: "flame", title: "On a roll", text: "Be active 3 days in a row", metric: "longest", target: 3 },
  { id: "streak-7", group: "Consistency", icon: "flame", title: "Week warrior", text: "Be active 7 days in a row", metric: "longest", target: 7 },
  { id: "streak-30", group: "Consistency", icon: "flame", title: "Unstoppable", text: "Be active 30 days in a row", metric: "longest", target: 30 },
  { id: "days-50", group: "Consistency", icon: "calendar", title: "Habit builder", text: "Be active on 50 different days", metric: "activeDays", target: 50 },
  { id: "share-1", group: "Community", icon: "share", title: "Sharer", text: "Share your first resource", metric: "resourcesShared", target: 1 },
  { id: "share-10", group: "Community", icon: "share", title: "Librarian", text: "Share 10 resources", metric: "resourcesShared", target: 10 },
  { id: "reviews-5", group: "Community", icon: "star", title: "Trusted tutor", text: "Get 5 reviews with a 4.5★ average or more", metric: "trusted", target: 5 },
];

export function achievementsFor(totals, streaks) {
  const value = {
    ...totals,
    longest: streaks.longest,
    activeDays: streaks.activeDays,
    trusted: totals.rating !== null && totals.rating >= 4.5 ? totals.reviews : 0,
  };
  return ACHIEVEMENTS.map((a) => {
    const current = Math.min(value[a.metric] ?? 0, a.target);
    return { ...a, current, unlocked: (value[a.metric] ?? 0) >= a.target };
  });
}
