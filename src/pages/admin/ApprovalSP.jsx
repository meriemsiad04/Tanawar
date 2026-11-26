import SessionsDirectory from "./sessions/SessionsDirectory.jsx";

/** Admin: scheduled sessions waiting for approval (/admin/sessions/approvals). Spec: docs/session-management.md. */
export default function ApprovalSP() {
  return <SessionsDirectory mode="approvals" />;
}
