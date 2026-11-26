import Icon from "../uiC/Icon.jsx";
import { SESSION_STATUS } from "../../services/adminSessionsService.js";

const PILL = "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold leading-none";

/**
 * Session status pill for the admin session views (Pending / Approved / Active / Completed / Cancelled / Rejected).
 * `removed`: adds a "Removed" pill (soft-deleted by a moderator, hidden from students).
 */
export default function AdminSessionStatusBadge({ status, removed = false }) {
  const s = SESSION_STATUS[status] ?? SESSION_STATUS.pending;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className={`${PILL} ${s.className}`}>
        {status === "active" ? <span aria-hidden="true" className="size-[7px] animate-pulse rounded-full bg-success motion-reduce:animate-none" /> : <Icon name={s.icon} size="sm" className="!size-3.5" />}
        {s.label}
      </span>
      {removed && (
        <span className={`${PILL} bg-danger-soft text-live`}>
          <Icon name="trash" size="sm" className="!size-3.5" />
          Removed
        </span>
      )}
    </span>
  );
}
