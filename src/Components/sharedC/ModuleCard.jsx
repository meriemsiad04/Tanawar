import { moduleAbbr } from "../../services/studentsService.js";

// Token-based tile colours, picked deterministically from the module code.
const TILES = ["bg-primary text-white", "bg-accent text-white", "bg-highlight text-ink", "bg-ink text-white"];
const tileFor = (code = "") => TILES[[...code].reduce((n, c) => n + c.charCodeAt(0), 0) % TILES.length];

/** Horizontal module card: coloured abbreviation tile, name, code · published sessions. Links to the module's sessions. */
export default function ModuleCard({ module }) {
  const { code, name, publishedSessions = 0 } = module;
  return (
    <a
      href={`/app/sessions?module=${encodeURIComponent(code)}`}
      className="group flex items-center gap-3.5 rounded-[18px] border border-line bg-surface p-4 transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <span className={`flex size-12 shrink-0 items-center justify-center rounded-[14px] text-[13px] font-extrabold ${tileFor(code)}`}>
        {moduleAbbr(module)}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-[15px] font-bold leading-5 text-fg group-hover:text-primary-text">{name}</span>
        <span className="truncate text-xs leading-4 text-fg-2">
          {code} · {publishedSessions} session{publishedSessions === 1 ? "" : "s"}
        </span>
      </span>
    </a>
  );
}
