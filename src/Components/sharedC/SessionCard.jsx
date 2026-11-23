import Avatar from "../uiC/Avatar.jsx";
import Button from "../uiC/Button.jsx";
import SessionStatusBadge from "./SessionStatusBadge.jsx";
import Icon from "../uiC/Icon.jsx";

/**
 * Session card (landing "live" example).
 * meta: [{ icon (Icon name), iconClassName, label }] rendered as a 2-column grid of chips.
 * seatsPercent: how full the seats bar is (0–100).
 */
export default function SessionCard({
  status = "Live now",
  statusTone = "live",
  module,
  title,
  host,
  meta = [],
  seatsPercent = 0,
  ctaLabel,
  onCta,
}) {
  return (
    <article className="flex w-full flex-col gap-4 rounded-[20px] bg-surface p-[22px] transition duration-200 ease-out hover:-translate-y-1 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <div className="flex items-center justify-between gap-2">
        <SessionStatusBadge tone={statusTone}>{status}</SessionStatusBadge>
        <SessionStatusBadge tone="clay">{module}</SessionStatusBadge>
      </div>

      <h3 className="text-xl font-bold leading-[27px] text-fg">{title}</h3>

      <div className="flex items-center gap-3">
        <Avatar initials={host.initials} size={44} />
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold leading-5 text-fg">
              {host.name}
            </span>
            <Icon name="check" size="sm" label="Verified" className="text-primary" />
          </div>
          <span className="text-[13px] leading-[19px] text-fg-2">
            {host.meta}
          </span>
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-2.5">
        {meta.map(({ icon, iconClassName, label }) => (
          <li
            key={label}
            className="flex min-w-0 items-center gap-[9px] rounded-[10px] bg-surface-2 px-3 py-[11px]"
          >
            <Icon name={icon} size="sm" className={iconClassName} />
            <span className="text-[13px] font-semibold leading-[18px] text-fg">
              {label}
            </span>
          </li>
        ))}
      </ul>

      <div
        className="h-[7px] w-full overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-valuenow={seatsPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Seats taken"
      >
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${seatsPercent}%` }}
        />
      </div>

      <Button size="m" className="w-full" onClick={onCta}>
        {ctaLabel}
      </Button>
    </article>
  );
}
