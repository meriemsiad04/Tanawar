import Icon from "../uiC/Icon.jsx";

// Icon per resource kind (see resourcesService RESOURCE_KINDS).
const KIND_ICON = { pdf: "file", video: "video", link: "link", image: "image" };

/**
 * Shared resource tile (Resources page): kind icon, title, module · author, the session it was shared in, open/download link.
 * `resource`: { title, kind, module, author: { name }, url, session?: { id, title } }
 * `onSession(id)` (optional): makes the session name a button, e.g. to filter the page by that session.
 */
export default function ResourceCard({ resource, onSession }) {
  const { title, kind, module, author, url, session } = resource;
  const isLink = kind === "link";
  return (
    <article className="flex items-center gap-3.5 rounded-[18px] border border-line bg-surface p-4 transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-primary-soft text-primary-text">
        <Icon name={KIND_ICON[kind] ?? "file"} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h3 className="truncate text-[15px] font-bold leading-5 text-fg" title={title}>
          {title}
        </h3>
        <p className="truncate text-xs leading-4 text-fg-2">
          {module} · {author.name}
        </p>
        {session &&
          (onSession ? (
            <button
              type="button"
              onClick={() => onSession(session.id)}
              title={`Show resources from “${session.title}”`}
              className="mt-1 inline-flex max-w-full cursor-pointer items-center gap-1 self-start rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-bold leading-4 text-accent-ink hover:bg-accent-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <Icon name="calendar" size="sm" className="!size-3 shrink-0" />
              <span className="truncate">{session.title}</span>
            </button>
          ) : (
            <span className="mt-1 inline-flex max-w-full items-center gap-1 self-start rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-bold leading-4 text-accent-ink">
              <Icon name="calendar" size="sm" className="!size-3 shrink-0" />
              <span className="truncate">{session.title}</span>
            </span>
          ))}
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        {...(isLink ? {} : { download: "" })}
        aria-label={`${isLink ? "Open" : "Download"} ${title}`}
        title={isLink ? "Open" : "Download"}
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
      >
        <Icon name={isLink ? "external" : "download"} size="sm" />
      </a>
    </article>
  );
}
