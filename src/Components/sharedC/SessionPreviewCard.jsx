import Avatar from "../uiC/Avatar.jsx";
import Icon from "../uiC/Icon.jsx";
import SessionStatusBadge from "./SessionStatusBadge.jsx";

const Placeholder = ({ children }) => <span className="text-fg-3">{children}</span>;

const Fact = ({ icon, children, className = "" }) => (
  <span className={`inline-flex min-w-0 items-center gap-2 text-[15px] leading-5 text-fg-2 ${className}`}>
    <Icon name={icon} size="sm" className="text-accent" />
    <span className="truncate">{children}</span>
  </span>
);

/**
 * Read-only card showing how a session will look once created (Create Session live preview).
 * session: { type, title, module, level, duration, seats, mode, link, location, description,
 *   resources:[{ id, kind: "file"|"link", name, href }], visibility, whenLabel }
 * host: { initials, name }
 * Empty fields fall back to muted placeholders so the layout never jumps.
 */
export default function SessionPreviewCard({ session, host }) {
  const { type, title, module, level, duration, seats, mode, link, location, description, resources, visibility, whenLabel } =
    session;
  const instant = type === "instant";
  const online = mode === "online";

  return (
    <article className="overflow-hidden rounded-[20px] border border-line bg-surface shadow-raised">
      <div className="relative flex h-32 items-center justify-center bg-gradient-to-br from-accent-soft via-primary-soft to-accent-line">
        <Icon name="cap" size="lg" className="!size-14 text-primary" />
      </div>

      <div className="flex flex-col gap-3.5 p-5">
        <div>
          <SessionStatusBadge tone={instant ? "joined" : "clay"}>
            <Icon name={instant ? "bolt" : "calendar"} size="sm" className="mr-1 !size-3.5" />
            {instant ? "Instant" : "Scheduled"}
          </SessionStatusBadge>
        </div>

        <h3 className="break-words text-2xl font-bold leading-8 text-fg">
          {title.trim() || <Placeholder>Your session title</Placeholder>}
        </h3>

        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <Fact icon="books">{module || <Placeholder>Module</Placeholder>}</Fact>
          <Fact icon="levels">{level || <Placeholder>Level</Placeholder>}</Fact>
          <Fact icon={instant ? "clock" : "calendar"}>
            {instant ? (duration ? `${duration} min` : <Placeholder>Duration</Placeholder>) : whenLabel || <Placeholder>Date & time</Placeholder>}
          </Fact>
          <Fact icon="users">{seats ? `${seats} seat${Number(seats) === 1 ? "" : "s"}` : <Placeholder>Seats</Placeholder>}</Fact>
          <Fact icon={online ? "wifi" : "pin"} className="font-semibold text-fg">
            {online ? "Online" : "On-site"}
          </Fact>
          <Fact icon={online ? "link" : "pin"}>
            {(online ? link.trim() : location) || <Placeholder>{online ? "Meeting link" : "Location"}</Placeholder>}
          </Fact>
        </div>

        <p className="break-words border-t border-line pt-3.5 text-[15px] leading-6 text-fg-2">
          {description.trim() || <Placeholder>Your description will appear here.</Placeholder>}
        </p>

        {resources.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-line pt-3.5">
            <p className="flex items-center gap-2 text-sm font-bold text-fg">
              <Icon name="paperclip" size="sm" className="text-accent" /> Resources
            </p>
            <ul className="flex flex-col gap-2">
              {resources.map((r) => (
                <li key={r.id}>
                  <a
                    href={r.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm text-fg transition-colors hover:border-line-strong"
                  >
                    <Icon name={r.kind === "link" ? "link" : r.isImage ? "image" : "file"} size="sm" className="text-accent" />
                    <span className="min-w-0 flex-1 truncate">{r.name}</span>
                    <Icon name="external" size="sm" className="!size-4 text-fg-3" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-line pt-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar initials={host.initials} size={44} />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-5 text-fg">{host.name}</p>
              <p className="truncate text-[13px] leading-[18px] text-fg-3">{instant ? "Starts now" : whenLabel || "Date to be set"}</p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-[13px] font-semibold text-fg-2">
            <Icon name={visibility === "public" ? "globe" : "lock"} size="sm" className="!size-4" />
            {visibility === "public" ? "Public" : "Private"}
          </span>
        </div>
      </div>
    </article>
  );
}
