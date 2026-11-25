# Student registration & verification

How TANAWAR signs students up, checks that they really are UMBB students, and keeps unverified accounts out.
The **frontend is implemented**. The **backend does not exist yet**: this document is the contract it must implement.
The frontend calls it through `src/services/apiClient.js` once `VITE_API_URL` is set.

## Flow

```
 Sign up (email+password  OR  Google)
        │   same form for both: full name, matricule, document type, document file
        ▼
 POST /auth/register ──► account created, verification_status = pending, signed in
        │
        ▼
 /app/verification  (status screen; every other /app page redirects here)
        │                                   ▲
        │ admin reviews (/admin/registrations)│ resubmit (POST /students/me/verification)
        ├── approve ──► approved ──► /app (profile setup, then dashboard)
        └── reject (reason) ──► rejected ───┘   student sees the reason + resubmission form
```

## Frontend map

| Piece | File |
|---|---|
| Sign-up pop-up (2 steps: account → verification → "awaiting approval") | `src/pages/auth/Register.jsx` |
| Sign-in pop-up: Google button + "Create an account" | `src/pages/auth/Login.jsx` |
| Google button (Google Identity Services) | `src/Components/sharedC/GoogleAuthButton.jsx` |
| Verification fields (shared by sign-up and resubmission) | `src/Components/sharedC/VerificationFields.jsx`, `DocumentDropzone.jsx` |
| Pending / rejected status screen + resubmission | `src/pages/Student/VerificationStatusP.jsx` |
| Admin review queue (list, document preview, approve / reject) | `src/pages/admin/RegistrationsP.jsx` |
| Status badge | `src/Components/sharedC/VerificationStatusBadge.jsx` |
| Auth calls, `isVerified`, session sync | `src/services/authService.js` |
| Verification + admin calls, document rules, validation | `src/services/verificationService.js` |
| Gates (`/app` → `/app/verification`, `/admin` role check) | `src/App.jsx` |
| Dev-only in-browser backend stand-in | `src/services/demoRegistry.js` |

**Keeping the status in sync.** The session user carries `verificationStatus` and `rejectionReason`.
They are refreshed by: the login / register / Google responses; the status screen (on load, every 30 s, on window focus);
`refreshSessionUser()` (`GET /auth/me`); and **any** API call that answers `403 VERIFICATION_PENDING | VERIFICATION_REJECTED`.
`apiClient` broadcasts that 403 and `authService` updates the session and redirects to `/app/verification`, so an admin revoking
access takes effect on the student's next request.

## API contract

All bodies are JSON unless marked multipart. Errors: `{ code, message, ...extra }` with the HTTP status shown.

### Public / auth

| Method & path | Body | Success | Errors |
|---|---|---|---|
| `POST /auth/register` | multipart: `method` (`email`\|`google`), `email`+`password` **or** `registrationToken`, `fullName`, `matricule`, `documentType` (`student_card`\|`enrollment_certificate`), `document` (file) | `201 { token, user }`, `user.verificationStatus = "pending"` | `409 MATRICULE_TAKEN`, `409 EMAIL_TAKEN`, `413 FILE_TOO_LARGE`, `415 UNSUPPORTED_FILE`, `422 VALIDATION_ERROR { fields: { name: msg } }`, `401 REGISTRATION_TOKEN_EXPIRED` |
| `POST /auth/google` | `{ idToken }` | existing account: `200 { token, user }`. New: `200 { registrationRequired: true, registrationToken, profile: { email, fullName } }` | `401` invalid token |
| `POST /auth/login` | `{ matricule, password }` | `200 { token, user }` (**also for pending / rejected students**) | `401`, `429`, `403 ACCOUNT_SUSPENDED` |
| `GET /auth/me` | | `200 user` | `401` |

`user` = `{ id, matricule, fullName, email, role, authProvider, verificationStatus, rejectionReason, profileCompleted, field?, level?, avatarUrl? }`

### Student (Bearer token, allowed while pending / rejected)

| Method & path | Body | Success | Errors |
|---|---|---|---|
| `GET /students/me/verification` | | `{ status, fullName, matricule, documentType, submittedAt, reviewedAt, rejectionReason }` | |
| `POST /students/me/verification` | multipart: `fullName`, `matricule`, `documentType`, `document` | same shape, `status: "pending"` | `409 NOT_REJECTED` (only from `rejected`), `409 MATRICULE_TAKEN`, `413`, `415`, `422` |

**Every other student endpoint** must answer `403 { code: "VERIFICATION_PENDING" | "VERIFICATION_REJECTED", rejectionReason? }`
for a student whose status isn't `approved`. Enforce this in one middleware, not per route.

### Admin (Bearer token, role `admin`; `403` for everyone else)

| Method & path | Body | Success |
|---|---|---|
| `GET /admin/registrations?status=pending\|approved\|rejected\|all&q=` | | `{ items: [{ id, fullName, email, matricule, method, documentType, status, submittedAt, attempts }], total }` |
| `GET /admin/registrations/:id` | | item + `{ reviewedAt, reviewedBy, rejectionReason, document: { name, mimeType, size } }` |
| `GET /admin/registrations/:id/document` | | the file bytes, `Content-Type` = stored MIME type, `Content-Disposition: inline`, `Cache-Control: no-store`, `X-Content-Type-Options: nosniff` |
| `POST /admin/registrations/:id/approve` | | updated registration |
| `POST /admin/registrations/:id/reject` | `{ reason }` (≥ 10 chars, ≤ 500) | updated registration |

Approve / reject on a registration that is no longer `pending` → `409 ALREADY_REVIEWED` (two admins at once).
`q` matches full name, matricule or email. Add pagination (`page`, `pageSize`) when the queue grows; the UI reads `total`.

## Data model (suggested)

```sql
users (
  id, email UNIQUE (case-insensitive), password_hash NULL,        -- NULL for Google-only accounts
  google_sub UNIQUE NULL,                                          -- Google "sub" claim, never the email
  full_name, matricule UNIQUE NOT NULL,                            -- the duplicate-student-ID guarantee
  role ('student' | 'admin'), auth_provider ('email' | 'google'),
  verification_status ('pending' | 'approved' | 'rejected') NOT NULL DEFAULT 'pending',
  rejection_reason NULL, suspended_at NULL, created_at, ...profile fields
)

verification_submissions (                                          -- one row per attempt: full audit trail
  id, user_id → users, full_name, matricule, document_type,
  storage_key, original_name, mime_type, size_bytes, sha256,
  status ('pending' | 'approved' | 'rejected'), rejection_reason NULL,
  submitted_at, reviewed_at NULL, reviewed_by → users NULL
)
```

- `UNIQUE(matricule)` at the database level, not just a pre-check, so two simultaneous sign-ups can't both win. Map the
  constraint violation to `409 MATRICULE_TAKEN`. Same for the email.
- A resubmission may change the matricule (typo fixes). Update `users.matricule` inside the same transaction, under the same constraint.
- Approve / reject: `UPDATE … WHERE id = ? AND status = 'pending'`; 0 rows → `409 ALREADY_REVIEWED`. Update the user and the
  submission in one transaction.

## Security requirements

**Documents**
- Store in **private** object storage (S3 / MinIO / a disk path outside the web root) under a random key. Never a public URL.
- Serve only through `GET /admin/registrations/:id/document`, after checking the admin role. Log every access (who, when, which).
- Validate on the server, not just the client: size ≤ 5 MB, type by **file content (magic bytes)**, allow only JPEG / PNG / WEBP / PDF.
  Reject SVG and HTML. Re-encode images if possible (strips EXIF/GPS). Optionally virus-scan.
- Keep documents only as long as needed (e.g. delete N days after approval) and say so in the privacy notice.

**Google**
- Verify the ID token server-side (Google's library / JWKS): signature, `aud` = your client ID, `iss`, `exp`, `email_verified`.
- `registrationToken` = a short-lived (≈ 30 min) token signed by **your** server, containing the Google `sub` and email.
  Never trust an email sent by the client.
- Google sign-ups go through exactly the same `pending` → admin review path. Being signed in with Google proves nothing about enrollment.

**Accounts & access**
- Hash passwords with Argon2id or bcrypt. Rate-limit `/auth/*` (the UI already handles `429`).
- The `verification_status` check lives in middleware on the server. The frontend gates are UX only.
- Admin endpoints: role check in middleware; record `reviewed_by` on every decision.

**Notifying the student**
- On reject: email the student with the reason and a link to sign in and resubmit. The status screen also shows the reason.
- On approve: email "your account is active". (No email service exists yet.)

## Dev demo (no backend)

With `npm run dev` and **no** `VITE_API_URL`, `demoRegistry.js` stands in for the endpoints above, in this browser's localStorage.
It's dev-only and compiled out of production builds (verified: no demo code in `dist/`).

1. Landing → **Sign up** → email or **Continue with Google (dev demo)** → fill the verification step → submitted.
2. You're sent to the status screen (pending).
3. Sign out → sign in as admin **100000000001 / admin1234** → `/admin/registrations` → open the registration → approve or reject.
4. Sign back in as the student (matricule + password, or the same demo Google email) → rejected: reason + resubmit;
   approved: profile setup → dashboard.

Reset the demo: delete the `tanawar.demoRegistry` key in localStorage.

## Still needed from the admin dashboard

- **AdminSidebar / AdminLayout**: `src/layouts/AdminLayout.jsx` is a temporary minimal shell. Add a "Registrations" entry
  (with a pending-count badge, e.g. from `listRegistrations({ status: "pending" }).total`) pointing to `/admin/registrations`.
- **Routing**: `App.jsx` sends every `/admin*` path to the queue for now. When react-router lands, mount `RegistrationsP`
  under `AdminRoute` (`src/routes/AdminRoute.jsx`) and `VerificationStatusP` under `ProtectedRoute`.
- **User management** (`UserManagementP.jsx`): revoke access (set back to `pending` / suspend) uses the same status field.
  The student's next request gets the 403 and the UI follows automatically.
- **Admin dashboard KPIs**: pending count / average review time can come from `verification_submissions`.
- **Notifications**: wire the reject / approve emails (or in-app notifications) once a notification service exists.
- **i18n**: strings are hard-coded English like the rest of the auth UI; move them to `public/locales` with the other screens.
