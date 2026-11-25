import Button from "../uiC/Button.jsx";
import SessionStatusBadge from "./SessionStatusBadge.jsx";

/** One row of "Your upcoming sessions". `today` tints the date tile red. */
export default function UpcomingRow({
  day,
  time,
  title,
  meta,
  today = false,
  status,
  statusTone,
  actionLabel,
  actionVariant = "outline",
  onAction,
}) {
  return (
    <div className="flex items-center gap-3.5 border-b border-line py-3.5 last:border-b-0">
      <div
        className={`flex size-[58px] shrink-0 flex-col items-center justify-center rounded-xl font-bold ${
          today ? "bg-danger-soft" : "bg-surface-2"
        }`}
      >
        <span className={`text-[11px] leading-4 ${today ? "text-live" : "text-fg-2"}`}>{day}</span>
        <span className="text-sm leading-5 text-fg">{time}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-[15px] font-bold leading-5 text-fg">{title}</p>
        <p className="truncate text-[13px] leading-[19px] text-fg-2">{meta}</p>
      </div>
      {/* Badge + action stack on narrow columns so the title keeps room. */}
      <div className="flex shrink-0 flex-col items-end gap-2 2xl:flex-row 2xl:items-center 2xl:gap-3.5">
        <SessionStatusBadge tone={statusTone}>{status}</SessionStatusBadge>
        <Button size="s" variant={actionVariant} onClick={onAction}>
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}
