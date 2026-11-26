/**
 * Demo mode: the dev-only stand-ins (demo accounts, demoRegistry, demo study rooms,
 * placeholder data) are active in `npm run dev`, and in a production build only when
 * `VITE_DEMO_MODE=true` is set at build time (e.g. a Vercel preview for showing the UI).
 * Without that variable they are compiled out of production builds.
 */
export const DEMO_MODE = import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE === "true";
