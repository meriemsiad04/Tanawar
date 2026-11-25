# Settings & Preferences

`/app/settings` (`src/pages/Student/SettingP.jsx`). Three tabs, each also reachable by hash: `#account`, `#preferences`, `#privacy`, or any section id (`#profile`, `#email`, `#student-id`, `#learning`, `#appearance`, `#notifications`, `#visibility`, `#password`, `#devices`, `#your-data`, `#danger-zone`).

## How it saves

| What | Where it's edited | How it saves | Service |
|---|---|---|---|
| Personal info, photo, major, level, strong modules | Account → Personal information (shared `ProfileForm`) | Own **Save changes** button, then a page reload so the sidebar shows the new name/photo | `profileService` |
| Email | Account → Email & sign-in | Own form, needs the current password | `accountService.changeEmail` |
| Password | Privacy → Password | Own form | `accountService.changePassword` |
| Learning, Study With Me, appearance, language, notifications, privacy | Preferences / Privacy tabs | One **draft**: changed rows are highlighted, a sticky bar offers **Save changes / Cancel**, leaving with unsaved changes asks first | `settingsService` (`settingsStore`, `hooks/useSettings.js`) |
| Devices, data export, deactivate, delete | Privacy tab | Immediate actions (with confirmation) | `accountService` |

Appearance changes preview live while unsaved and are reverted on Cancel.

## Settings object

`GET /students/me/settings` → `PUT /students/me/settings` (full object back). Missing keys fall back to defaults (`normalizeSettings`), and the first version's notification keys (`sessionReminders`, `bookingRequests`, `weeklyEmail`) are migrated.

```js
{
  language: "en" | "fr" | "ar",
  appearance: { theme: "light" | "dark" | "system", fontSize: "small" | "default" | "large", reduceMotion: boolean },
  learning: {
    favoriteModules: string[],          // ≤ 10
    goals: string[],                    // ≤ 3, each 1–80 chars (trimmed)
    dailyGoalMinutes: integer,          // 15–720
    weeklyGoalHours: integer,           // 1–80, and weeklyGoalHours * 60 ≥ dailyGoalMinutes
    studyTimes: ("morning" | "afternoon" | "evening" | "night")[],
    studyWithMe: { confirmLeave: boolean, timerInTab: boolean, showInRanking: boolean },
  },
  notifications: { sessions, reminders, friendRequests, messages, studyWithMe, resources, achievements, email },  // booleans
  privacy: {
    profileVisibility: "everyone" | "friends" | "private",
    friendRequests: "everyone" | "sameMajor" | "nobody",
    activityVisibility: "everyone" | "friends" | "private",
    statsVisibility: "everyone" | "friends" | "private",
  },
}
```

Validation (same rules client and server): `validateSettings` in `settingsService.js`. The server answers `422 VALIDATION_ERROR { fields: { "learning.dailyGoalMinutes": "message" } }`; the page shows those messages on the matching rows.

## What the frontend applies vs. what the server must enforce

Applied in the browser now:
- **Appearance**: `services/appearance.js` sets `.dark`, `data-font-size` (root `zoom`) and `data-reduce-motion` on `<html>`, mirrored in localStorage so `index.html` applies them before first paint. The account copy is applied on every `/app` load (`StudentLayout` → `useSettings`), so choices follow the student across devices. The navbar theme toggle also saves to the account. Use `prefersReducedMotion()` instead of `matchMedia` in new JS animations.
- **Language**: synced into i18n by `StudentLayout`. Only the public pages are translated so far.
- **Study With Me**: `confirmLeave` (leave dialog) and `timerInTab` (tab title) in `StudyRoomP`; daily / weekly goals and learning goals in `StudyRoomsP`; favourite modules listed first in `CreateStudyRoomModal`.

**Needs the backend** (stored and sent today, enforced only once the server exists):
- `notifications.*`: the server must not create (or email) notifications the student turned off. In dev, the demo feed is filtered by `NOTIFICATION_KIND_PREF`. Security emails ignore `email`.
- `privacy.*`: profile, activity and stats endpoints for *other* students must apply the audience (`friends` = accepted connections); friend-request creation must answer 403 when `friendRequests` forbids it.
- `learning.studyWithMe.showInRanking`: room participant lists must hide this student's time from others.
- `learning.favoriteModules`, `learning.studyTimes`: inputs for recommendations.

## Account & security endpoints

See the header of `src/services/accountService.js`:

| Endpoint | Notes |
|---|---|
| `PUT /auth/me/email { email, currentPassword }` → user | 401 `WRONG_PASSWORD`, 409 `EMAIL_TAKEN`. Should send a confirmation link to the new address and a notice to the old one. |
| `PUT /auth/me/password { currentPassword, newPassword }` → 204 | Same password rules as sign-up. Revokes every other session. |
| `GET /auth/sessions` → `[{ id, device: "desktop"\|"phone"\|"tablet", browser, os, location, lastActiveAt, createdAt, current }]` | One row per refresh token / session. |
| `DELETE /auth/sessions/:id` → 204 | |
| `POST /auth/logout-all` → 204 | Revokes all tokens, including the caller's. |
| `GET /students/me/export` → JSON attachment | Profile, settings, sessions, bookings, connections, resources, study time. Rate-limit it. |
| `POST /students/me/deactivate { currentPassword?, confirm: true }` → 204 | Hide the profile, revoke sessions; signing in again reactivates. |
| `DELETE /students/me { currentPassword?, confirm: "DELETE" }` → 204 | Permanent. Cancel hosted sessions and notify participants. |

Google accounts (`authProvider: "google"`) have no password: they omit `currentPassword`, so the server must require a recent sign-in (for example a token issued within the last 10 minutes) for deactivate and delete.

Every endpoint is for the signed-in student only (the id comes from the token, never from the body). Matricule and university are read-only here. Only administrators can change them.

## Dev demo

With the demo account (`202131012345` / `demo1234`): settings live in `tanawar.demoSettings`. Email/password changes are kept in `tanawar.demoAccount`, so the new password works at the next sign-in. "Delete" wipes the demo's saved data, because the built-in account itself can't be removed. Demo-registry accounts (sign-up in dev) can change email/password, deactivate and delete. Devices lists only this browser.
