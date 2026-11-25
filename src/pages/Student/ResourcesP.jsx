import { useMemo, useState } from "react";
import Button from "../../Components/uiC/Button.jsx";
import Chips from "../../Components/uiC/Chips.jsx";
import Dropdown from "../../Components/uiC/Dropdown.jsx";
import Icon from "../../Components/uiC/Icon.jsx";
import { fieldShell } from "../../Components/uiC/fieldShell.js";
import ResourceCard from "../../Components/sharedC/ResourceCard.jsx";
import { useAsync } from "../../hooks/useAsync.js";
import { RESOURCE_KINDS, listResources } from "../../services/resourcesService.js";

const KIND_OPTIONS = [{ value: "", label: "ALL" }, ...RESOURCE_KINDS.map((k) => ({ value: k, label: k.toUpperCase() }))];

const Note = ({ children }) => (
  <div className="flex flex-col items-start gap-3 rounded-[18px] border border-line bg-surface p-5 text-[13px] leading-[19px] text-fg-2">{children}</div>
);

// Links can pre-fill the filters: ?module=<module name> and ?session=<session id> (e.g. from a classroom).
const fromUrl = () => {
  const p = new URLSearchParams(window.location.search);
  return { module: p.get("module") ?? "", session: p.get("session") ?? "" };
};

const byLabel = (a, b) => a.label.localeCompare(b.label);

/** Resources shared in sessions: filter by type, module and session; search by title / module / session / author. */
export default function ResourcesP() {
  const { status, data, reload } = useAsync(listResources);
  const [kind, setKind] = useState("");
  const [query, setQuery] = useState("");
  const [module, setModule] = useState(() => fromUrl().module);
  const [session, setSession] = useState(() => fromUrl().session);

  const all = useMemo(() => data ?? [], [data]);

  // Dropdown options come from the resources themselves, so only modules / sessions that have something are listed.
  const moduleOptions = useMemo(() => [...new Set(all.map((r) => r.module).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [all]);
  // Sessions follow the chosen module: picking "Algorithms" only offers Algorithms sessions.
  const sessionOptions = useMemo(() => {
    const seen = new Map();
    for (const r of all) {
      if (r.session && (!module || r.module === module) && !seen.has(r.session.id)) seen.set(r.session.id, { value: r.session.id, label: r.session.title });
    }
    return [...seen.values()].sort(byLabel);
  }, [all, module]);

  const pickModule = (next) => {
    setModule(next);
    // Drop a session that doesn't belong to the newly chosen module.
    if (next && session && !all.some((r) => r.session?.id === session && r.module === next)) setSession("");
  };
  // Choosing a session also selects its module, so the two filters never contradict each other.
  const pickSession = (next) => {
    setSession(next);
    const owner = all.find((r) => r.session?.id === next);
    if (owner && !module) setModule(owner.module);
  };

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter(
      (r) =>
        (!kind || r.kind === kind) &&
        (!module || r.module === module) &&
        (!session || r.session?.id === session) &&
        (!q || [r.title, r.module, r.session?.title, r.author?.name].some((t) => t?.toLowerCase().includes(q)))
    );
  }, [all, kind, module, session, query]);

  const filtered = Boolean(kind || module || session || query.trim());
  const clear = () => {
    setKind("");
    setModule("");
    setSession("");
    setQuery("");
  };

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="font-serif text-[30px] font-bold leading-[38px] tracking-[-0.005em] text-fg">Resources</h1>
        <p className="text-[15px] leading-[23px] text-fg-2">
          {status === "ready"
            ? filtered
              ? `${shown.length} of ${all.length} shared item${all.length === 1 ? "" : "s"}`
              : `${all.length} shared item${all.length === 1 ? "" : "s"}`
            : "Files and links shared in sessions."}
        </p>
      </div>

      <section aria-label="Filter resources" className="flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-5">
        <div className="flex flex-col gap-3 lg:flex-row">
          <label className={`${fieldShell()} h-11 min-w-0 flex-1`}>
            <Icon name="search" size="sm" className="text-fg-3 group-focus-within:text-primary-text" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, module, session, author…"
              aria-label="Search resources"
              className="h-full min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-3"
            />
          </label>
          <div className="min-w-0 lg:w-[220px]">
            <Dropdown ariaLabel="Module" icon="books" placeholder="All modules" value={module} onChange={pickModule} options={moduleOptions} emptyOption />
          </div>
          <div className="min-w-0 lg:w-[280px]">
            <Dropdown
              ariaLabel="Session"
              icon="calendar"
              placeholder={module ? `All ${module} sessions` : "All sessions"}
              value={session}
              onChange={pickSession}
              options={sessionOptions}
              emptyOption
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span aria-hidden="true" className="text-xs font-extrabold uppercase leading-4 tracking-[0.14em] text-fg-3">Type</span>
          <Chips label="Resource type" value={kind} options={KIND_OPTIONS} onChange={setKind} size="s" />
          {filtered && (
            <button
              type="button"
              onClick={clear}
              className="ml-auto cursor-pointer rounded-md text-[13px] font-bold text-primary-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              Clear filters
            </button>
          )}
        </div>
      </section>

      {status === "loading" ? (
        <Note>Loading resources…</Note>
      ) : status === "error" ? (
        <Note>
          Resources aren’t available right now.
          <Button variant="outline" size="s" onClick={reload}>
            Try again
          </Button>
        </Note>
      ) : shown.length ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((r) => (
            <ResourceCard key={r.id} resource={r} onSession={(id) => pickSession(id)} />
          ))}
        </div>
      ) : (
        <Note>
          {all.length ? "No resource matches your filters." : "No resources yet. Files shared in your sessions will appear here."}
          {filtered && all.length > 0 && (
            <Button variant="outline" size="s" onClick={clear}>
              Clear filters
            </Button>
          )}
        </Note>
      )}
    </>
  );
}
