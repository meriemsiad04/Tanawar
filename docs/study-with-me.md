# Study With Me

Public study rooms where UMBB students study side by side. There is no video, no chat and no meeting: each student sits
at a desk (an illustration), and everyone sees everyone's study time grow. Every student has their own timer.
The **frontend is implemented**. The **backend does not exist yet**: this document is the contract it must implement.
The frontend calls it through `src/services/studyRoomsService.js` once `VITE_API_URL` is set.

## Flow

```
 /app/study  (rooms list · my stats · milestones)          Dashboard → "Study With Me" panel
        │  Join room / Open a study room (creates, then joins)
        ▼
 POST /study-rooms/:id/join ──► open sitting (joined_at = server now)
        │
        ▼
 /app/study/:id  (study hall · my timer · live ranking)
        │  every 20 s: POST /study-rooms/:id/heartbeat (last_heartbeat_at = now)
        │
        ├── Leave ───────────────────► sitting closed at server now         (end_reason = left)
        ├── joins another room ──────► sitting closed at server now         (end_reason = switched)
        └── tab closed / sleep / offline for 90 s
                                    ► sitting closed at LAST HEARTBEAT      (end_reason = timeout)
```

A refresh, or a network drop shorter than 90 s, continues the same sitting: the page reloads, `GET /study-rooms/:id`
still reports `me.inRoom: true`, and heartbeats resume. Nothing is duplicated and no time is lost.

## Frontend map

| Piece | File |
|---|---|
| Rooms list, personal stats, 7-day chart, milestones | `src/pages/Student/study/StudyRoomsP.jsx` |
| Room: study hall, my timer, live ranking | `src/pages/Student/study/StudyRoomP.jsx` |
| Room card | `src/Components/sharedC/StudyRoomCard.jsx` |
| "Open a study room" pop-up | `src/Components/sharedC/CreateStudyRoomModal.jsx` |
| Dashboard panel | `src/Components/sharedC/StudyWithMePanel.jsx` |
| Student-at-desk illustrations (6 poses, theme-aware, deterministic per student) | `src/Components/sharedC/StudyIllustration.jsx` + `.css` |
| API calls, live-time maths, formatting, milestone rules | `src/services/studyRoomsService.js` |
| Polling + change events (`useLiveQuery`), shared 1 s clock (`useNow`) | `src/hooks/useLiveQuery.js`, `src/hooks/useNow.js` |
| Join / leave / heartbeat / interruption detection | `src/hooks/useStudyRoom.js` |
| Routes `/app/study`, `/app/study/:id` | `src/App.jsx` |
| Dev-only in-browser backend stand-in | `src/services/demoStudyRooms.js` |

## Timing rules (the important part)

1. **The server is the only clock.** `joined_at`, `left_at` and `last_heartbeat_at` are set from the database clock
   (`now()`), never from a value the client sends. The client never sends times.
2. **Every duration in a response is exact as of `serverTime`.** The client adds the time elapsed since it *received*
   the response, measured with `performance.now()` (monotonic, so a wrong or changing device clock can't skew it), for
   whatever is still running. That is how timers tick smoothly between fetches and stay correct after a refresh.
3. **One open sitting per student, platform-wide.** Enforced by a partial unique index (below). `join` is idempotent:
   joining the room you're already in returns the current sitting; joining another room closes the open one first,
   in the same transaction.
4. **Abandoned sittings end at their last heartbeat.** A job (every 30 s, e.g. pg_cron) closes sittings where
   `last_heartbeat_at < now() - interval '90 seconds'` with `left_at = last_heartbeat_at`, `end_reason = 'timeout'`.
   Every endpoint must apply the same rule to the rows it reads (or run the sweep first), so a late heartbeat can never
   revive an expired sitting and nobody is shown as studying after they left.
5. **History is never rewritten.** Sittings are append-only; leaving only fills `left_at` / `end_reason`.
   Per-room and per-student totals are sums over sittings (`coalesce(left_at, now()) - joined_at`).

Heartbeat interval 20 s, timeout 90 s: background tabs whose timers browsers throttle to once a minute still stay in.

## Database

```sql
create table study_rooms (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(btrim(title)) between 3 and 60),
  module       text not null,
  description  text not null default '' check (char_length(description) <= 140),
  created_by   uuid not null references students(id),
  created_at   timestamptz not null default now(),
  archived_at  timestamptz                         -- set when nobody has studied there for 24 h
);

create table study_sittings (
  id                 uuid primary key default gen_random_uuid(),
  room_id            uuid not null references study_rooms(id),
  student_id         uuid not null references students(id),
  joined_at          timestamptz not null default now(),
  last_heartbeat_at  timestamptz not null default now(),
  left_at            timestamptz,
  end_reason         text check (end_reason in ('left', 'switched', 'timeout', 'room_closed')),
  check (left_at is null or left_at >= joined_at)
);

-- At most ONE open sitting per student (prevents duplicate active sessions, in this room or any other).
create unique index study_sittings_one_open on study_sittings (student_id) where left_at is null;
create index study_sittings_room on study_sittings (room_id, student_id);
create index study_sittings_student on study_sittings (student_id, joined_at desc);
create index study_sittings_open_heartbeat on study_sittings (last_heartbeat_at) where left_at is null;
```

Join, in one transaction:

```sql
-- 1. expire this student's stale sitting (rule 4), 2. close an open sitting elsewhere, 3. open one here if none
update study_sittings set left_at = last_heartbeat_at, end_reason = 'timeout'
 where student_id = $me and left_at is null and last_heartbeat_at < now() - interval '90 seconds';
update study_sittings set left_at = now(), end_reason = 'switched'
 where student_id = $me and left_at is null and room_id <> $room;
insert into study_sittings (room_id, student_id) values ($room, $me)
 on conflict (student_id) where left_at is null do update set last_heartbeat_at = now();
```

## API

All endpoints: `Authorization: Bearer <token>`. Only students with `verificationStatus = "approved"` may call them
(403 `VERIFICATION_PENDING | VERIFICATION_REJECTED` otherwise: the frontend already reacts to these globally).
`serverTime` is an ISO 8601 string. All durations are whole seconds as of `serverTime`.

```
RoomSummary = { id, title, module, description, createdAt, creator: { id, fullName, avatarUrl },
                activeCount,                 // students with an open sitting
                totalSeconds,                // all sittings ever, open ones counted up to serverTime
                participants: [{ id, fullName, avatarUrl, seconds, active: true }] }   // open sittings, up to 6, most time first

RoomDetail  = { serverTime,
                room: RoomSummary without participants,
                participants: [{ id, fullName, avatarUrl,
                                 seconds,          // this student's total in THIS room (all sittings)
                                 active,           // has an open sitting here
                                 sittingSeconds,   // current sitting so far (0 if not active)
                                 lastSeenAt }],    // latest left_at, or serverTime if active
                                 // everyone who studied here: all active + top 50 by seconds
                me: { inRoom, seconds, sittingSeconds } }
```

| Method & path | Body | Response | Errors |
|---|---|---|---|
| `GET /study-rooms` | | `{ serverTime, myActiveRoomId, rooms: [RoomSummary] }` non-archived rooms, most active first | |
| `POST /study-rooms` | `{ title, module, description? }` | `201 { serverTime, room: RoomSummary }` (does not join; the client joins next) | `422 VALIDATION_ERROR { fields }`, `429 ROOM_LIMIT` (3 rooms / student / 24 h) |
| `GET /study-rooms/:id` | | `RoomDetail` | `404 ROOM_NOT_FOUND` (also for archived rooms) |
| `POST /study-rooms/:id/join` | | `RoomDetail` | `404 ROOM_NOT_FOUND` |
| `POST /study-rooms/:id/leave` | | `RoomDetail` (idempotent) | `404 ROOM_NOT_FOUND` |
| `POST /study-rooms/:id/heartbeat` | | `{ serverTime, inRoom: true }` | `409 NOT_IN_ROOM` (no open sitting here: expired, left, switched) |
| `GET /study-rooms/me/stats` | | `MyStudyStats` | |

```
MyStudyStats = { serverTime,
                 active: { roomId, roomTitle, sittingSeconds } | null,
                 todaySeconds, weekSeconds (Monday start), totalSeconds,
                 longestSittingSeconds, bestDaySeconds, sittings,
                 streakDays,                       // consecutive days with ≥ 60 s, ending today (or yesterday if today is empty)
                 last7: [{ date: "YYYY-MM-DD", seconds }] }   // oldest first, last entry = today
```

Days are calendar days in `Africa/Algiers`; a sitting that crosses midnight is split between the two days.
`active` time is included up to `serverTime`; the client adds the rest live (`liveStats`).

## Real-time

No push infrastructure exists yet, so the frontend **polls**: room 5 s, list 10 s, stats 30 s, only while the tab is
visible, plus immediately on tab focus, on `online`, and after its own join / leave / create. Timers tick locally
between polls (rule 2), so polling only has to catch joins and leaves.

To make it instant later, add a push channel (SSE `GET /study-rooms/events` or a WebSocket) that emits
`{ type: "room.changed", roomId }` on join / leave / timeout / create. On the client, call `notifyStudyRoomsChanged()`
from `studyRoomsService.js` when an event arrives; every open view refetches. Pages need no change.

## Milestones

Rules live in `studyMilestones()` (`studyRoomsService.js`); progress comes only from `MyStudyStats`:
first sitting · 1 h and 3 h in a single sitting · 4 h in one day (`bestDaySeconds`) · 10 / 50 / 100 h in total ·
3 and 7 day streaks.

## Dev-only stand-in

With `npm run dev` and no `VITE_API_URL`, `src/services/demoStudyRooms.js` plays the server in localStorage
(`tanawar.demoStudyRooms`) and follows the rules above (heartbeats, 90 s expiry at the last heartbeat, idempotent join,
one open sitting). Changes reach other tabs through a `BroadcastChannel`. Three rooms with simulated students are seeded
(refreshed every 4 h) so the list isn't empty. To study with a second student: register one through the sign-up modal, approve it as the
demo admin (`100000000001` / `admin1234`, `/admin/registrations`), then sign in as the demo student in one tab and the
new student in another, with "Keep me signed in" unticked in both so each tab keeps its own session.
The module is `null` in production builds.
