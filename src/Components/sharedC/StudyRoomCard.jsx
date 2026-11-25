import Button from "../uiC/Button.jsx";
import Icon from "../uiC/Icon.jsx";
import Avatar from "../uiC/Avatar.jsx";
import StudyIllustration from "./StudyIllustration.jsx";
import { avatarFill, initialsOf } from "./studyUi.js";
import { fmtDuration, liveRoomSeconds } from "../../services/studyRoomsService.js";

/** "Studying now" pill with a pulsing dot; "Quiet now" when nobody is there. */
export function LiveCount({ count, onDark = false }) {
  if (!count) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold leading-4 ${onDark ? "bg-white/10 text-on-dark-2" : "bg-surface/90 text-fg-2"}`}>
        Quiet now
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold leading-4 ${onDark ? "bg-white/10 text-white" : "bg-surface/90 text-fg"}`}>
      <span className="live-pulse size-2 rounded-full bg-[#2fa37a]" aria-hidden="true" />
      {count} studying
    </span>
  );
}

/**
 * Study room tile for the rooms list. `snapshot` is the list response (its receivedAt anchors the live totals);
 * `now` comes from useNow(). `mine`: the student is studying in this room right now.
 */
export default function StudyRoomCard({ room, snapshot, now, mine = false, busy = false, onJoin }) {
  const total = liveRoomSeconds(room, snapshot, now);
  const people = room.participants ?? [];
  const shown = people.slice(0, 3);
  const extra = room.activeCount - Math.min(room.activeCount, 3);
  const names = people.slice(0, 2).map((p) => p.fullName.split(" ")[0]);

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-[20px] border bg-surface transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-raised ${
        mine ? "border-primary ring-2 ring-primary/25" : "border-line"
      }`}
    >
      {/* The room, seen through the door */}
      <div className="relative h-[132px] overflow-hidden bg-accent-soft">
        <span aria-hidden="true" className="absolute -left-10 -top-12 size-40 rounded-full bg-highlight/25 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-center">
          {shown.length ? (
            shown.map((p, i) => (
              <StudyIllustration
                key={p.id}
                seed={p.id}
                className={`w-[112px] shrink-0 ${i > 0 ? "-ml-7" : ""} ${shown.length === 1 ? "w-[132px]" : ""}`}
              />
            ))
          ) : (
            <StudyIllustration seed={room.id} pose="empty" className="w-[132px]" />
          )}
        </div>
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <LiveCount count={room.activeCount} />
          {extra > 0 && (
            <span className="rounded-full bg-surface/90 px-2 py-1 text-xs font-bold leading-4 text-fg-2">+{extra} more</span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-extrabold uppercase leading-4 tracking-[0.12em] text-primary-text">{room.module}</p>
          <h3 className="line-clamp-2 text-[17px] font-extrabold leading-6 text-fg">{room.title}</h3>
          <p className="truncate text-[13px] leading-[19px] text-fg-3">Opened by {room.creator?.fullName ?? "a student"}</p>
        </div>
        {room.description && <p className="line-clamp-2 text-[13px] leading-[19px] text-fg-2">{room.description}</p>}

        <dl className="mt-auto grid grid-cols-2 gap-2 rounded-[14px] bg-surface-2 p-3">
          <div className="flex flex-col gap-0.5">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-fg-3">Studied here</dt>
            <dd className="text-[15px] font-extrabold tabular-nums text-fg">{fmtDuration(total)}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-fg-3">At their desks</dt>
            <dd className="flex items-center gap-2">
              {people.length ? (
                <span className="flex -space-x-2">
                  {people.slice(0, 4).map((p) => (
                    <Avatar key={p.id} initials={initialsOf(p.fullName)} src={p.avatarUrl} size={24} className={`${avatarFill(p.id)} ring-2 ring-surface-2`} />
                  ))}
                </span>
              ) : (
                <span className="text-[15px] font-extrabold text-fg">0</span>
              )}
            </dd>
          </div>
        </dl>
        {names.length > 0 && (
          <p className="-mt-1 truncate text-xs leading-4 text-fg-3">
            {names.join(", ")}
            {room.activeCount > names.length ? ` and ${room.activeCount - names.length} more` : ""} {room.activeCount === 1 ? "is" : "are"} studying
          </p>
        )}

        {mine ? (
          <Button variant="primary" size="s" onClick={() => onJoin?.(room)} className="w-full">
            <Icon name="lamp" size="sm" /> Back to your desk
          </Button>
        ) : (
          <Button variant="outline" size="s" onClick={() => onJoin?.(room)} disabled={busy} className="w-full dark:bg-surface dark:text-fg">
            <Icon name="enter" size="sm" /> {busy ? "Joining…" : "Join room"}
          </Button>
        )}
      </div>
    </article>
  );
}
