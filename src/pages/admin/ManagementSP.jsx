import SessionsDirectory from "./sessions/SessionsDirectory.jsx";

/** Admin: every session on the platform (/admin/sessions). Spec: docs/session-management.md. */
export default function ManagementSP() {
  return <SessionsDirectory mode="all" />;
}
