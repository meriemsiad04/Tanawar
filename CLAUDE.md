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
- **Sign-in is a modal, not a page:** `PublicLayout` owns its open state and exposes it through `SignInContext` (`hooks/useSignIn.js`). `layouts/AuthLayout.jsx` is the modal shell pattern (portal, scroll lock, focus trap, focus restore, Esc/backdrop close).
- **Dashboard data is placeholder constants** at the top of `pages/Student/Dashboard.jsx` until the sessions/bookings API exists.
- **Component folders** (note the odd names): `Components/uiC` (primitives: Button, Input, Icon, Avatar, Label…), `Components/sharedC` (domain cards/badges), `Components/layoutC` (navbar/sidebars/topbar), `Components/motion` (scroll reveal, count-up).
- **Icons:** every icon must be registered in `Components/uiC/Icon.jsx` (named Lucide imports) and used as `<Icon name="…" size="sm|md|lg" />`. Sizes are restricted to those three.
- **i18n:** locale JSON files exist in `public/locales/{en,fr,ar}` but UI strings are currently hard-coded English.

## Styling

Tailwind v4 with design tokens declared in `@theme` in `src/index.css` (`bg-surface`, `text-fg`, `border-line`, `text-primary-text`, `bg-highlight`, `shadow-pop`, …). Dark mode is class-based (`:root.dark` redefines the same CSS variables, so token classes flip automatically — avoid hard-coded hex colors in new code; `Button`/`Label` still contain some). Theme state is in `hooks/useTheme.js`. Design values follow the Figma file "TANAWAR · Student app v1.1" (e.g. 20px card radius, 46px/38px buttons, 44px inputs).
