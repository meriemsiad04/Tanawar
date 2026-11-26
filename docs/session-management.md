# Admin: Session management

Sessions directory, session details, the approval queue and moderation at `/admin/sessions` and
`/admin/sessions/approvals` (sidebar: **Sessions**).
The **frontend is implemented**. The **backend does not exist yet**: this document is the contract it must implement.
The frontend calls it through `src/services/adminSessionsService.js` once `VITE_API_URL` is set.

## Frontend map

| Piece | File |
| --- | --- |
| Directory + approval queue (search, filters, sort, pagination) | `src/pages/admin/sessions/SessionsDirectory.jsx` (`ManagementSP`, `ApprovalSP` render it) |
| Session details, actions, notes, history | `src/pages/admin/sessions/SessionDetailDialog.jsx` |
| Reject / cancel / remove confirmation | `src/pages/admin/sessions/SessionActionDialog.jsx` |
| Contract, normaliser, status model, transition rules | `src/services/adminSessionsService.js` |
| Status pill | `src/Components/sharedC/AdminSessionStatusBadge.jsx` |
| Student side (status on cards, no join/enter unless published) | `sessionsService.publicationOf`, `SessionListCard`, `BookingRow`, `ExploreSP`, `ClassroomsP` |
| Dev stand-in | `sessionsService.DEMO_SESSION_ADMIN` (same localStorage store as the demo student's sessions) |

`?session=<id>` opens a session directly (used by the overview's "Session approvals" tasks).

## Session workflow (unchanged rules, now enforced)

| Created as | Initial status | Who sees it |
| --- | --- | --- |
| **Instant** | `approved` (published at once, **never** reviewed) | everyone |
| **Scheduled** | `pending` | its host only, until an admin approves it |

- Private sessions: join requests stay with the **host** (`/join-requests/:id/approve|decline`). Admins can see pending
  requests on the session but have no endpoint to decide them.
- Admins don't edit sessions. Moderation is limited to approve / reject (scheduled only), cancel, remove, notes and reports.

## Status model

Stored: `pending | approved | rejected | cancelled` + `removed_at` (soft delete). The API returns the **display status**,
derived at request time:

| Display | Stored | Meaning |
| --- | --- | --- |
| `pending` | pending | scheduled, waiting for review |
| `approved` | approved, not started | published, upcoming |
| `active` | approved, `startsAt ≤ now < startsAt + duration` | happening now |
| `completed` | approved, ended | over |
| `cancelled` | cancelled | called off (by an admin, or by the host) |
| `rejected` | rejected | never published |

`removed: true` is independent: removed sessions are hidden from every student list and endpoint (the host sees a
"Removed by a moderator" state), and are kept in the database with their participants, resources and history.

### Transitions (server-validated)

| Action | Endpoint | Body | Allowed from | Result |
| --- | --- | --- | --- | --- |
| Approve | `POST /admin/sessions/:id/approve` | `{}` | `pending`, **scheduled**, start time not passed | `approved` (published, host notified) |
| Reject | `POST /admin/sessions/:id/reject` | `{ reason? }` | `pending`, **scheduled** | `rejected` (host notified, reason shown) |
| Cancel | `POST /admin/sessions/:id/cancel` | `{ reason }` (≥ 10 chars) | `approved`, `active` | `cancelled` (host + participants notified) |
| Remove | `POST /admin/sessions/:id/remove` | `{ reason }` (≥ 10 chars) | any, not removed | `removed`; also `pending → rejected`, `approved/active → cancelled` |

→ `204`. Errors: `409 INVALID_TRANSITION` (wrong state, e.g. another admin acted first, or approve/reject on an instant
session), `409 SESSION_STARTED` (approving after the start time), `422` missing/short reason, `404` unknown session.
The client re-checks the same rules (`actionsFor`) only to decide which buttons to show.

Removed sessions can't be acted on. A pending session whose start time passed without review can only be rejected.

## Endpoints

All require `Authorization: Bearer <token>` of an **admin**: 401 without a valid session, **403 for any non-admin**.
The `/admin` role check in `App.jsx` is UX only.

### `GET /admin/sessions`

Query: `q` (title, description, module; case-insensitive), `type` (`instant|scheduled`), `module`, `level`,
`visibility` (`public|private`), `status` (one of the six display statuses), `host` (name or matricule, partial),
`from` / `to` (`YYYY-MM-DD`, on `startsAt`, inclusive, Africa/Algiers), `reported` (`true` → sessions with open reports),
`sort` (`startsAt|createdAt|title|participants`), `order` (`asc|desc`), `page` (1-based), `pageSize` (max 100, default 20).
Unknown values → 400. Removed sessions are included (flagged). Ties broken by title, then id.

```jsonc
{
  "items": [{
    "id": "ses_42", "title": "Graphs revision", "description": "…", "type": "scheduled", "visibility": "public",
    "module": "Algorithmique avancée", "level": "L2", "startsAt": "2026-11-28T14:00:00Z", "durationMin": 90,
    "seats": 20, "participantCount": 7, "mode": "online", "createdAt": "2026-11-25T10:12:00Z",
    "status": "pending", "removed": false, "openReports": 0,
    "host": { "id": "stu_9", "fullName": "Amine Khelifi", "matricule": "2021…", "avatarUrl": null }
  }],
  "total": 312, "page": 1, "pageSize": 20,
  "facets": { "modules": ["…"], "levels": ["L1", "…"] },
  "reportsAvailable": true            // false until session reports exist (disables the "Reported only" filter)
}
```

The approval queue calls it with `status=pending&type=scheduled&sort=startsAt&order=asc`.

### `GET /admin/sessions/:id`

The summary plus (any list the server can't provide yet is `null`, shown as "Not available yet"; `[]` means none):

```jsonc
{
  "meetingLink": "https://meet.google.com/…", "location": null,
  "statusReason": "Room unavailable", "reviewedAt": "…", "reviewedBy": "Admin name",
  "host": { "…": "summary fields", "level": "L3", "department": "Informatique", "accountStatus": "active",
            "sessionsHosted": 4, "rating": 4.8 },
  "participants": [{ "id": "stu_1", "fullName": "…", "avatarUrl": null, "level": "L2", "joinedAt": "…" }],
  "resources": [{ "id": "r1", "kind": "file", "name": "Serie.pdf", "url": "https://…", "uploadedBy": "…", "at": "…" }],
  "joinRequests": [{ "id": "jr1", "status": "pending", "at": "…", "student": { "fullName": "…", "major": "…", "level": "L2" } }],
  "reports": [{ "id": "rep_1", "reason": "Spam", "details": "…", "reporter": { "fullName": "…" }, "at": "…",
                "status": "open", "resolvedBy": null, "resolvedAt": null }],
  "history": [{ "id": "log_1", "action": "approved", "reason": null, "by": "Admin name", "at": "…" }],
  "notes": [{ "id": "note_1", "text": "…", "by": "Admin name", "at": "…" }]
}
```

`history[].action`: `submitted`, `published`, `approved`, `rejected`, `cancelled`, `cancelled_by_host`, `removed`,
`note_added`, `report_resolved`, `report_dismissed` (unknown values are shown generically). Resource `url`s must be
`http(s)` (others aren't rendered as links). Contact details of participants (emails) are not needed and must not be sent.

### Notes and reports

| Endpoint | Body | Result |
| --- | --- | --- |
| `POST /admin/sessions/:id/notes` | `{ text }` (1–1000 chars) | `201` the note `{ id, text, by, at }` |
| `POST /admin/sessions/:id/reports/:reportId/resolve` | `{ note? }` | `204` (open → resolved) |
| `POST /admin/sessions/:id/reports/:reportId/dismiss` | `{ note? }` | `204` (open → dismissed) |

Notes are **admin-only**: never returned by any student endpoint.

## What the server must enforce

1. **Admin role** on every endpoint above, from the token.
2. **Creation rules** on `POST /sessions`: `type: "instant"` → `approved` immediately; `type: "scheduled"` → `pending`.
   The client can't choose the status. Editing a scheduled session's content after approval should send it back to
   `pending` (when session editing is built).
3. **Visibility**: `GET /sessions` and every student session endpoint list `approved` (incl. active/completed) sessions
   to everyone; `pending` / `rejected` only to the host; `cancelled` to the host and participants; removed ones to nobody
   but the host (as removed). Joining, requesting, uploading and the classroom (`GET /sessions/:id`) require a published,
   not cancelled, not removed session (`409` otherwise).
4. **Transitions** exactly as in the table, atomically (`UPDATE … WHERE status = :expected`), so two admins can't both act.
5. **Activity log**: every action and note writes `{ adminId, sessionId, action, reason, at }` in the same transaction,
   append-only. Approvals also feed `GET /admin/overview` `activity` (type `sessionApproval`) and the
   `pendingSessionApprovals` counts / `tasks.sessionApprovals`.
6. **No hard delete**: cancel and remove change status / set `removed_at`; participants, join requests, resources and
   ratings keep their rows. Notifications go to the host (approve, reject, cancel, remove) and participants (cancel, remove).

## Suggested tables

```sql
-- sessions: add
status        text not null check (status in ('pending','approved','rejected','cancelled')),
status_reason text, reviewed_at timestamptz, reviewed_by uuid references admins(id),
removed_at    timestamptz, removed_by uuid references admins(id)

session_notes   (id, session_id → sessions, admin_id → admins, text, created_at)
session_reports (id, session_id → sessions, reporter_id → students, reason, details, status open|resolved|dismissed,
                 resolved_by, resolved_at, created_at)
admin_activity_log (shared with docs/student-management.md)
```

## Development without a backend

With `npm run dev` and no `VITE_API_URL`, the admin sees the **same sessions the demo student sees** (the sample sessions
of `sessionsService` and the ones created with the demo student `202131012345` / `demo1234`), stored in this browser.
Sign in as admin `100000000001` / `admin1234`. Create a scheduled session as the student → it appears in the approval
queue and the sidebar badge; approve / reject / cancel / remove it → reload the student's Sessions page to see the result.
The demo has participant counts but no participant names, no resources and no reports, so those sections show
"Not available yet" and the "Reported only" filter is disabled. Hosts aren't demoRegistry accounts, so there's no
"Open student profile" link.

## Missing backend work

- Every endpoint above, the creation / visibility rules and the 409s on student endpoints.
- Notifications to hosts and participants for approve / reject / cancel / remove.
- **Session reports from students**: there is no "Report session" action on the student side yet
  (`POST /sessions/:id/reports { reason, details }`); until it exists `reports` stays null and `reportsAvailable` false.
- Host cancellation (`cancelled_by_host`) when the student-side "cancel my session" is built.
