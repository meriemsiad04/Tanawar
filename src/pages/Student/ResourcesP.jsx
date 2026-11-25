import { useMemo, useState } from "react";
import Button from "../../Components/uiC/Button.jsx";
import Chips from "../../Components/uiC/Chips.jsx";
import Icon from "../../Components/uiC/Icon.jsx";
import { fieldShell } from "../../Components/uiC/fieldShell.js";
import ResourceCard from "../../Components/sharedC/ResourceCard.jsx";
import { useAsync } from "../../hooks/useAsync.js";
import { RESOURCE_KINDS, listResources } from "../../services/resourcesService.js";

const KIND_OPTIONS = [{ value: "", label: "ALL" }, ...RESOURCE_KINDS.map((k) => ({ value: k, label: k.toUpperCase() }))];

const Note = ({ children }) => (
  <div className="flex flex-col items-start gap-3 rounded-[18px] border border-line bg-surface p-5 text-[13px] leading-[19px] text-fg-2">{children}</div>
);

/** Resources shared in sessions: filter by kind, search by title / module / author. */
export default function ResourcesP() {
  const { status, data, reload } = useAsync(listResources);
  const [kind, setKind] = useState("");
  const [query, setQuery] = useState("");

  const all = useMemo(() => data ?? [], [data]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter(
      (r) => (!kind || r.kind === kind) && (!q || [r.title, r.module, r.author?.name].some((t) => t?.toLowerCase().includes(q)))
    );
  }, [all, kind, query]);

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="font-serif text-[30px] font-bold leading-[38px] tracking-[-0.005em] text-fg">Resources</h1>
        <p className="text-[15px] leading-[23px] text-fg-2">
          {status === "ready" ? `${all.length} shared item${all.length === 1 ? "" : "s"}` : "Files and links shared in sessions."}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Chips label="Resource type" value={kind} options={KIND_OPTIONS} onChange={setKind} size="s" />
        <label className={`${fieldShell()} h-11 w-full sm:ml-auto sm:w-[300px]`}>
          <Icon name="search" size="sm" className="text-fg-3 group-focus-within:text-primary-text" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search resources…"
            aria-label="Search resources"
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-3"
          />
        </label>
      </div>

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
            <ResourceCard key={r.id} resource={r} />
          ))}
        </div>
      ) : (
        <Note>{all.length ? "No resource matches your filters." : "No resources yet. Files shared in your sessions will appear here."}</Note>
      )}
    </>
  );
}
