import Avatar from "../uiC/Avatar.jsx";
import Button from "../uiC/Button.jsx";
import Icon from "../uiC/Icon.jsx";
import SessionStatusBadge from "./SessionStatusBadge.jsx";
import { publicationOf, sessionPlace, sessionState } from "../../services/sessionsService.js";
import { studentPath } from "../../services/studentsService.js";

const initialsOf = (n = "") => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

/** "Wed 25 Nov, 18:00" */
const formatWhen = (iso) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}, ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
};

/** Badge with a leading icon (mode / visibility). */
const Tag = ({ tone, icon, children }) => (
  <SessionStatusBadge tone={tone}>
    <span className="inline-flex items-center gap-1">
      <Icon name={icon} size="sm" className="!size-3.5" />
      {children}
    </span>
  </SessionStatusBadge>
);

/** Moderation states other than "published" (see publicationOf): card badge and disabled footer button. */
const MODERATION = {
  pending: { badge: "Awaiting approval", tone: "warn", icon: "clock", action: "Waiting for admin approval" },
  rejected: { badge: "Not approved", tone: "clay", icon: "circleX", action: "Not approved by an admin" },
  cancelled: { badge: "Cancelled", tone: "neutral", icon: "ban", action: "Session cancelled" },
  removed: { badge: "Removed", tone: "clay", icon: "trash", action: "Removed by a moderator" },
};

const Meta = ({ icon, className = "", children }) => (
  <li className={`flex min-w-0 items-center gap-2 ${className}`}>
    <Icon name={icon} size="sm" className="!size-4 text-fg-3" />
    <span className="truncate">{children}</span>
  </li>
);

/** Secondary text button next to the main one (Leave, Cancel). */
const TextAction = ({ children, ...rest }) => (
  <button
    type="button"
    className="h-[46px] cursor-pointer rounded-xl px-4 text-sm font-bold text-fg-2 hover:text-fg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
    {...rest}
  >
    {children}
  </button>
);

/**
 * Footer button, picked from the student's relation to the session:
 * host → Enter classroom (outline) · joined → Enter classroom + Leave · pending → Pending + Cancel
 * full → Full (disabled) · private → Request to join · public → Join session.
 * A session that isn't published (waiting for approval, rejected, cancelled, removed) can't be joined or entered.
 */
function CardAction({ session, busy, onAction, onCancel, onEnter, onLeave }) {
  const { myStatus, visibility, seats, joined } = session;
  const publication = publicationOf(session);

  if (publication !== "published")
    return (
      <Button variant="outline" size="m" disabled className="w-full disabled:opacity-60">
        <Icon name={MODERATION[publication].icon} size="sm" /> {MODERATION[publication].action}
      </Button>
    );

  if (myStatus === "host")
    return (
      <Button variant="outline" size="m" className="w-full" onClick={() => onEnter?.(session)}>
        Enter classroom
      </Button>
    );
  if (myStatus === "joined")
    return (
      <div className="flex items-center gap-2">
        <Button size="m" className="flex-1" onClick={() => onEnter?.(session)}>
          Enter classroom
        </Button>
        <TextAction onClick={() => onLeave?.(session)} disabled={busy}>
          Leave
        </TextAction>
      </div>
    );
  if (myStatus === "pending")
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" size="m" disabled className="flex-1 disabled:opacity-70">
          <Icon name="clock" size="sm" /> Pending
        </Button>
        <TextAction onClick={() => onCancel?.(session)} disabled={busy}>
          Cancel
        </TextAction>
      </div>
    );
  if (seats - joined <= 0)
    return (
      <Button variant="outline" size="m" disabled className="w-full disabled:opacity-45">
        Full
      </Button>
    );
  if (visibility === "private")
    return (
      <Button variant="secondary" size="m" className="w-full" disabled={busy} onClick={() => onAction?.(session)}>
        <Icon name="lock" size="sm" /> Request to join
      </Button>
    );
  return (
    <Button size="m" className="w-full" disabled={busy} onClick={() => onAction?.(session)}>
      Join session
    </Button>
  );
}

/**
 * Session card for the Sessions page (Lovable layout, Figma tokens).
 * `session`: { title, description, module, level, startsAt, durationMin, seats, joined, mode, meetingLink, location,
 *   visibility, host: { name, rating, verified, className }, myStatus }
 * `onAction`: join (public) or request to join (private), chosen by the page. `onCancel`: withdraw a pending request. `busy` disables it while the request is in flight.
 * `reasons` (optional, "For you" page): why the session is recommended, shown as a strip at the top of the card.
 */
export default function SessionListCard({ session, reasons = [], busy = false, onAction, onCancel, onEnter, onLeave }) {
  const { title, description, module, startsAt, durationMin, seats, joined, mode, visibility, host } = session;
  const left = Math.max(0, seats - joined);
  const percent = Math.min(100, Math.round((joined / seats) * 100));
  const online = mode === "online";
  const state = sessionState(session);
  const moderation = MODERATION[publicationOf(session)];

  return (
    <article className="flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-5 transition duration-200 ease-out hover:-translate-y-1 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      {reasons.length > 0 && (
        <ul aria-label="Why it’s recommended" className="-mx-5 -mt-5 flex flex-wrap gap-1.5 rounded-t-[20px] border-b border-accent-line bg-accent-soft/60 px-5 py-3">
          {reasons.map((r) => (
            <li key={r} className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-[5px] text-xs font-bold leading-4 text-accent-ink">
              <Icon name="spark" size="sm" className="!size-3.5" /> {r}
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {moderation ? (
          <Tag tone={moderation.tone} icon={moderation.icon}>{moderation.badge}</Tag>
        ) : (
          <>
            {state === "live" && <SessionStatusBadge tone="live">Live now</SessionStatusBadge>}
            {state === "ended" && <SessionStatusBadge tone="neutral">Ended</SessionStatusBadge>}
          </>
        )}
        <span className="rounded-lg bg-accent-soft px-2.5 py-[5px] text-xs font-bold leading-4 text-accent-ink">{module}</span>
        {online ? (
          <Tag tone="joined" icon="wifi">Online</Tag>
        ) : (
          <Tag tone="warn" icon="pin">On-site</Tag>
        )}
        {visibility === "private" ? (
          <Tag tone="neutral" icon="lock">Private</Tag>
        ) : (
          <Tag tone="neutral" icon="globe">Public</Tag>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="text-[17px] font-bold leading-6 text-fg">{title}</h3>
        {description && <p className="line-clamp-2 text-sm leading-5 text-fg-2">{description}</p>}
        {moderation && session.statusReason && (
          <p className="mt-1 rounded-[10px] bg-surface-2 px-3 py-2 text-[13px] leading-[18px] text-fg-2">
            <b className="text-fg">Reason:</b> {session.statusReason}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        <Avatar initials={initialsOf(host.name)} size={30} className={host.className} />
        <span className="flex min-w-0 flex-1 items-center gap-1.5 text-sm font-bold leading-5 text-fg">
          {host.id && host.id !== "me" ? (
            <a href={studentPath(host.id)} className="truncate hover:underline">
              {host.name}
            </a>
          ) : (
            <span className="truncate">{host.name}</span>
          )}
          {host.verified && <Icon name="verified" size="sm" label="Verified" className="!size-4 text-primary" />}
        </span>
        {host.rating != null && (
          <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-fg-2">
            <Icon name="star" size="sm" label="Rating" className="!size-3.5 fill-highlight text-highlight" />
            {Number(host.rating).toFixed(1)}
          </span>
        )}
      </div>

      <ul className="grid grid-cols-2 gap-x-3 gap-y-[7px] text-[13px] font-semibold leading-[18px] text-fg-2">
        <Meta icon="calendar">{formatWhen(startsAt)}</Meta>
        {durationMin ? <Meta icon="clock">{durationMin} min</Meta> : <li />}
        <Meta icon={online ? "video" : "pin"} className="col-span-2">
          {sessionPlace(session)}
        </Meta>
      </ul>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold leading-[19px] text-fg">
            <Icon name="users" size="sm" className="!size-4 text-fg-3" />
            {joined}/{seats}
          </span>
          <span className={`text-xs font-bold leading-4 ${left === 0 ? "text-live" : "text-fg-2"}`}>
            {left} spot{left === 1 ? "" : "s"} left
          </span>
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

      <div className="mt-auto pt-1">
        <CardAction session={session} busy={busy} onAction={onAction} onCancel={onCancel} onEnter={onEnter} onLeave={onLeave} />
      </div>
    </article>
  );
}
