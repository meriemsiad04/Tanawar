import { useEffect, useState } from "react";
import Button from "../../../Components/uiC/Button.jsx";
import Icon from "../../../Components/uiC/Icon.jsx";
import Input from "../../../Components/uiC/Input.jsx";
import Dropdown from "../../../Components/uiC/Dropdown.jsx";
import Chips from "../../../Components/uiC/Chips.jsx";
import Avatar from "../../../Components/uiC/Avatar.jsx";
import StudyRoomStatusBadge from "../../../Components/sharedC/StudyRoomStatusBadge.jsx";
import { ROOM_STATUS, fmtNum, fmtStudy, listStudyRoomsAdmin } from "../../../services/adminStudyRoomsService.js";
import { adminErrorText, fmtDay, initialsOf } from "../students/format.js";

const EMPTY_FILTERS = { visibility: "", module: "", host: "", from: "", to: "", reported: false };
const STATUS_CHIPS = [{ value: "", label: "All" }, ...Object.entries(ROOM_STATUS).map(([value, s]) => ({ value, label: s.label }))];
const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
];
const DEFAULT_SORT = { by: "createdAt", order: "desc" };

/**
 * Study rooms table: search, status chips, filters (visibility, module, host, creation date, reported), sorting and
 * pagination. Rows open the room details (`onOpen(id, items, index)`); the row menu closes / reopens a room.
 * `version` changes after any moderation action so the table reloads.
 */
export default function StudyRoomsTable({ version, openId, onOpen, onPage, onQuickAction }) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState({ q: "", host: "" });
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [status, setStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState({ key: null, data: null, error: null });

  useEffect(() => {
    const t = setTimeout(() => setDebounced({ q: query, host: filters.host }), 300);
    return () => clearTimeout(t);
  }, [query, filters.host]);

  const key = JSON.stringify([debounced, { ...filters, host: undefined }, status, sort, page, tick, version]);
  useEffect(() => {
    let active = true;
    const [d, f, st, s, p] = JSON.parse(key);
    listStudyRoomsAdmin({ ...f, q: d.q, host: d.host, status: st, reported: f.reported ? "true" : "", sort: s.by, order: s.order, page: p }).then(
      (data) => {
        if (!active) return;
        if (data.items.length === 0 && p > 1 && data.total > 0) setPage(Math.ceil(data.total / data.pageSize));
        else setResult({ key, data, error: null });
      },
      (error) => active && setResult({ key, data: null, error })
    );
    return () => {
      active = false;
    };
  }, [key]);

  const loading = result.key !== key;
  const data = result.data;
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 12;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = (page - 1) * pageSize + 1;
  const showVisibility = data?.visibilityAvailable !== false;

  // The page keeps the current rows so the details dialog can step through them.
  useEffect(() => {
    if (data) onPage?.(items, first, total);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const activeFilters = Object.values(filters).filter(Boolean).length;
  const filtered = Boolean(query.trim()) || activeFilters > 0 || Boolean(status);
  const setFilter = (name) => (value) => {
    setFilters((f) => ({ ...f, [name]: value }));
    setPage(1);
  };
  const toggleSort = (by) => {
    setSort((s) => (s.by === by ? { by, order: s.order === "asc" ? "desc" : "asc" } : { by, order: by === "title" ? "asc" : "desc" }));
    setPage(1);
  };
  const clearAll = () => {
    setFilters(EMPTY_FILTERS);
    setQuery("");
    setStatus("");
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            className="sm:max-w-[440px] sm:flex-1"
            icon="search"
            type="search"
            placeholder="Search by room name, description or module"
            aria-label="Search study rooms"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
          <div className="flex items-center gap-2">
            <Button
              size="s"
              variant="outline"
              className="h-11 !border-line-strong !bg-surface !text-fg hover:!bg-surface-2"
              aria-expanded={showFilters}
              aria-controls="room-filters"
              onClick={() => setShowFilters((v) => !v)}
            >
              <Icon name="sliders" size="sm" />
              Filters
              {activeFilters > 0 && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[11px] leading-none text-white">{activeFilters}</span>}
            </Button>
            {filtered && (
              <button type="button" onClick={clearAll} className="cursor-pointer rounded-lg px-2 py-1 text-[13px] font-bold text-primary-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                Clear all
              </button>
            )}
          </div>
        </div>

        <Chips
          label="Status"
          size="s"
          value={status}
          options={STATUS_CHIPS}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        />

        {showFilters && (
          <div id="room-filters" className="animate-dialog-in grid grid-cols-1 gap-3 rounded-[20px] border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {showVisibility && <FilterField label="Visibility" value={filters.visibility} onChange={setFilter("visibility")} options={VISIBILITY_OPTIONS} all="Public and private" />}
            <FilterField label="Module" value={filters.module} onChange={setFilter("module")} options={data?.facets.modules ?? []} all="All modules" none="No modules yet" />
            <Input label="Host" icon="user" placeholder="Name or matricule" value={filters.host} onChange={(e) => setFilter("host")(e.target.value)} />
            <Input label="Created from" icon="calendar" type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => setFilter("from")(e.target.value)} />
            <Input label="Created to" icon="calendar" type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => setFilter("to")(e.target.value)} />
            <label className="flex h-11 cursor-pointer items-center gap-2.5 self-end rounded-[10px] border border-line-strong px-3 text-sm font-semibold text-fg">
              <input type="checkbox" checked={filters.reported} onChange={(e) => setFilter("reported")(e.target.checked)} className="size-4 accent-primary" />
              <Icon name="flag" size="sm" className="text-warn" /> Reported only
            </label>
          </div>
        )}
      </div>

      <section aria-busy={loading} aria-label="Study rooms" className="overflow-hidden rounded-[20px] border border-line bg-surface">
        {!data && loading ? (
          <TableSkeleton />
        ) : result.error && !loading ? (
          <div role="alert" className="flex flex-col items-center gap-3 px-5 py-14 text-center text-sm text-fg-2">
            <Icon name="warning" size="lg" className="text-warn" />
            <p>{adminErrorText(result.error, "We couldn't load the study rooms.")}</p>
            <Button size="s" variant="outline" onClick={() => setTick((t) => t + 1)}>Try again</Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-14 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-surface-2 text-fg-3"><Icon name="lamp" size="lg" /></span>
            <p className="text-sm font-semibold text-fg">{filtered ? "No study room matches these filters." : "No study rooms have been opened yet."}</p>
            {filtered && (
              <button type="button" onClick={clearAll} className="cursor-pointer text-[13px] font-bold text-primary-text hover:underline">Clear the filters</button>
            )}
          </div>
        ) : (
          <div className={`transition-opacity ${loading ? "opacity-60" : ""}`}>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-[13px] font-bold text-fg-2">
                    <th scope="col" className="w-14 py-3.5 pl-5"><span className="sr-only">Open</span></th>
                    <SortHeader label="Room" by="title" sort={sort} onSort={toggleSort} />
                    <th scope="col" className="px-3 py-3.5">Host</th>
                    <SortHeader label="Participants" by="participants" sort={sort} onSort={toggleSort} />
                    <SortHeader label="Created" by="createdAt" sort={sort} onSort={toggleSort} />
                    <SortHeader label="Study time" by="totalSeconds" sort={sort} onSort={toggleSort} />
                    {showVisibility && <th scope="col" className="px-3 py-3.5">Visibility</th>}
                    <th scope="col" className="px-3 py-3.5">Status</th>
                    <th scope="col" className="px-3 py-3.5 pr-5 text-right"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {items.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => onOpen(r.id)}
                      className={`cursor-pointer align-middle transition-colors hover:bg-surface-2/60 ${openId === r.id ? "bg-surface-2/60" : ""}`}
                    >
                      <td className="py-3 pl-5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpen(r.id);
                          }}
                          aria-label={`View details of ${r.title}`}
                          aria-haspopup="dialog"
                          className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg text-fg-2 hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                          <Icon name="eye" size="sm" />
                        </button>
                      </td>
                      <td className="max-w-[300px] px-3 py-3">
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate font-bold text-fg">{r.title}</span>
                            {r.openReports > 0 && <ReportsBadge count={r.openReports} />}
                          </span>
                          <span className="truncate text-[13px] text-fg-3">{r.module ?? "—"}</span>
                        </div>
                      </td>
                      <td className="max-w-[200px] px-3 py-3"><HostCell host={r.host} /></td>
                      <td className="whitespace-nowrap px-3 py-3"><ParticipantsCell room={r} /></td>
                      <td className="whitespace-nowrap px-3 py-3 text-fg-2">{fmtDay(r.createdAt)}</td>
                      <td className="whitespace-nowrap px-3 py-3 font-semibold tabular-nums text-fg">{fmtStudy(r.totalSeconds)}</td>
                      {showVisibility && <td className="px-3 py-3"><VisibilityTag visibility={r.visibility} /></td>}
                      <td className="px-3 py-3"><StudyRoomStatusBadge status={r.status} /></td>
                      <td className="px-3 py-3 pr-5 text-right" onClick={(e) => e.stopPropagation()}>
                        <QuickAction room={r} onAction={onQuickAction} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* < lg: stacked cards */}
            <ul className="divide-y divide-line lg:hidden">
              {items.map((r) => (
                <li key={r.id} className="flex flex-col gap-3 px-4 py-3.5">
                  <button type="button" onClick={() => onOpen(r.id)} aria-haspopup="dialog" className="flex w-full cursor-pointer flex-col gap-2 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                    <span className="flex items-start gap-2">
                      <span className="min-w-0 flex-1 text-sm font-bold text-fg">{r.title}</span>
                      <StudyRoomStatusBadge status={r.status} />
                    </span>
                    <span className="text-xs text-fg-2">{r.host.fullName} · {r.module}</span>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-fg-2">
                      <ParticipantsCell room={r} />
                      <span className="inline-flex items-center gap-1"><Icon name="timer" size="sm" className="!size-3.5 text-fg-3" /> {fmtStudy(r.totalSeconds)}</span>
                      <span className="inline-flex items-center gap-1"><Icon name="calendar" size="sm" className="!size-3.5 text-fg-3" /> {fmtDay(r.createdAt)}</span>
                      {showVisibility && <VisibilityTag visibility={r.visibility} />}
                      {r.openReports > 0 && <ReportsBadge count={r.openReports} />}
                    </span>
                  </button>
                  <div className="flex justify-end"><QuickAction room={r} onAction={onQuickAction} labelled /></div>
                </li>
              ))}
            </ul>

            <nav aria-label="Pagination" className="flex flex-col items-center justify-between gap-3 border-t border-line px-5 py-3.5 text-[13px] text-fg-2 sm:flex-row">
              <p aria-live="polite">
                Showing <b className="text-fg">{first}–{first + items.length - 1}</b> of <b className="text-fg">{fmtNum(total)}</b> room{total === 1 ? "" : "s"}
              </p>
              <div className="flex items-center gap-1.5">
                <Button size="s" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
                  <Icon name="chevronLeft" size="sm" />
                </Button>
                {pageNumbers(page, pages).map((n, i) =>
                  n == null ? (
                    <span key={`gap-${i}`} className="px-1 text-fg-3">…</span>
                  ) : (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPage(n)}
                      aria-current={n === page ? "page" : undefined}
                      disabled={loading}
                      className={`h-[38px] min-w-[38px] cursor-pointer rounded-[10px] px-2 text-sm font-bold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                        n === page ? "bg-primary text-white" : "text-fg-2 hover:bg-surface-2 hover:text-fg"
                      }`}
                    >
                      {n}
                    </button>
                  )
                )}
                <Button size="s" variant="outline" disabled={page >= pages || loading} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
                  <Icon name="chevronRight" size="sm" />
                </Button>
              </div>
            </nav>
          </div>
        )}
      </section>
    </div>
  );
}

/** 1 … 4 5 6 … 12 */
function pageNumbers(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = [1, page - 1, page, page + 1, pages].filter((n) => n >= 1 && n <= pages);
  const out = [];
  [...new Set(set)].sort((a, b) => a - b).forEach((n, i, arr) => {
    if (i && n - arr[i - 1] > 1) out.push(null);
    out.push(n);
  });
  return out;
}

function HostCell({ host }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Avatar initials={initialsOf(host.fullName)} src={host.avatarUrl} size={30} className="bg-accent-soft !text-accent-ink" />
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-semibold text-fg">{host.fullName}</span>
        {host.matricule && <span className="truncate font-mono text-[11px] text-fg-3">{host.matricule}</span>}
      </span>
    </div>
  );
}

function ParticipantsCell({ room: r }) {
  return (
    <span className="inline-flex items-center gap-2">
      {r.activeCount > 0 ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-bold text-success-ink" title={`${r.activeCount} studying now`}>
          <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-success motion-reduce:animate-none" />
          {r.activeCount} now
        </span>
      ) : null}
      <span className="inline-flex items-center gap-1 text-fg-2" title="Students who have studied here">
        <Icon name="users" size="sm" className="!size-3.5 text-fg-3" /> {fmtNum(r.participantCount)}
      </span>
    </span>
  );
}

function ReportsBadge({ count }) {
  return (
    <span title={`${count} open report${count === 1 ? "" : "s"}`} className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-warn-soft px-1.5 py-0.5 text-[11px] font-bold text-warn">
      <Icon name="flag" size="sm" className="!size-3" /> {count}
    </span>
  );
}

function VisibilityTag({ visibility }) {
  const priv = visibility === "private";
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-surface-2 px-2.5 py-1 text-xs font-bold leading-none text-fg-2">
      <Icon name={priv ? "lock" : "globe"} size="sm" className="!size-3.5" /> {priv ? "Private" : "Public"}
    </span>
  );
}

function QuickAction({ room, onAction, labelled = false }) {
  const closed = room.status === "closed";
  const label = closed ? `Reopen ${room.title}` : `Close ${room.title}`;
  return (
    <button
      type="button"
      onClick={() => onAction(room, closed ? "reopen" : "close")}
      aria-label={label}
      title={closed ? "Reopen room" : "Close room"}
      className={`inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-line px-2 text-xs font-bold text-fg-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        closed ? "hover:border-primary/40 hover:bg-primary-soft hover:text-primary-text" : "hover:border-live/40 hover:bg-danger-soft hover:text-live"
      } ${labelled ? "" : "w-8"}`}
    >
      <Icon name={closed ? "reopen" : "doorClosed"} size="sm" className="!size-4" />
      {labelled && (closed ? "Reopen" : "Close")}
    </button>
  );
}

function FilterField({ label, value, onChange, options, all, none }) {
  const empty = options.length === 0;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[13px] font-bold leading-[18px] text-fg">{label}</span>
      <Dropdown ariaLabel={label} value={value} onChange={onChange} options={options} placeholder={empty && none ? none : all} emptyOption={!empty} disabled={empty} />
    </div>
  );
}

function SortHeader({ label, by, sort, onSort }) {
  const active = sort.by === by;
  return (
    <th scope="col" aria-sort={active ? (sort.order === "asc" ? "ascending" : "descending") : "none"} className="px-3 py-3.5">
      <button
        type="button"
        onClick={() => onSort(by)}
        className={`-mx-1.5 inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${active ? "text-fg" : ""}`}
      >
        {label}
        <Icon name={active ? (sort.order === "asc" ? "arrowUp" : "arrowDown") : "sort"} size="sm" className={`!size-3.5 ${active ? "" : "text-fg-3"}`} />
      </button>
    </th>
  );
}

function TableSkeleton() {
  return (
    <div role="status" aria-label="Loading study rooms" className="flex flex-col divide-y divide-line">
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <span className="size-9 shrink-0 animate-pulse rounded-lg bg-surface-2" />
          <span className="flex flex-1 flex-col gap-2">
            <span className="h-3.5 w-56 animate-pulse rounded bg-surface-2" />
            <span className="h-3 w-32 animate-pulse rounded bg-surface-2" />
          </span>
          <span className="hidden h-8 w-40 animate-pulse rounded-full bg-surface-2 md:block" />
          <span className="hidden h-6 w-20 animate-pulse rounded-full bg-surface-2 md:block" />
          <span className="hidden h-6 w-16 animate-pulse rounded-full bg-surface-2 md:block" />
        </div>
      ))}
    </div>
  );
}
