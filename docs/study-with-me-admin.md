# Study With Me: admin management

Admin view of the Study With Me feature (`docs/study-with-me.md`): overview numbers, every study room, reports on rooms,
moderation (close / reopen rooms, remove / warn participants, internal notes) and analytics.
The **frontend is implemented** at `/admin/study`. The **backend does not exist yet**: this document is the contract it
must implement. Until `VITE_API_URL` is set, demo builds use mock data (`src/services/demoAdminStudyRooms.js`).

## Frontend map

| Piece | File |
|---|---|
| Page: overview cards, tabs (`#rooms` · `#reports` · `#analytics`), `?room=<id>` deep link | `src/pages/admin/StudyWithMeAdminP.jsx` |
| Rooms table: search, status chips, filters, sorting, pagination | `src/pages/admin/study/StudyRoomsTable.jsx` |
| Room details dialog: info, host, participants, activity, reports, notes, moderation | `src/pages/admin/study/StudyRoomDetailDialog.jsx` |
| Confirmation dialog for close / reopen / remove / warn | `src/pages/admin/study/RoomActionDialog.jsx` |
| Reports queue | `src/pages/admin/study/StudyReportsQueue.jsx` |
| Analytics (charts) | `src/pages/admin/study/StudyAnalytics.jsx` |
| Status pill | `src/Components/sharedC/StudyRoomStatusBadge.jsx` |
| API calls, normalisation, action definitions, formatting | `src/services/adminStudyRoomsService.js` |
| Mock data (demo builds only, `null` in production) | `src/services/demoAdminStudyRooms.js` |

## Room status

| Status | Meaning |
|---|---|
| `active` | not closed, at least one open sitting |
| `ended` | not closed, nobody studying (still listed and joinable unless archived) |
| `closed` | closed by an admin: hidden from `GET /study-rooms`, `join` returns `404 ROOM_NOT_FOUND` |

Schema additions on top of `docs/study-with-me.md`:

```sql
alter table study_rooms
  add column visibility    text not null default 'public' check (visibility in ('public', 'private')),
  add column closed_at     timestamptz,
  add column closed_by     uuid references admins(id),
  add column closed_reason text;
-- end_reason gains 'removed' (a participant removed by an admin); 'room_closed' already exists.

create table study_room_reports (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references study_rooms(id),
  reporter_id uuid not null references students(id),
  reported_student_id uuid references students(id),          -- null: the room itself is reported
  reason text not null, details text not null default '',
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolved_by uuid references admins(id), resolved_at timestamptz, resolution text,
  created_at timestamptz not null default now()
);
create table study_room_notes  (id uuid primary key default gen_random_uuid(), room_id uuid not null references study_rooms(id),
                                admin_id uuid not null references admins(id), text text not null check (char_length(text) between 1 and 1000),
                                created_at timestamptz not null default now());
create table study_room_events (id uuid primary key default gen_random_uuid(), room_id uuid not null references study_rooms(id),
                                type text not null, admin_id uuid references admins(id), student_id uuid references students(id),
                                reason text, created_at timestamptz not null default now());   -- closed, reopened, participant_removed, user_warned, note_added, report_*
```

Visibility: student rooms are all public today. If the server doesn't support private rooms, return
`visibilityAvailable: false` from the list and the Visibility column and filter are hidden.

## API

All endpoints: `Authorization: Bearer <token>`, **admin role only** (401 without a session, 403 otherwise; the UI's role
check is UX only). Durations are whole seconds exact as of `serverTime`; open sittings count up to `serverTime`
(and the 90 s heartbeat rule of `docs/study-with-me.md` applies before anything is read). A list the server can't
provide yet is `null`: the UI shows "Not available yet", never an empty list or a 0.

```
Person           = { id, fullName, matricule, avatarUrl }
AdminRoomSummary = { id, title, module, description, visibility, status, createdAt, lastActivityAt, host: Person,
                     activeCount,          // open sittings now (0 when closed)
                     participantCount,     // distinct students who ever studied here
                     totalSeconds, openReports }
AdminRoomDetail  = AdminRoomSummary + { serverTime, closedAt, closedReason, closedBy,
                     host: Person + { level, department, accountStatus, roomsCreated, totalSeconds },
                     participants: [Person + { level, active, seconds, sittingSeconds, sittings, joinedAt, lastSeenAt, warned }],
                                   // everyone who studied here, active first then most time
                     activity: [{ id, type, by, at, reason?, seconds?, target?, ended? }], activityTruncated,   // newest first, ≤ 60
                     reports: [Report], notes: [{ id, text, by, at }] }
Report           = { id, reason, details, reporter: Person, reportedUser: Person | null, at,
                     status: "open" | "resolved" | "dismissed", resolvedBy, resolvedAt, resolution }
```

| Method & path | Body | Response |
|---|---|---|
| `GET /admin/study-rooms/overview` | | `{ serverTime, totalRooms, activeRooms, studyingNow, totalSeconds, reportedRooms, openReports }` |
| `GET /admin/study-rooms?q=&status=&visibility=&module=&host=&from=&to=&reported=&sort=&order=&page=&pageSize=` | | `{ serverTime, items: [AdminRoomSummary], total, page, pageSize, facets: { modules }, visibilityAvailable }` |
| `GET /admin/study-rooms/analytics?days=7\|30\|90` | | `StudyAnalytics` (below) |
| `GET /admin/study-rooms/reports?status=` | | `{ serverTime, items: [Report + { room: AdminRoomSummary }], total }` open: oldest first; others newest first |
| `GET /admin/study-rooms/:id` | | `AdminRoomDetail` · `404 ROOM_NOT_FOUND` |
| `POST /admin/study-rooms/:id/close` | `{ reason }` (≥ 10 chars) | `204` · ends every open sitting at `now()` with `end_reason = 'room_closed'`, notifies the host · `409 INVALID_TRANSITION` if already closed |
| `POST /admin/study-rooms/:id/reopen` | `{ reason? }` | `204` · `409 INVALID_TRANSITION` if not closed |
| `POST /admin/study-rooms/:id/participants/:studentId/remove` | `{ reason }` | `204` · ends that sitting (`end_reason = 'removed'`), notifies the student · `409 NOT_IN_ROOM` |
| `POST /admin/study-rooms/:id/participants/:studentId/warn` | `{ reason }` | `204` · notifies the student, records `user_warned` |
| `POST /admin/study-rooms/:id/notes` | `{ text }` (1–1000) | the created note |
| `POST /admin/study-rooms/:id/reports/:reportId/resolve` \| `dismiss` | `{ note? }` | `204` · `409 INVALID_TRANSITION` if not open |

`q` searches title, description and module; `host` searches the host's name and matricule; `from` / `to` are
`YYYY-MM-DD` on `createdAt`; `reported=true` keeps rooms with open reports. `sort`: `title | createdAt | participants |
totalSeconds | lastActivityAt`. Every action is recorded in `study_room_events` with the acting admin.

```
StudyAnalytics = { serverTime, days,
  hours:        [{ date: "YYYY-MM-DD", seconds }],          // one per day, oldest first
  dailyActive:  [{ date, students }],                       // distinct students per day
  weeklyActive: [{ weekStart: "YYYY-MM-DD", students }],    // last 12 Monday weeks
  periods:      [[seconds × 12] × 7],                       // Mon..Sun × 2-hour bands 00–02 … 22–24, study time in the range
  averageSittingSeconds, sittings,
  averageByDay: [{ date, seconds }],
  topRooms:     [{ id, title, module, status, seconds, students }] }   // ≤ 6, most study time in the range
```

Days and hours are in `Africa/Algiers`; a sitting that crosses midnight or a band boundary is split.

## Mock data (demo builds)

46 generated rooms, 32 students, about 1,000 sittings over the last 3 months, reports on 6 rooms. Generation is
seeded, so the numbers are stable; times move forward every 2 h so "studying now" stays plausible. Admin actions are
stored in `localStorage["tanawar.demoAdminStudy"]` and applied on top ("Reset demo" on the page clears them).
The mock is separate from the student-side stand-in, so closing a room here doesn't affect `/app/study`.
