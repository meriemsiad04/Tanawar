# Admin: Student management

Student directory, student profiles, verification and account actions at `/admin/users` (sidebar: **Students**).
The **frontend is implemented**. The **backend does not exist yet**: this document is the contract it must implement.
The frontend calls it through `src/services/adminStudentsService.js` once `VITE_API_URL` is set.

## Frontend map

| Piece | File |
| --- | --- |
| Directory (search, filters, sort, pagination) | `src/pages/admin/UserManagementP.jsx` |
| Profile dialog, verify / reject, account actions | `src/pages/admin/students/StudentProfileDialog.jsx` |
| Contract, normaliser, action rules | `src/services/adminStudentsService.js` |
| Status pill | `src/Components/sharedC/AccountStatusBadge.jsx` |
| Forced sign-out of blocked accounts | `src/services/apiClient.js` (`ACCOUNT_BLOCKED_EVENT`), `src/services/authService.js` |
| Dev stand-in | `src/services/demoRegistry.js` (`students`, `student`, `setAccountStatus`), `demoStudyRooms.studentStats` |

`/admin/users?student=<id>` opens a profile directly. Verification review also stays available at `/admin/registrations`.

## Two separate statuses

| | Values | Who changes it |
| --- | --- | --- |
| `verificationStatus` | `pending` · `approved` · `rejected` | admin review (existing registration endpoints) |
| `accountStatus` | `active` · `suspended` · `banned` | admin actions below |

A student can use the platform only when **approved and active**. Student self-deactivation (Settings) is a third,
independent flag (`deactivated`) and isn't an admin action.

## Endpoints

All require `Authorization: Bearer <token>` of an **admin**: 401 without a valid session, **403 for any non-admin**.
The `/admin` role check in `App.jsx` is UX only.

### `GET /admin/students`

Query: `q` (name, email or matricule, case-insensitive), `faculty`, `department`, `level`, `verification`
(`pending|approved|rejected`), `status` (`active|suspended|banned`), `sort` (`name|registeredAt`), `order` (`asc|desc`),
`page` (1-based), `pageSize` (max 100, default 20). Unknown values → 400.

```jsonc
{
  "items": [{
    "id": "stu_42", "fullName": "Sara Mebarki", "email": "sara@…", "matricule": "202131012345", "avatarUrl": null,
    "faculty": "Faculty of Sciences", "department": "Computer Science", "level": "L3",
    "verificationStatus": "approved", "accountStatus": "active", "registeredAt": "2026-10-02T08:00:00Z"
  }],
  "total": 1240, "page": 1, "pageSize": 20,
  "facets": { "faculties": ["…"], "departments": ["…"], "levels": ["L1", "…"] }   // values that exist, for the filter menus
}
```

Students only (never admins). Deleted accounts are excluded. Sort ties are broken by name, then id.

### `GET /admin/students/:id`

The summary above plus:

```jsonc
{
  "authProvider": "email",                     // or "google"
  "registrationId": "reg_9",                   // used with /admin/registrations/:id/{approve,reject,document}
  "verification": { "status": "approved", "documentType": "student_card", "submittedAt": "…", "reviewedAt": "…",
                    "reviewedBy": "Admin name", "rejectionReason": null, "attempts": 1 },
  "accountStatusReason": null, "accountStatusChangedAt": null, "accountStatusChangedBy": null,
  "deactivated": false,
  "stats": {                                   // aggregates only; null = can't be computed yet (shown "Not available yet")
    "sessionsCreated": 4, "sessionsJoined": 17, "resourcesUploaded": 3,
    "reportsAgainst": 0, "reportsFiled": 1,
    "study": { "totalSeconds": 86400, "sittings": 31, "roomsCreated": 2, "lastStudiedAt": "…", "studyingNow": false }
  },
  "moderation": [                              // this student's entries from the admin activity log, newest first
    { "id": "log_1", "action": "suspended", "reason": "Spam in chats", "by": "Admin name", "at": "…" }
  ]
}
```

`moderation[].action`: `verification_approved`, `verification_rejected`, `suspended`, `reinstated`, `banned`, `unbanned`,
and later `report_resolved`, `content_removed` (unknown actions are displayed generically). Study stats must not reveal
room contents or who the student studied with.

### Account actions

| Endpoint | Body | Allowed from | Result |
| --- | --- | --- | --- |
| `POST /admin/students/:id/suspend` | `{ reason }` (required, ≥ 10 chars) | `active` | `suspended` |
| `POST /admin/students/:id/ban` | `{ reason }` (required, ≥ 10 chars) | `active`, `suspended` | `banned` |
| `POST /admin/students/:id/reinstate` | `{ reason? }` | `suspended`, `banned` | `active` (log: `reinstated` / `unbanned`) |

→ `204`. `409 INVALID_TRANSITION` from any other state (another admin acted first), `422` for a missing/short reason,
`404` unknown student, `403` when the target isn't a student.

Verify / reject reuse `POST /admin/registrations/:registrationId/approve|reject` (docs/registration-verification.md);
they must also write `verification_approved` / `verification_rejected` log entries.

## What the server must enforce

1. **Admin role on every endpoint above**, checked server-side from the token.
2. **Blocked accounts are blocked everywhere.** For a `suspended` or `banned` student:
   - `POST /auth/login` and `POST /auth/google` → `403 { code: "ACCOUNT_SUSPENDED" | "ACCOUNT_BANNED" }`;
   - existing tokens are revoked at the moment of the action, and every authenticated endpoint answers the same 403
     (the client then ends the session and explains why on the landing page);
   - open Study With Me sittings are closed at the action time, and the student is removed from live room lists;
   - a banned student's matricule and email can't be used to register again (`MATRICULE_TAKEN` / `EMAIL_TAKEN`).
3. **Activity log.** Each action writes `{ adminId, studentId, action, reason, at }` in the same transaction as the
   status change. Entries are append-only. Suspensions, reinstatements and bans also feed `GET /admin/overview`
   `activity` with types `suspension`, `reinstatement`, `ban` (actor = admin, subject = student).
4. **No deletion.** Suspend and ban change a status only; sessions, bookings, resources, ratings and history are kept.
   Content hidden from other students while an account is blocked is a display rule, not a delete.

## Development without a backend

With `npm run dev` and no `VITE_API_URL`, the directory lists the students registered in this browser through the normal
sign-up (`demoRegistry`): no sample students are created. Sign in as admin `100000000001` / `admin1234`.
Study With Me numbers come from `demoStudyRooms`. Sessions, resources and reports have no platform-wide stand-in and
show "Not available yet". Faculty, department and level aren't collected at sign-up, so those columns show "—" and their
filters are disabled until the profile API provides them. A suspended / banned demo student is refused at sign-in and
signed out on their next page load (`enforceAccountAccess`).

## Missing backend work

- Every endpoint above, the transition rules, token revocation and the 403 on all student endpoints.
- An `admin_activity_log` table (also needed for "Admin Management & Activity Logs" and the overview feed).
- Academic fields (faculty / department / level) on the student record, from the profile or the university registry.
- Sessions, bookings, resources and reports APIs, for the profile's activity numbers.
