# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Vite dev server
- `npm run build` — production build to `dist/`
- `npm run lint` — oxlint (`react/rules-of-hooks` is an error; `only-export-components` a warning)
- `npm run preview` — serve the build

There is no test runner configured.

## What this is

TANAWAR: a peer-learning platform for UMBB students (students host/join study sessions; an admin area approves sessions, moderates resources, manages users). Frontend only: React 19 + Vite + Tailwind v4 (JavaScript/JSX, no TypeScript). The backend does not exist yet.

## Architecture

- **No router yet.** `src/App.jsx` picks the screen from `window.location.pathname`: `/app*` with a session renders `StudentLayout` + `Dashboard`; anything else renders `PublicLayout` + `LandingPage`. Layouts take `children` (swap to `<Outlet />` when react-router is added). `src/routes/*` and most `pages/**` files (student sessions, admin, other auth pages) are empty placeholders. Sidebar links point to `/app/...` routes that don't render anything yet.
- **Auth** lives only in `services/authService.js` (session in local/sessionStorage under `tanawar.session`, roles → `HOME_BY_ROLE`). `services/apiClient.js` is a fetch wrapper that throws `ApiError(code: "NOT_CONFIGURED")` until `VITE_API_URL` is set — nothing is faked. A dev-only `DEMO_ACCOUNT` (matricule `202131012345` / `demo1234`) is stripped from production builds.
- **Registration & verification** (spec + backend contract: `docs/registration-verification.md`): sign-up modal `pages/auth/Register.jsx` (email+password or Google via `VITE_GOOGLE_CLIENT_ID`, then matricule + student card/enrollment certificate upload). New accounts are `verificationStatus: "pending"`; `App.jsx` keeps any student where `!isVerified(user)` on `/app/verification` (checked before the profile-setup gate). Admins review at `/admin/registrations`. A 403 `VERIFICATION_PENDING|REJECTED` from any API call re-syncs the session (`apiClient` → `authService`). In dev without `VITE_API_URL`, `services/demoRegistry.js` simulates the backend in localStorage (admin `100000000001` / `admin1234`); it's compiled out of production, so guard new demo branches with `import.meta.env.DEV`.
- **Sign-in is a modal, not a page:** `PublicLayout` owns its open state and exposes it through `SignInContext` (`hooks/useSignIn.js`). `layouts/AuthLayout.jsx` is the modal shell pattern (portal, scroll lock, focus trap, focus restore, Esc/backdrop close).
- **Study With Me** (spec + backend contract + DB schema: `docs/study-with-me.md`): `/app/study` (rooms list, stats, milestones) and `/app/study/:id` (room). The server is the only clock: responses carry `serverTime` and durations exact as of it; the client adds elapsed `performance.now()` time (`liveSeconds`, `hooks/useNow.js`). Rooms heartbeat every 20 s (`hooks/useStudyRoom.js`); real-time is polling + `notifyStudyRoomsChanged()` (`hooks/useLiveQuery.js`). Dev stand-in: `services/demoStudyRooms.js` (localStorage + BroadcastChannel across tabs).
- **Settings** (spec + backend contract + what the server must enforce: `docs/settings.md`): `/app/settings` with tabs Account / Preferences / Privacy & Security (hash-addressable, e.g. `#notifications`). Preferences are one object read through `hooks/useSettings.js` (shared `settingsStore` in `services/settingsService.js`); account/security actions are in `services/accountService.js`. Theme, text size and reduced animations are applied by `services/appearance.js` (use its `prefersReducedMotion()` instead of `matchMedia`).
- **Admin area** (`/admin/*`, admin role; spec + backend contract: `docs/admin-dashboard.md`): `AdminLayout` + collapsible `AdminSidebar`; routes in `ADMIN_ROUTES` in `App.jsx`. The Overview (`pages/admin/DashboardP.jsx`) reads `GET /admin/overview` via `services/adminDashboardService.js`; a metric the server returns as `null` is shown as "Not available yet", never as 0. Most other admin pages are `AdminPagePlaceholder`s; `/admin/registrations` is real.
- **Dashboard data is placeholder constants** at the top of `pages/Student/Dashboard.jsx` until the sessions/bookings API exists.
- **Component folders** (note the odd names): `Components/uiC` (primitives: Button, Input, Icon, Avatar, Label…), `Components/sharedC` (domain cards/badges), `Components/layoutC` (navbar/sidebars/topbar), `Components/motion` (scroll reveal, count-up).
- **Icons:** every icon must be registered in `Components/uiC/Icon.jsx` (named Lucide imports) and used as `<Icon name="…" size="sm|md|lg" />`. Sizes are restricted to those three.
- **i18n:** locale JSON files exist in `public/locales/{en,fr,ar}` but UI strings are currently hard-coded English.

## Styling

Tailwind v4 with design tokens declared in `@theme` in `src/index.css` (`bg-surface`, `text-fg`, `border-line`, `text-primary-text`, `bg-highlight`, `shadow-pop`, …). Dark mode is class-based (`:root.dark` redefines the same CSS variables, so token classes flip automatically — avoid hard-coded hex colors in new code; `Button`/`Label` still contain some). Theme state is in `hooks/useTheme.js`. Design values follow the Figma file "TANAWAR · Student app v1.1" (e.g. 20px card radius, 46px/38px buttons, 44px inputs).
