import Icon from "../uiC/Icon.jsx";

// Icon per resource kind (see resourcesService RESOURCE_KINDS).
const KIND_ICON = { pdf: "file", video: "video", link: "link", image: "image" };

/**
 * Shared resource tile (Resources page): kind icon, title, module · author, open/download link.
 * `resource`: { title, kind, module, author: { name }, url }
 */
export default function ResourceCard({ resource }) {
  const { title, kind, module, author, url } = resource;
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
