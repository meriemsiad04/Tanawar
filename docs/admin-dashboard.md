# Admin dashboard: Overview

The admin home (`/admin`): platform statistics, charts, pending work, recent activity and shortcuts.
The **frontend is implemented**. The **backend does not exist yet**: this document is the contract it must implement.
The frontend calls it through `src/services/adminDashboardService.js` once `VITE_API_URL` is set.

## Frontend map

| Piece | File |
| --- | --- |
| Page | `src/pages/admin/DashboardP.jsx` |
| Data + contract + normaliser | `src/services/adminDashboardService.js` |
| Shell, sidebar badges | `src/layouts/AdminLayout.jsx`, `src/Components/layoutC/AdminSidebar.jsx` |
| Routes, admin-only gate (UX) | `src/App.jsx` (`ADMIN_ROUTES`) |
| Bar charts | `src/Components/sharedC/ActivityBarChart.jsx` |

The page refreshes every 60 s while the tab is visible (`useLiveQuery`). A failed refresh keeps the last data and says
"Couldn't refresh". The first load shows skeletons; a failure with no data shows an error card (401 / 403 / not configured
have their own copy).

## Honesty rule: null is not zero

Every field below may be `null` when the server can't compute it yet (e.g. the reports module isn't built). The UI shows
`null` as **"Not available yet"**, and `0` / `[]` as a real empty state ("All clear", "No activity yet"). The server must
never fill a missing metric with 0 or sample values.

## Endpoints

All require `Authorization: Bearer <token>` of an **admin**. 401 without a valid session, **403 for any non-admin**.
The `/admin` role check in `App.jsx` is UX only; permissions are enforced here.

### `GET /admin/overview?days=7|30|90`

Any other `days` → 400. All counts are computed at `serverTime`.

```jsonc
{
  "serverTime": "2026-11-26T09:30:00Z",
  "stats": {
    "totalStudents": 1240,            // student accounts, any verification status, not deleted
    "verifiedStudents": 1105,         // verification_status = approved
    "pendingVerifications": 37,       // verification_status = pending
    "activeSessions": 18,             // published sessions that are live now or start later
    "pendingSessionApprovals": 6,     // submitted sessions waiting for an admin
    "unresolvedReports": 3,           // reports not yet resolved or dismissed
    "studyParticipants": 22           // distinct students with an open Study With Me sitting
  },
  "series": {                         // days with no data may be omitted (the client fills 0)
    "registrations": [{ "date": "2026-11-25", "value": 14 }],   // accounts created that day
    "sessions":      [{ "date": "2026-11-25", "value": 9 }],    // sessions held (started) that day
    "studyHours":    [{ "date": "2026-11-25", "value": 61.5 }]  // hours of Study With Me sittings started that day
  },
  "popularModules": [{ "code": "INF301", "name": "Algorithms", "sessions": 42 }],  // most sessions in the period, max 6
  "activity": [                       // newest first, max 12
    { "id": "evt_123", "type": "registration", "actor": "Sara Mebarki", "subject": null, "at": "2026-11-26T09:12:00Z" }
  ],
  "tasks": {                          // items oldest first, max 4 per group; total = full queue size
    "verifications":    { "total": 37, "items": [{ "id": "reg_1", "title": "Sara Mebarki", "meta": "Matricule 2021…", "at": "…" }] },
    "sessionApprovals": { "total": 6,  "items": [{ "id": "ses_1", "title": "Graphs revision", "meta": "INF301 · by Amine K.", "at": "…" }] },
    "reports":          { "total": 3,  "items": [{ "id": "rep_1", "title": "Spam in a resource", "meta": "Resource · 2 reports", "at": "…" }] }
  }
}
```

Dates (`date`) are in the university's time zone (Africa/Algiers). Activity `type` is one of:

| type | actor | subject |
| --- | --- | --- |
| `registration` | student | – |
| `resubmission` | student | – |
| `approval` / `rejection` | admin | student (registration reviewed) |
| `session` | host | session title |
| `sessionApproval` | admin | session title |
| `resource` | uploader | resource name |
| `report` | reporter | what was reported |
| `studyRoom` | creator | room title |

Unknown types are ignored by the client. Activity and task items contain **names only**: no emails, matricules of other
admins, or document links. Student matricules may appear in `tasks.verifications[].meta` (admins already see them in the
review queue).

### `GET /admin/counts`

Sidebar badges, cheap enough to call on every admin page load.

```json
{ "pendingVerifications": 37, "pendingSessionApprovals": 6, "unresolvedReports": 3 }
```

## Development without a backend

With `npm run dev` and no `VITE_API_URL`, the overview is built from what the in-browser stand-ins actually hold:
registrations from `demoRegistry` (sign up a few students, review them as admin `100000000001` / `admin1234`) and rooms /
sittings from `demoStudyRooms` (which includes its simulated students), and active sessions / session approvals from the demo student's sessions (`sessionsService`). Reports, resources and
popular modules have no platform-wide stand-in, so they show **"Not available yet"**. The header shows a "Demo data" badge.

## Missing backend work

- All of the above endpoints, plus the admin role check on each.
- Session approval endpoints (docs/session-management.md), reports, and announcements: the dashboard's numbers for
  these depend on those features existing.
- An activity/event log table (or a view over registrations, sessions, resources, reports, study rooms) to feed `activity`.
