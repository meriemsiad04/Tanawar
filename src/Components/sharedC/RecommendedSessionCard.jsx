import Avatar from "../uiC/Avatar.jsx";
import Button from "../uiC/Button.jsx";
import Icon from "../uiC/Icon.jsx";
import SessionStatusBadge from "./SessionStatusBadge.jsx";

/**
 * Recommendation card. `action`: "join" (public) | "request" (private) | "full" (disabled).
 * `session`: { module, status, statusTone, reason, title, host:{initials,name,rating,className},
 *   when, where, whereIcon, booked, capacity, access }
 */
export default function RecommendedSessionCard({ session, onAction }) {
  const { module, status, statusTone, reason, title, host, when, where, whereIcon = "pin", booked, capacity, access } = session;
  const left = capacity - booked;
  const full = left <= 0;
  const percent = Math.min(100, Math.round((booked / capacity) * 100));

  return (
    <article className="flex flex-1 flex-col gap-3.5 rounded-[18px] border border-line bg-surface p-5 transition duration-200 ease-out hover:-translate-y-1 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-lg bg-accent-soft px-2.5 py-[5px] text-xs font-bold leading-4 text-accent-ink">
          {module}
        </span>
        <SessionStatusBadge tone={statusTone}>{status}</SessionStatusBadge>
      </div>

      <p className="flex items-center gap-1.5 text-xs font-bold leading-4 text-primary-text">
        <Icon name="spark" size="sm" className="size-[15px]" /> {reason}
      </p>

      <h3 className="text-[17px] font-bold leading-6 text-fg">{title}</h3>

      <div className="flex items-center gap-2.5">
        <Avatar initials={host.initials} size={30} className={host.className} />
        <span className="text-sm font-bold leading-5 text-fg">
          {host.name} · ★ {host.rating}
        </span>
      </div>

      <ul className="flex flex-col gap-[7px] text-[13px] font-semibold leading-[18px] text-fg-2">
        <li className="flex items-center gap-2">
          <Icon name="calendar" size="sm" className="size-4" /> {when}
        </li>
        <li className="flex items-center gap-2">
          <Icon name={whereIcon} size="sm" className="size-4" /> {where}
        </li>
      </ul>

      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between">
          <span className="text-[13px] leading-[19px] text-fg-2">
            {booked} / {capacity} booked
          </span>
          <span className="text-xs font-bold leading-4 text-primary-text">{full ? "Full" : `${left} left`}</span>
        </div>
        <div
          className="h-[7px] w-full overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Seats taken"
        >
          <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-line pt-3.5">
        <SessionStatusBadge tone={access === "Private" ? "neutral" : "clay"}>{access}</SessionStatusBadge>
        {full ? (
          <Button size="s" variant="outline" disabled className="disabled:opacity-45">
            Full
          </Button>
        ) : access === "Private" ? (
          <Button size="s" variant="secondary" onClick={() => onAction?.(session)}>
            Request to join
          </Button>
        ) : (
          <Button size="s" onClick={() => onAction?.(session)}>
            Join
          </Button>
        )}
      </div>
    </article>
  );
}
