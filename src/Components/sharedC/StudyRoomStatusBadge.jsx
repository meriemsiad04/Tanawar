import Icon from "../uiC/Icon.jsx";
import { ROOM_STATUS } from "../../services/adminStudyRoomsService.js";

/** Study room status pill for the admin views (Active / Ended / Closed). Active gets a live pulse dot. */
export default function StudyRoomStatusBadge({ status }) {
  const s = ROOM_STATUS[status] ?? ROOM_STATUS.ended;
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold leading-none ${s.className}`}>
      {status === "active" ? (
        <span aria-hidden="true" className="size-[7px] animate-pulse rounded-full bg-success motion-reduce:animate-none" />
      ) : (
        <Icon name={s.icon} size="sm" className="!size-3.5" />
      )}
      {s.label}
    </span>
  );
}
