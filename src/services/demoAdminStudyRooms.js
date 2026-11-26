import { DEMO_MODE } from "../config/demo.js";
import { ApiError } from "./apiClient.js";

/**
 * DEMO ONLY: realistic mock data for the admin Study With Me pages (/admin/study) until the admin API exists.
 * `null` in production builds unless VITE_DEMO_MODE is set (see config/demo.js).
 *
 * - The platform (rooms, students, sittings, reports) is generated from a fixed seed, so the numbers are stable across
 *   reloads. Times are relative to an `anchor` that moves forward every 2 h so "studying now" stays plausible.
 * - Admin actions (close / reopen, notes, report decisions, removed / warned participants) are stored in localStorage
 *   (`tanawar.demoAdminStudy`) and applied on top of the generated data, the way the server would apply them.
 * - It is separate from the student-side stand-in (demoStudyRooms.js): closing a room here doesn't affect /app/study.
 * Remove this file once the backend exists. Response shapes follow docs/study-with-me-admin.md.
 */

const KEY = "tanawar.demoAdminStudy";
const ANCHOR_MS = 2 * 3600_000;
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/* ───────────── seeded randomness ───────────── */

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, list) => list[Math.floor(r() * list.length)];
const between = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));

/* ───────────── people & rooms ───────────── */

const NAMES = [
  "Amina Khelifi", "Yacine Haddad", "Lina Bouzid", "Sofiane Mebarki", "Rayan Belkacem", "Nour El Houda Saadi",
  "Ines Ferhat", "Karim Ait Ali", "Meriem Boudiaf", "Walid Benali", "Sarah Kaci", "Anis Cherif", "Imane Djebbar",
  "Mehdi Ouali", "Rania Hamidi", "Bilal Zerrouki", "Yasmine Larbi", "Oussama Taleb", "Chaima Bensalem", "Amine Rahmani",
  "Hiba Messaoudi", "Zakaria Toumi", "Khadidja Brahimi", "Islam Mansouri", "Asma Guerfi", "Nassim Amrani",
  "Dounia Slimani", "Adel Bouras", "Feriel Mokrani", "Hamza Benyahia", "Selma Arab", "Riad Zitouni",
];
const LEVELS = ["L1", "L2", "L3", "M1", "M2"];
const DEPARTMENTS = ["Informatique", "Mathématiques", "Électronique", "Génie mécanique", "Génie des procédés"];

const MODULES = [
  "Bases de données", "Analyse 2", "Algorithmique", "Réseaux", "Systèmes d'exploitation", "Génie logiciel",
  "Probabilités", "Électronique", "Thermodynamique", "Anglais technique", "Compilation", "Intelligence artificielle",
];
const TITLES = [
  "Silent revision: {m}", "Pomodoro club · {m}", "Early birds: {m}", "Night owls · {m}", "Exam sprint: {m}",
  "Deep work · {m}", "TD prep: {m}", "Library vibes · {m}", "Final stretch: {m}", "Focus hour · {m}",
];
const DESCRIPTIONS = [
  "Phones face down. 50 min on, 10 min off.",
  "Working through last year's exam papers.",
  "Quiet room, cameras off, just accountability.",
  "Exercises from the TD sheets, one by one.",
  "Revising the course slides chapter by chapter.",
  "",
  "Anyone preparing the rattrapage is welcome.",
  "Long session before the midterm.",
];
const CLOSE_REASONS = [
  "Room title used to advertise a paid tutoring service.",
  "Repeated off-topic and offensive room description reported by several students.",
  "Duplicate of another room created to spam the list.",
  "Inappropriate room name.",
];
const REPORT_REASONS = [
  { reason: "Inappropriate room name", details: "The title contains an insult aimed at a teacher." },
  { reason: "Spam or advertising", details: "The description links to a paid Telegram group for exam answers." },
  { reason: "Harassing another student", details: "Keeps renaming the room to mock one of the participants.", user: true },
  { reason: "Fake study time", details: "This account stays in the room all night without studying to top the ranking.", user: true },
  { reason: "Off-topic room", details: "Nothing to do with the module: used as a gaming lobby." },
  { reason: "Offensive profile picture", details: "The participant's avatar is inappropriate.", user: true },
];

const pad = (n) => String(n).padStart(2, "0");
const iso = (t) => new Date(t).toISOString();

const STUDENTS = NAMES.map((fullName, i) => ({
  id: `mock-st-${i + 1}`,
  fullName,
  matricule: `20${21 + (i % 4)}3101${pad((i * 37) % 100)}${pad((i * 53 + 11) % 100)}`,
  avatarUrl: null,
  level: LEVELS[i % LEVELS.length],
  department: DEPARTMENTS[i % DEPARTMENTS.length],
  accountStatus: i === 13 ? "suspended" : "active",
}));
const studentById = new Map(STUDENTS.map((s) => [s.id, s]));
// Mock students aren't accounts in demoRegistry: profileLinkable: false hides the "Open student profile" links.
const person = (s) => ({ id: s.id, fullName: s.fullName, matricule: s.matricule, avatarUrl: s.avatarUrl, profileLinkable: false });

/** Hour-of-day weights: mornings, afternoons and late evenings are when students study. */
const HOUR_WEIGHTS = [0.2, 0.1, 0, 0, 0, 0.1, 0.4, 0.8, 1.6, 2.2, 2.4, 1.8, 0.9, 1.1, 1.9, 2.3, 2.1, 1.4, 1.1, 1.5, 2.2, 2.4, 1.6, 0.7];
const HOUR_TOTAL = HOUR_WEIGHTS.reduce((a, b) => a + b, 0);
function pickHour(r) {
  let x = r() * HOUR_TOTAL;
  for (let h = 0; h < 24; h++) {
    x -= HOUR_WEIGHTS[h];
    if (x <= 0) return h;
  }
  return 21;
}

/** Generates the platform as of `anchor`. Pure: same anchor → same data. */
function generate(anchor) {
  const r = rng(20261126);
  const today0 = new Date(anchor);
  today0.setHours(0, 0, 0, 0);
  const rooms = [];
  const ROOMS = 46;

  for (let i = 0; i < ROOMS; i++) {
    const module = MODULES[i % MODULES.length];
    const host = STUDENTS[(i * 7 + 3) % STUDENTS.length];
    const ageDays = i < 9 ? between(r, 0, 6) : between(r, 1, 95);
    const kind = i < 9 ? "active" : i >= ROOMS - 4 ? "closed" : "ended";
    const createdAt = Math.min(anchor - 20 * MIN, today0.getTime() - ageDays * DAY + between(r, 7, 21) * HOUR + between(r, 0, 59) * MIN);
    const lifeDays = kind === "active" ? Math.max(1, Math.ceil((anchor - createdAt) / DAY)) : between(r, 1, 18);
    const lastPossible = kind === "active" ? anchor : Math.min(anchor - 2 * HOUR, createdAt + lifeDays * DAY);
    const room = {
      id: `mock-room-${pad(i + 1)}`,
      title: pick(r, TITLES).replace("{m}", module),
      module,
      description: pick(r, DESCRIPTIONS),
      visibility: i % 6 === 4 ? "private" : "public",
      createdAt,
      host,
      kind,
      sittings: [],
      reports: [],
      seededNotes: [],
      seededClose: null,
    };

    // Past sittings, spread over the room's life.
    const regulars = [host, ...Array.from({ length: between(r, 2, 9) }, () => pick(r, STUDENTS))];
    const count = between(r, 6, 48);
    for (let k = 0; k < count; k++) {
      const st = r() < 0.35 ? host : pick(r, regulars);
      const day = createdAt + Math.floor(r() * Math.max(1, lastPossible - createdAt) / DAY) * DAY;
      const d0 = new Date(day);
      d0.setHours(pickHour(r), between(r, 0, 59), 0, 0);
      const start = Math.max(createdAt, d0.getTime());
      const minutes = Math.round(12 + Math.pow(r(), 1.6) * 190);
      const end = Math.min(start + minutes * MIN, lastPossible);
      if (end - start < 5 * MIN) continue;
      room.sittings.push({ studentId: st.id, start, end, reason: r() < 0.85 ? "left" : "timeout" });
    }

    // Students in the room right now.
    if (kind === "active") {
      const here = new Set();
      const n = between(r, 1, i < 3 ? 7 : 4);
      for (let k = 0; k < n; k++) {
        const st = k === 0 ? host : pick(r, STUDENTS);
        if (here.has(st.id)) continue;
        here.add(st.id);
        room.sittings.push({ studentId: st.id, start: anchor - between(r, 4, 150) * MIN, end: null, reason: null });
      }
    }
    room.sittings.sort((a, b) => a.start - b.start);

    if (kind === "closed") {
      const at = Math.max(createdAt + 30 * MIN, lastPossible - between(r, 1, 30) * HOUR);
      room.seededClose = { at, reason: CLOSE_REASONS[i % CLOSE_REASONS.length], by: "Admin TANAWAR" };
    }

    // Reports on some rooms.
    const reported = kind === "closed" || [1, 4, 11, 17, 23, 30].includes(i);
    if (reported) {
      const n = kind === "closed" ? 2 : between(r, 1, 3);
      for (let k = 0; k < n; k++) {
        const def = REPORT_REASONS[(i + k * 2) % REPORT_REASONS.length];
        const others = room.sittings.map((s) => s.studentId).filter((id) => id !== host.id);
        const target = def.user ? studentById.get(others[k % Math.max(1, others.length)] ?? host.id) : null;
        const reporter = STUDENTS[(i * 5 + k * 11 + 1) % STUDENTS.length];
        const at = Math.min(anchor - 10 * MIN, createdAt + between(r, 1, 40) * HOUR);
        const open = kind !== "closed" && (k === 0 || r() < 0.5);
        room.reports.push({
          id: `${room.id}-rep-${k + 1}`,
          reason: def.reason,
          details: def.details,
          reporter: person(reporter),
          reportedUser: target ? person(target) : null,
          at: iso(at),
          status: open ? "open" : kind === "closed" ? "resolved" : "dismissed",
          resolvedBy: open ? null : "Admin TANAWAR",
          resolvedAt: open ? null : iso(at + 3 * HOUR),
        });
      }
    }
    if (i === 4 || i === ROOMS - 2) {
      room.seededNotes.push({
        id: `${room.id}-note-1`,
        text: i === 4 ? "Host contacted by email about the room name. Watching for a week." : "Same host already warned in October for a similar room.",
        by: "Admin TANAWAR",
        at: iso(Math.min(anchor - HOUR, createdAt + 2 * DAY)),
      });
    }
    rooms.push(room);
  }
  return rooms;
}

/* ───────────── storage (admin decisions) ───────────── */

const emptyState = () => ({ v: 1, anchor: 0, rooms: {}, reports: {} });
function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return raw?.v === 1 ? raw : emptyState();
  } catch {
    return emptyState();
  }
}
function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    throw new ApiError("Demo storage is full. Clear the site data and try again.", { code: "DEMO_STORAGE_FULL" });
  }
}

let cache = { anchor: 0, rooms: null };
function base() {
  const state = load();
  const now = Date.now();
  if (!state.anchor || now - state.anchor > ANCHOR_MS || state.anchor > now) {
    state.anchor = now;
    save(state);
  }
  if (cache.anchor !== state.anchor) cache = { anchor: state.anchor, rooms: generate(state.anchor) };
  return { state, rooms: cache.rooms };
}
const roomState = (state, id) => (state.rooms[id] ??= { events: [], notes: [], removed: {}, close: undefined });

/* ───────────── read model ───────────── */

/** A room with the admin decisions applied: status, sittings cut by a close / removal, reports, activity. */
function materialize(room, state, now) {
  const rs = state.rooms[room.id] ?? { events: [], notes: [], removed: {} };
  const close = rs.close === undefined ? room.seededClose : rs.close; // null = reopened
  const cuts = [...(room.seededClose ? [room.seededClose.at] : []), ...rs.events.filter((e) => e.type === "closed").map((e) => new Date(e.at).getTime())];
  const sittings = room.sittings
    .filter((s) => s.start <= now)
    .map((s) => {
      if (s.end != null) return s;
      const removedAt = rs.removed[s.studentId];
      const cut = Math.min(...cuts.filter((c) => c >= s.start), removedAt && removedAt >= s.start ? removedAt : Infinity);
      if (cut !== Infinity) return { ...s, end: cut, reason: removedAt === cut ? "removed" : "room_closed" };
      return s;
    });
  const open = sittings.filter((s) => s.end == null);
  const status = close ? "closed" : open.length ? "active" : "ended";
  const reports = room.reports.map((rep) => ({ ...rep, ...(state.reports[rep.id] ?? {}) }));
  const seconds = (s) => Math.floor(((s.end ?? now) - s.start) / 1000);
  const last = sittings.reduce((m, s) => Math.max(m, s.end ?? now), room.createdAt);
  return {
    room,
    rs,
    close,
    sittings,
    open,
    status,
    reports,
    seconds,
    summary: {
      id: room.id,
      title: room.title,
      module: room.module,
      description: room.description,
      visibility: room.visibility,
      status,
      createdAt: iso(room.createdAt),
      lastActivityAt: iso(last),
      host: person(room.host),
      activeCount: status === "closed" ? 0 : open.length,
      participantCount: new Set(sittings.map((s) => s.studentId)).size,
      totalSeconds: sittings.reduce((sum, s) => sum + seconds(s), 0),
      openReports: reports.filter((x) => x.status === "open").length,
    },
  };
}

function all(now = Date.now()) {
  const { state, rooms } = base();
  return { state, list: rooms.map((r) => materialize(r, state, now)) };
}

function find(id, now = Date.now()) {
  const { state, list } = all(now);
  const m = list.find((x) => x.room.id === id);
  if (!m) throw new ApiError("Study room not found.", { status: 404, code: "ROOM_NOT_FOUND" });
  return { state, m };
}

/* ───────────── endpoints ───────────── */

function list(q) {
  const now = Date.now();
  const text = (q.q ?? "").toLowerCase();
  const host = (q.host ?? "").toLowerCase();
  const fromT = q.from ? new Date(`${q.from}T00:00`).getTime() : null;
  const toT = q.to ? new Date(`${q.to}T23:59:59.999`).getTime() : null;
  const rows = all(now)
    .list.map((m) => m.summary)
    .filter(
      (s) =>
        (!text || [s.title, s.description, s.module].some((v) => v?.toLowerCase().includes(text))) &&
        (!host || [s.host.fullName, s.host.matricule].some((v) => v?.toLowerCase().includes(host))) &&
        (!q.status || s.status === q.status) &&
        (!q.visibility || s.visibility === q.visibility) &&
        (!q.module || s.module === q.module) &&
        (fromT == null || new Date(s.createdAt).getTime() >= fromT) &&
        (toT == null || new Date(s.createdAt).getTime() <= toT) &&
        (!q.reported || s.openReports > 0)
    );
  const key = {
    title: (s) => s.title.toLowerCase(),
    participants: (s) => s.activeCount * 1000 + s.participantCount,
    totalSeconds: (s) => s.totalSeconds,
    lastActivityAt: (s) => s.lastActivityAt,
    createdAt: (s) => s.createdAt,
  }[q.sort] ?? ((s) => s.createdAt);
  const dir = q.order === "asc" ? 1 : -1;
  rows.sort((a, b) => {
    const x = key(a);
    const y = key(b);
    return (x < y ? -1 : x > y ? 1 : 0) * dir || a.id.localeCompare(b.id);
  });
  const start = (q.page - 1) * q.pageSize;
  return {
    serverTime: iso(now),
    items: rows.slice(start, start + q.pageSize),
    total: rows.length,
    page: q.page,
    pageSize: q.pageSize,
    facets: { modules: [...MODULES].sort((a, b) => a.localeCompare(b)) },
    visibilityAvailable: true,
  };
}

function overview() {
  const now = Date.now();
  const rows = all(now).list;
  const studying = new Set(rows.filter((m) => m.status === "active").flatMap((m) => m.open.map((s) => s.studentId)));
  return {
    serverTime: iso(now),
    totalRooms: rows.length,
    activeRooms: rows.filter((m) => m.status === "active").length,
    studyingNow: studying.size,
    totalSeconds: rows.reduce((sum, m) => sum + m.summary.totalSeconds, 0),
    reportedRooms: rows.filter((m) => m.summary.openReports > 0).length,
    openReports: rows.reduce((sum, m) => sum + m.summary.openReports, 0),
  };
}

const dayKey = (t) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const mondayOf = (t) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
};

function analytics(days) {
  const now = Date.now();
  const rows = all(now).list;
  const today0 = new Date(now);
  today0.setHours(0, 0, 0, 0);
  const from = today0.getTime() - (days - 1) * DAY;
  const weeksFrom = mondayOf(now) - 11 * 7 * DAY;

  const dayIndex = new Map();
  const daily = Array.from({ length: days }, (_, i) => {
    const t = from + i * DAY;
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    dayIndex.set(dayKey(d), i);
    return { date: dayKey(d), seconds: 0, sittings: 0, students: new Set() };
  });
  const weekly = Array.from({ length: 12 }, (_, i) => ({ weekStart: dayKey(weeksFrom + i * 7 * DAY + 12 * HOUR), students: new Set() }));
  const grid = Array.from({ length: 7 }, () => Array(12).fill(0)); // Mon..Sun × 2-hour bands
  const perRoom = [];
  let sittingSeconds = 0;
  let sittingCount = 0;

  for (const m of rows) {
    let roomSeconds = 0;
    const roomStudents = new Set();
    for (const s of m.sittings) {
      const end = s.end ?? now;
      if (end >= weeksFrom) {
        const w = Math.floor((mondayOf(s.start) - weeksFrom) / (7 * DAY));
        if (w >= 0 && w < 12) weekly[w].students.add(s.studentId);
      }
      if (end < from) continue;
      const secs = Math.floor((end - Math.max(s.start, from)) / 1000);
      const day = daily[dayIndex.get(dayKey(Math.max(s.start, from)))];
      if (day) {
        day.seconds += secs;
        day.sittings += 1;
        day.students.add(s.studentId);
      }
      roomSeconds += secs;
      roomStudents.add(s.studentId);
      sittingSeconds += secs;
      sittingCount += 1;
      // Spread the sitting over the hours it covers.
      for (let t = Math.max(s.start, from); t < end; ) {
        const d = new Date(t);
        const next = Math.min(end, new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours() + 1).getTime());
        grid[(d.getDay() + 6) % 7][Math.floor(d.getHours() / 2)] += (next - t) / 1000;
        t = next;
      }
    }
    if (roomSeconds > 0) perRoom.push({ id: m.room.id, title: m.room.title, module: m.room.module, status: m.status, seconds: roomSeconds, students: roomStudents.size });
  }

  return {
    serverTime: iso(now),
    days,
    hours: daily.map((d) => ({ date: d.date, seconds: d.seconds })),
    dailyActive: daily.map((d) => ({ date: d.date, students: d.students.size })),
    weeklyActive: weekly.map((w) => ({ weekStart: w.weekStart, students: w.students.size })),
    periods: grid.map((row) => row.map((v) => Math.round(v))),
    averageSittingSeconds: sittingCount ? Math.round(sittingSeconds / sittingCount) : null,
    averageByDay: daily.map((d) => ({ date: d.date, seconds: d.sittings ? Math.round(d.seconds / d.sittings) : 0 })),
    sittings: sittingCount,
    topRooms: perRoom.sort((a, b) => b.seconds - a.seconds).slice(0, 6),
  };
}

const ACTIVITY_LIMIT = 60;

function detail(id) {
  const now = Date.now();
  const { m } = find(id, now);
  const { room, rs, sittings, reports, close, seconds } = m;

  const byStudent = new Map();
  for (const s of sittings) {
    const p = byStudent.get(s.studentId) ?? { seconds: 0, sittings: 0, open: null, lastSeen: 0, first: s.start };
    p.seconds += seconds(s);
    p.sittings += 1;
    if (s.end == null) p.open = s;
    p.lastSeen = Math.max(p.lastSeen, s.end ?? now);
    byStudent.set(s.studentId, p);
  }
  const participants = [...byStudent.entries()]
    .map(([sid, p]) => {
      const st = studentById.get(sid);
      return {
        ...person(st),
        level: st.level,
        active: Boolean(p.open),
        seconds: p.seconds,
        sittingSeconds: p.open ? seconds(p.open) : 0,
        sittings: p.sittings,
        joinedAt: p.open ? iso(p.open.start) : null,
        lastSeenAt: iso(p.lastSeen),
        warned: rs.events.some((e) => e.type === "user_warned" && e.studentId === sid),
      };
    })
    .sort((a, b) => Number(b.active) - Number(a.active) || b.seconds - a.seconds);

  const name = (sid) => studentById.get(sid)?.fullName ?? "A student";
  const activity = [
    { id: `${room.id}-created`, type: "created", by: room.host.fullName, at: iso(room.createdAt) },
    ...sittings.flatMap((s, k) => [
      { id: `${room.id}-j${k}`, type: "joined", by: name(s.studentId), at: iso(s.start) },
      ...(s.end != null ? [{ id: `${room.id}-l${k}`, type: s.reason === "timeout" ? "timeout" : s.reason === "removed" ? "participant_removed_auto" : s.reason === "room_closed" ? "left_room_closed" : "left", by: name(s.studentId), at: iso(s.end), seconds: seconds(s) }] : []),
    ]).filter((e) => e.type !== "participant_removed_auto" && e.type !== "left_room_closed"),
    ...(room.seededClose ? [{ id: `${room.id}-closed`, type: "closed", by: room.seededClose.by, at: iso(room.seededClose.at), reason: room.seededClose.reason }] : []),
    ...room.reports.map((rep) => ({ id: `${rep.id}-in`, type: "reported", by: rep.reporter.fullName, at: rep.at, reason: rep.reason })),
    ...rs.events,
  ].sort((a, b) => String(b.at).localeCompare(String(a.at)));

  const host = room.host;
  const hostRooms = cache.rooms.filter((r) => r.host.id === host.id);
  return {
    serverTime: iso(now),
    ...m.summary,
    closedAt: close ? iso(close.at) : null,
    closedReason: close?.reason ?? null,
    closedBy: close?.by ?? null,
    host: {
      ...person(host),
      level: host.level,
      department: host.department,
      accountStatus: host.accountStatus,
      roomsCreated: hostRooms.length,
      totalSeconds: hostRooms.flatMap((r) => r.sittings).filter((s) => s.studentId === host.id).reduce((sum, s) => sum + Math.floor(((s.end ?? now) - s.start) / 1000), 0),
    },
    participants,
    activity: activity.slice(0, ACTIVITY_LIMIT),
    activityTruncated: activity.length > ACTIVITY_LIMIT,
    reports: [...reports].sort((a, b) => String(b.at).localeCompare(String(a.at))),
    notes: [...room.seededNotes, ...rs.notes].sort((a, b) => String(b.at).localeCompare(String(a.at))),
  };
}

function reportQueue(status) {
  const rows = all().list;
  const items = rows
    .flatMap((m) => m.reports.map((rep) => ({ ...rep, room: { id: m.room.id, title: m.room.title, module: m.room.module, status: m.status, host: person(m.room.host) } })))
    .filter((rep) => !status || rep.status === status)
    .sort((a, b) => (status === "open" ? String(a.at).localeCompare(String(b.at)) : String(b.at).localeCompare(String(a.at))));
  return { serverTime: iso(Date.now()), items, total: items.length };
}

/* ───────────── mutations ───────────── */

const uid = () => Math.random().toString(36).slice(2, 10);

function act(id, action, { reason = "", by }) {
  const now = Date.now();
  const { state, m } = find(id, now);
  const rs = roomState(state, id);
  if (action === "close") {
    if (m.status === "closed") throw new ApiError("Already closed.", { status: 409, code: "INVALID_TRANSITION" });
    rs.close = { at: now, reason, by };
    rs.events.push({ id: uid(), type: "closed", by, at: iso(now), reason, ended: m.open.length });
  } else if (action === "reopen") {
    if (m.status !== "closed") throw new ApiError("Not closed.", { status: 409, code: "INVALID_TRANSITION" });
    rs.close = null;
    rs.events.push({ id: uid(), type: "reopened", by, at: iso(now), reason: reason || null });
  }
  save(state);
}

function participantAct(id, studentId, action, { reason, by }) {
  const now = Date.now();
  const { state, m } = find(id, now);
  const st = studentById.get(studentId);
  if (!st) throw new ApiError("Student not found.", { status: 404, code: "NOT_FOUND" });
  const rs = roomState(state, id);
  if (action === "remove") {
    if (!m.open.some((s) => s.studentId === studentId)) throw new ApiError("Not in the room any more.", { status: 409, code: "NOT_IN_ROOM" });
    rs.removed[studentId] = now;
    rs.events.push({ id: uid(), type: "participant_removed", by, at: iso(now), reason, studentId: studentId, target: st.fullName });
  } else {
    rs.events.push({ id: uid(), type: "user_warned", by, at: iso(now), reason, studentId: studentId, target: st.fullName });
  }
  save(state);
}

function addNote(id, text, by) {
  const { state } = find(id);
  const note = { id: uid(), text, by, at: iso(Date.now()) };
  const rs = roomState(state, id);
  rs.notes.push(note);
  rs.events.push({ id: uid(), type: "note_added", by, at: note.at });
  save(state);
  return note;
}

function answerReport(id, reportId, decision, { note, by }) {
  const { state, m } = find(id);
  const rep = m.reports.find((x) => x.id === reportId);
  if (!rep) throw new ApiError("Report not found.", { status: 404, code: "NOT_FOUND" });
  if (rep.status !== "open") throw new ApiError("Already handled.", { status: 409, code: "INVALID_TRANSITION" });
  const at = iso(Date.now());
  state.reports[reportId] = { status: decision === "resolve" ? "resolved" : "dismissed", resolvedBy: by, resolvedAt: at, resolution: note || null };
  roomState(state, id).events.push({ id: uid(), type: decision === "resolve" ? "report_resolved" : "report_dismissed", by, at, reason: note || rep.reason });
  save(state);
}

/** Clears every admin decision made in the demo (the generated platform stays the same). */
function reset() {
  localStorage.removeItem(KEY);
  cache = { anchor: 0, rooms: null };
}

export const DEMO_ADMIN_STUDY = DEMO_MODE
  ? { list, overview, analytics, detail, reportQueue, act, participantAct, addNote, answerReport, reset }
  : null;
