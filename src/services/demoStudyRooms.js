import { ApiError, isApiConfigured } from "./apiClient.js";
import { getSession, isVerified } from "./authService.js";

/**
 * DEV ONLY: an in-browser stand-in for the Study With Me backend, so rooms, timers and real-time updates can be
 * tried with `npm run dev` before the API exists (open two tabs, sign in as two demo students, study together).
 *
 * - Active only in dev builds AND while VITE_API_URL is unset. `DEMO_STUDY_ROOMS` is `null` in production builds.
 * - It follows the server rules of docs/study-with-me.md on purpose (one clock, heartbeats, expiry at the last
 *   heartbeat, idempotent join, one open sitting per student), so the UI is exercised against the real behaviour.
 *   `Date.now()` plays the server clock; localStorage plays the database; BroadcastChannel plays the push channel.
 * - A few simulated students keep the demo rooms alive. They are flagged `simulated` and never exist on the server.
 * Remove this file once the backend exists.
 */

const KEY = "tanawar.demoStudyRooms";
const CHANNEL = "tanawar.demoStudyRooms";
const SESSION_TIMEOUT_MS = 90_000; // no heartbeat for this long → the sitting ends at its last heartbeat
const ROOM_IDLE_MS = 24 * 3600_000; // rooms with nobody studying for a day drop out of the list
const MAX_ROOMS_PER_DAY = 3;
const SIM_REFRESH_MS = 4 * 3600_000;

const MIN = 60_000;
const HOUR = 60 * MIN;

/* ───────────── storage ("database") ───────────── */

const load = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return raw?.v === 1 ? raw : null;
  } catch {
    return null;
  }
};

let channel = null;
const getChannel = () => {
  if (!channel && typeof BroadcastChannel !== "undefined") channel = new BroadcastChannel(CHANNEL);
  return channel;
};

const save = (state) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    throw new ApiError("Demo storage is full. Clear the site data and try again.", { code: "DEMO_STORAGE_FULL" });
  }
  getChannel()?.postMessage("changed"); // other tabs refetch (the "push" event)
};

const uid = () => Math.random().toString(36).slice(2, 10);

/* ───────────── simulated students ───────────── */

const SIM = {
  amina: { id: "sim-amina", fullName: "Amina Khelifi" },
  yacine: { id: "sim-yacine", fullName: "Yacine Haddad" },
  lina: { id: "sim-lina", fullName: "Lina Bouzid" },
  sofiane: { id: "sim-sofiane", fullName: "Sofiane Mebarki" },
  rayan: { id: "sim-rayan", fullName: "Rayan Belkacem" },
  nour: { id: "sim-nour", fullName: "Nour El Houda Saadi" },
  ines: { id: "sim-ines", fullName: "Ines Ferhat" },
  karim: { id: "sim-karim", fullName: "Karim Ait Ali" },
};

const SIM_ROOMS = [
  {
    id: "demo-bdd",
    title: "Silent revision: SQL & normalisation",
    module: "Bases de données",
    description: "Phones face down. Exercises from TD 4 and 5.",
    creator: SIM.amina,
    // [student, minutes ago joined, minutes studied (null = still studying)]
    sittings: [[SIM.amina, 80, null], [SIM.yacine, 35, null], [SIM.lina, 125, null], [SIM.sofiane, 300, 90]],
  },
  {
    id: "demo-analyse",
    title: "Early birds: Analyse 2",
    module: "Analyse 2",
    description: "Series and integrals before the midterm.",
    creator: SIM.rayan,
    sittings: [[SIM.rayan, 50, null], [SIM.nour, 240, 40]],
  },
  {
    id: "demo-reseaux",
    title: "Réseaux exam prep",
    module: "Réseaux",
    description: "",
    creator: SIM.ines,
    sittings: [[SIM.ines, 400, 120], [SIM.karim, 260, 60]],
  },
];

/** (Re)creates the simulated sittings relative to now, keeping every real room and sitting. */
function simulate(state, now) {
  if (state.simulatedAt && now - state.simulatedAt < SIM_REFRESH_MS) return state;
  const sessions = state.sessions.filter((s) => !s.simulated);
  const rooms = state.rooms.filter((r) => !r.simulated);
  for (const r of SIM_ROOMS) {
    rooms.push({ id: r.id, title: r.title, module: r.module, description: r.description, creator: r.creator, createdAt: now - 8 * HOUR, simulated: true });
    for (const [student, ago, studied] of r.sittings) {
      const joinedAt = now - ago * MIN;
      sessions.push({
        id: uid(),
        roomId: r.id,
        student,
        joinedAt,
        lastBeat: studied === null ? null : joinedAt + studied * MIN,
        leftAt: studied === null ? null : joinedAt + studied * MIN,
        endReason: studied === null ? null : "left",
        simulated: true,
      });
    }
  }
  return { ...state, rooms, sessions, simulatedAt: now };
}

/**
 * Reads the store and applies the server's background rules: sittings without a heartbeat for SESSION_TIMEOUT_MS
 * end at their LAST heartbeat (abandoned time is never counted). Saves if anything changed.
 */
function read(now) {
  let state = load() ?? { v: 1, rooms: [], sessions: [] };
  const before = JSON.stringify(state);
  state = simulate(state, now);
  for (const s of state.sessions) {
    if (!s.leftAt && !s.simulated && now - s.lastBeat > SESSION_TIMEOUT_MS) {
      s.leftAt = s.lastBeat;
      s.endReason = "timeout";
    }
  }
  if (JSON.stringify(state) !== before) save(state);
  return state;
}

/* ───────────── auth (the server reads this from the Bearer token) ───────────── */

function me() {
  const user = getSession()?.user;
  if (!user) throw new ApiError("Your session has expired. Please sign in again.", { status: 401, code: "UNAUTHORIZED" });
  if (user.role !== "student" || !isVerified(user)) {
    throw new ApiError("Your registration hasn't been approved yet.", { status: 403, code: "VERIFICATION_PENDING" });
  }
  return { id: user.id ?? `m-${user.matricule}`, fullName: user.fullName ?? "Student", avatarUrl: user.avatarUrl ?? null };
}

/* ───────────── read models (same shapes as the API) ───────────── */

const dur = (s, now) => Math.max(0, Math.floor(((s.leftAt ?? now) - s.joinedAt) / 1000));
const person = ({ id, fullName, avatarUrl }) => ({ id, fullName, avatarUrl: avatarUrl ?? null });

function participantsOf(state, roomId, now) {
  const byStudent = new Map();
  for (const s of state.sessions) {
    if (s.roomId !== roomId) continue;
    const p = byStudent.get(s.student.id) ?? { ...person(s.student), seconds: 0, active: false, sittingSeconds: 0, lastSeenAt: 0 };
    p.seconds += dur(s, now);
    if (!s.leftAt) {
      p.active = true;
      p.sittingSeconds = dur(s, now);
    }
    p.lastSeenAt = Math.max(p.lastSeenAt, s.leftAt ?? now);
    byStudent.set(s.student.id, p);
  }
  return [...byStudent.values()]
    .map((p) => ({ ...p, lastSeenAt: new Date(p.lastSeenAt).toISOString() }))
    .sort((a, b) => b.seconds - a.seconds);
}

function summaryOf(state, room, now) {
  const participants = participantsOf(state, room.id, now);
  const active = participants.filter((p) => p.active);
  return {
    id: room.id,
    title: room.title,
    module: room.module,
    description: room.description ?? "",
    createdAt: new Date(room.createdAt).toISOString(),
    creator: person(room.creator),
    activeCount: active.length,
    totalSeconds: participants.reduce((n, p) => n + p.seconds, 0),
    participants: active.slice(0, 6).map(({ id, fullName, avatarUrl, seconds }) => ({ id, fullName, avatarUrl, seconds, active: true })),
  };
}

const lastActivity = (state, room, now) =>
  Math.max(room.createdAt, ...state.sessions.filter((s) => s.roomId === room.id).map((s) => s.leftAt ?? now));

function detailOf(state, roomId, user, now) {
  const room = state.rooms.find((r) => r.id === roomId);
  if (!room) throw new ApiError("This study room doesn’t exist anymore.", { status: 404, code: "ROOM_NOT_FOUND" });
  const participants = participantsOf(state, roomId, now);
  const mine = participants.find((p) => p.id === user.id);
  const { participants: _preview, ...summary } = summaryOf(state, room, now);
  return {
    serverTime: new Date(now).toISOString(),
    room: summary,
    participants,
    me: { inRoom: Boolean(mine?.active), seconds: mine?.seconds ?? 0, sittingSeconds: mine?.sittingSeconds ?? 0 },
  };
}

/* ───────────── personal statistics ───────────── */

const pad = (n) => String(n).padStart(2, "0");
const dayKey = (t) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const midnight = (t) => {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};
const nextMidnight = (t) => {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
};

/** Seconds studied per calendar day; sittings that cross midnight are split between the two days. */
function perDay(sessions, now) {
  const days = new Map();
  for (const s of sessions) {
    let from = s.joinedAt;
    const to = s.leftAt ?? now;
    while (from < to) {
      const end = Math.min(to, nextMidnight(from));
      days.set(dayKey(from), (days.get(dayKey(from)) ?? 0) + Math.floor((end - from) / 1000));
      from = end;
    }
  }
  return days;
}

function statsOf(state, user, now) {
  const mine = state.sessions.filter((s) => s.student.id === user.id);
  const days = perDay(mine, now);
  const today = midnight(now);
  const monday = today - ((new Date(today).getDay() + 6) % 7) * 24 * HOUR;
  const dayAt = (offset) => new Date(new Date(today).setDate(new Date(today).getDate() + offset)).getTime();

  let weekSeconds = 0;
  for (let t = monday; t <= today; t = nextMidnight(t)) weekSeconds += days.get(dayKey(t)) ?? 0;

  const STREAK_MIN_SECONDS = 60;
  let cursor = (days.get(dayKey(today)) ?? 0) >= STREAK_MIN_SECONDS ? 0 : -1;
  let streakDays = 0;
  while ((days.get(dayKey(dayAt(cursor))) ?? 0) >= STREAK_MIN_SECONDS) {
    streakDays += 1;
    cursor -= 1;
  }

  const open = mine.find((s) => !s.leftAt);
  const openRoom = open && state.rooms.find((r) => r.id === open.roomId);
  return {
    serverTime: new Date(now).toISOString(),
    active: open ? { roomId: open.roomId, roomTitle: openRoom?.title ?? "", sittingSeconds: dur(open, now) } : null,
    todaySeconds: days.get(dayKey(today)) ?? 0,
    weekSeconds,
    totalSeconds: mine.reduce((n, s) => n + dur(s, now), 0),
    longestSittingSeconds: mine.reduce((n, s) => Math.max(n, dur(s, now)), 0),
    bestDaySeconds: Math.max(0, ...days.values()),
    sittings: mine.length,
    streakDays,
    last7: Array.from({ length: 7 }, (_, i) => {
      const t = dayAt(i - 6);
      return { date: dayKey(t), seconds: days.get(dayKey(t)) ?? 0 };
    }),
  };
}

/* ───────────── endpoints ───────────── */

function createDemoStudyRooms() {
  return {
    active: () => !isApiConfigured(),

    /** Other tabs changed the store (stands in for the server's push channel). Returns an unsubscribe function. */
    onRemoteChange(cb) {
      // A second channel object: a BroadcastChannel never receives its own messages, and this tab must hear the others.
      const ch = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL) : null;
      if (ch) {
        ch.addEventListener("message", cb);
        return () => ch.close();
      }
      // Fallback (no BroadcastChannel): storage events, which heartbeats also trigger, so slightly chattier.
      const onStorage = (e) => e.key === KEY && cb();
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    },

    // GET /study-rooms
    list() {
      const user = me();
      const now = Date.now();
      const state = read(now);
      const rooms = state.rooms
        .filter((r) => lastActivity(state, r, now) > now - ROOM_IDLE_MS)
        .map((r) => summaryOf(state, r, now))
        .sort((a, b) => b.activeCount - a.activeCount || b.totalSeconds - a.totalSeconds);
      const open = state.sessions.find((s) => s.student.id === user.id && !s.leftAt);
      return { serverTime: new Date(now).toISOString(), myActiveRoomId: open?.roomId ?? null, rooms };
    },

    // GET /study-rooms/:id
    get(roomId) {
      const user = me();
      const now = Date.now();
      return detailOf(read(now), roomId, user, now);
    },

    // POST /study-rooms
    create({ title, module, description }) {
      const user = me();
      const now = Date.now();
      const state = read(now);
      const recent = state.rooms.filter((r) => r.creator.id === user.id && r.createdAt > now - 24 * HOUR).length;
      if (recent >= MAX_ROOMS_PER_DAY) {
        throw new ApiError(`You can open up to ${MAX_ROOMS_PER_DAY} rooms a day. Join an existing one instead.`, { status: 429, code: "ROOM_LIMIT" });
      }
      const room = { id: uid(), title, module, description: description ?? "", creator: person(user), createdAt: now };
      state.rooms.push(room);
      save(state);
      return { serverTime: new Date(now).toISOString(), room: summaryOf(state, room, now) };
    },

    // POST /study-rooms/:id/join — idempotent; closes an open sitting in another room ("switched").
    join(roomId) {
      const user = me();
      const now = Date.now();
      const state = read(now);
      if (!state.rooms.some((r) => r.id === roomId)) throw new ApiError("This study room doesn’t exist anymore.", { status: 404, code: "ROOM_NOT_FOUND" });
      const open = state.sessions.find((s) => s.student.id === user.id && !s.leftAt);
      if (open?.roomId === roomId) {
        open.lastBeat = now; // already studying here: no duplicate sitting
      } else {
        if (open) Object.assign(open, { leftAt: now, endReason: "switched" });
        state.sessions.push({ id: uid(), roomId, student: person(user), joinedAt: now, lastBeat: now, leftAt: null, endReason: null });
      }
      save(state);
      return detailOf(state, roomId, user, now);
    },

    // POST /study-rooms/:id/leave — idempotent.
    leave(roomId) {
      const user = me();
      const now = Date.now();
      const state = read(now);
      const open = state.sessions.find((s) => s.student.id === user.id && s.roomId === roomId && !s.leftAt);
      if (open) {
        Object.assign(open, { leftAt: now, endReason: "left" });
        save(state);
      }
      return detailOf(state, roomId, user, now);
    },

    // POST /study-rooms/:id/heartbeat
    heartbeat(roomId) {
      const user = me();
      const now = Date.now();
      const state = read(now);
      const open = state.sessions.find((s) => s.student.id === user.id && s.roomId === roomId && !s.leftAt);
      if (!open) throw new ApiError("You’re no longer in this room.", { status: 409, code: "NOT_IN_ROOM" });
      open.lastBeat = now;
      localStorage.setItem(KEY, JSON.stringify(state)); // heartbeats don't change what others see: no broadcast
      return { serverTime: new Date(now).toISOString(), inRoom: true };
    },

    // GET /study-rooms/me/stats
    stats() {
      const user = me();
      const now = Date.now();
      return statsOf(read(now), user, now);
    },
  };
}

export const DEMO_STUDY_ROOMS = import.meta.env.DEV ? createDemoStudyRooms() : null;
