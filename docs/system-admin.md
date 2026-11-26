# Admin · System (change log, operators, settings)

The "System" group of the admin sidebar. Client: `src/services/adminSystemService.js` (contract in its header comment),
pages `src/pages/admin/ChangelogP.jsx`, `OperatorsP.jsx`, `AdminSettingP.jsx`.

| Route | Page | Who can write |
| --- | --- | --- |
| `/admin/changelog` | Read-only log of every operator action | nobody (server writes it) |
| `/admin/operators` | Admin accounts, roles, invitations | super admin |
| `/admin/settings` | Platform settings | super admin |

## Roles

`super_admin` · `admin` · `moderator`. The permission table is `PERMISSIONS` in the service and is shown on the
Operators page. The server must enforce it on **every** `/admin/*` endpoint; the client only hides buttons.
`GET /admin/operators` returns `me` (the caller's operator id) so the client knows the caller's role.

## Change log

`GET /admin/changelog?q=&category=&actor=&period=&page=&pageSize=` → `{ items, total, page, pageSize, facets: { actors } }`, newest first.

```
ChangeEntry = { id, at, actor: { id, name }, action, category: "students"|"sessions"|"operators"|"settings",
                target: { type: "student"|"session"|"operator", id, label } | null,
                reason, changes: [{ field, label, from, to }] | null }
```

- The server writes an entry **in the same transaction** as each change. Entries are append-only: no update/delete endpoint.
- `action` values are listed in `CHANGE_ACTIONS`; unknown actions are still shown (generic icon), never hidden.
- For settings, one entry per save listing every changed field with display values (`from` / `to`).
- `period` is a number of days (1, 7, 30, 90). `q` matches actor, target label, reason and changed field labels.

## Operators

| Endpoint | Notes |
| --- | --- |
| `POST /admin/operators { fullName, email, role }` | Creates `status: "invited"` and emails a set-password link. 409 `EMAIL_TAKEN`. |
| `PATCH /admin/operators/:id { role }` | |
| `POST /admin/operators/:id/suspend { reason }` | reason ≥ 10 chars. Ends their sessions at once. |
| `POST /admin/operators/:id/reactivate` | suspended only |
| `POST /admin/operators/:id/resend-invite` | invited only; invalidates the previous link |
| `DELETE /admin/operators/:id` | revokes an invitation or removes access; past log entries keep the actor's name |

Server rules: super admin only (403 `FORBIDDEN`); 409 `SELF_ACTION` on the caller's own account; 409 `LAST_SUPER_ADMIN`
if the change would leave no active super admin; 409 `INVALID_TRANSITION` when the status no longer allows the action.
A suspended or removed operator's token must stop working immediately (403 on the next call).

## Settings

`GET /admin/settings` → `{ values, updatedAt, updatedBy }`; `PATCH /admin/settings { …changed keys }` → same shape.

Keys, types, ranges and defaults are `SETTINGS_SECTIONS` in the service. Defaults equal today's behaviour, so a missing
key means "unchanged". The server validates the same ranges (422 `INVALID_SETTING { field }`) and **applies** the
settings itself: registration open/closed and Google sign-up, accepted documents and max size, verification attempts,
session approval / instant sessions / seat and duration caps, Study With Me on/off and rooms per day, resource size and
review, maintenance mode (students get 503 + the message; admins keep access) and the support email.

## Dev stand-in

Without `VITE_API_URL` (and in `DEMO_MODE`), operators, settings and their log entries live in localStorage
(`tanawar.demoSystem`). The demo admin is the only seeded operator. The change log also merges the student actions
recorded by `demoRegistry` and the session actions from `sessionsService.DEMO_SESSION_ADMIN`. Saved settings are **not**
applied to the app in demo mode; the page says so.
