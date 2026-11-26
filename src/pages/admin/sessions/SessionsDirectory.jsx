import { useEffect, useState } from "react";
import Button from "../../../Components/uiC/Button.jsx";
import Icon from "../../../Components/uiC/Icon.jsx";
import Input from "../../../Components/uiC/Input.jsx";
import Dropdown from "../../../Components/uiC/Dropdown.jsx";
import Chips from "../../../Components/uiC/Chips.jsx";
import Avatar from "../../../Components/uiC/Avatar.jsx";
import AdminSessionStatusBadge from "../../../Components/sharedC/AdminSessionStatusBadge.jsx";
import {
  SESSION_ACTIONS,
  SESSION_STATUS,
  SESSION_TYPES,
  listAdminSessions,
  moderateSession,
  moderationErrorText,
  reviewExpired,
} from "../../../services/adminSessionsService.js";
import { adminErrorText, fmtDateTime, initialsOf } from "../students/format.js";
import SessionDetailDialog from "./SessionDetailDialog.jsx";
import SessionActionDialog from "./SessionActionDialog.jsx";
import { fmtDate, fmtTimeRange } from "./sessionFormat.js";

const EMPTY_FILTERS = { type: "", module: "", level: "", visibility: "", host: "", from: "", to: "", reported: false };
const STATUS_CHIPS = [{ value: "", label: "All" }, ...Object.entries(SESSION_STATUS).map(([value, s]) => ({ value, label: s.label }))];
const TYPE_OPTIONS = Object.entries(SESSION_TYPES).map(([value, t]) => ({ value, label: t.label }));
const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
];

const MODES = {
  all: {
    title: "Sessions",
    intro: "Every study session on TANAWAR: search, inspect, and cancel or remove sessions that break the rules.",
    defaultSort: { by: "startsAt", order: "desc" },
    fixed: {},
  },
  approvals: {
    title: "Session approvals",
    intro: "Scheduled sessions waiting for review, soonest first. Instant sessions are published at once and never appear here.",
    defaultSort: { by: "startsAt", order: "asc" },
    fixed: { status: "pending", type: "scheduled" },
  },
};

/** `?session=<id>` opens that session, so it can be linked to (overview tasks, activity log). */
const readParam = () => new URLSearchParams(window.location.search).get("session");
const writeParam = (id) => {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("session", id);
  else url.searchParams.delete("session");
  window.history.replaceState(null, "", url);
};

/**
 * Admin sessions directory (/admin/sessions) and approval queue (/admin/sessions/approvals, `mode="approvals"`):
 * search, filters, sorting, pagination, session details and moderation. Content only, rendered inside AdminLayout.
 * Every permission and transition is enforced by the server (docs/session-management.md); hiding a button is UX only.
 */
export default function SessionsDirectory({ mode = "all" }) {
  const cfg = MODES[mode] ?? MODES.all;
  const approvals = mode === "approvals";
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState({ q: "", host: "" });
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [status, setStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState(cfg.defaultSort);
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState({ key: null, data: null, error: null });
  const [openId, setOpenId] = useState(readParam);
  const [notice, setNotice] = useState({ text: "", tone: "ok" });
  const [rowAction, setRowAction] = useState(null); // { session, action } for reject from the queue
  const [approvingId, setApprovingId] = useState(null);

  // Text fields are debounced so typing doesn't fire a request per key.
  useEffect(() => {
    const t = setTimeout(() => setDebounced({ q: query, host: filters.host }), 300);
    return () => clearTimeout(t);
  }, [query, filters.host]);

  const key = JSON.stringify([debounced, { ...filters, host: undefined }, status, sort, page, tick]);
  useEffect(() => {
    let active = true;
    const [d, f, st, s, p] = JSON.parse(key);
    listAdminSessions({ ...f, q: d.q, host: d.host, status: st, ...cfg.fixed, reported: f.reported ? "true" : "", sort: s.by, order: s.order, page: p }).then(
      (data) => {
        if (!active) return;
        // An action can move the last row of the last page out of the filter: step back instead of an empty page.
        if (data.items.length === 0 && p > 1 && data.total > 0) setPage(Math.ceil(data.total / data.pageSize));
        else setResult({ key, data, error: null });
      },
      (error) => active && setResult({ key, data: null, error })
    );
    return () => {
      active = false;
    };
  }, [key, cfg.fixed]);

  const loading = result.key !== key;
  const data = result.data;
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 20;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const reload = () => setTick((t) => t + 1);
  const facets = data?.facets ?? { modules: [], levels: [] };

  const activeFilters = Object.entries(filters).filter(([k, v]) => Boolean(v) && !(approvals && k === "type")).length;
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
  const open = (id) => {
    setOpenId(id);
    writeParam(id);
  };
  const close = () => {
    setOpenId(null);
    writeParam(null);
  };
  const onChanged = (text, tone = "ok") => {
    if (text) setNotice({ text, tone });
    reload();
  };

  const approve = async (s) => {
    setApprovingId(s.id);
    try {
      await moderateSession(s, "approve");
      onChanged(SESSION_ACTIONS.approve.done(s.title));
    } catch (err) {
      onChanged((err?.status === 409 && moderationErrorText(err)) || adminErrorText(err, "That didn't work. Please try again."), "error");
    } finally {
      setApprovingId(null);
    }
  };

  const index = items.findIndex((s) => s.id === openId);
  const first = (page - 1) * pageSize + 1;
  const noun = approvals ? "request" : "session";

  return (
    <>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-extrabold leading-8 text-fg">{cfg.title}</h1>
          <p className="max-w-[720px] text-sm leading-5 text-fg-2">{cfg.intro}</p>
        </div>
        <nav aria-label="Session views" className="inline-flex shrink-0 gap-1 self-start rounded-[14px] bg-surface-2 p-1 sm:self-auto">
          {[
            { href: "/admin/sessions", label: "All sessions", on: !approvals },
            { href: "/admin/sessions/approvals", label: "Approval queue", on: approvals },
          ].map((t) => (
            <a
              key={t.href}
              href={t.href}
              aria-current={t.on ? "page" : undefined}
              className={`flex h-9 items-center rounded-[10px] px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 ${
                t.on ? "bg-surface text-fg shadow-sm" : "text-fg-2 hover:text-fg"
              }`}
            >
              {t.label}
            </a>
          ))}
        </nav>
      </header>

      {notice.text && (
        <div
          role={notice.tone === "error" ? "alert" : "status"}
          className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${
            notice.tone === "error" ? "border-live/25 bg-danger-soft text-live" : "border-primary/25 bg-primary-soft text-primary-text"
          }`}
        >
          <Icon name={notice.tone === "error" ? "alert" : "check"} size="sm" className="mt-px" />
          <span className="flex-1">{notice.text}</span>
          <button type="button" onClick={() => setNotice({ text: "", tone: "ok" })} aria-label="Dismiss" className="cursor-pointer rounded opacity-70 hover:opacity-100">
            <Icon name="close" size="sm" />
          </button>
        </div>
      )}

      {/* Search, status, filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            className="sm:max-w-[440px] sm:flex-1"
            icon="search"
            type="search"
            placeholder="Search by title, description or module"
            aria-label="Search sessions"
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
              className="h-11 !bg-surface !border-line-strong !text-fg hover:!bg-surface-2"
              aria-expanded={showFilters}
              aria-controls="session-filters"
              onClick={() => setShowFilters((v) => !v)}
            >
              <Icon name="sliders" size="sm" />
              Filters
              {activeFilters > 0 && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[11px] leading-none text-white">{activeFilters}</span>}
            </Button>
            {filtered && (
              <button
                type="button"
                onClick={clearAll}
                className="cursor-pointer rounded-lg px-2 py-1 text-[13px] font-bold text-primary-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {!approvals && (
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
        )}

        {showFilters && (
          <div id="session-filters" className="grid grid-cols-1 gap-3 rounded-[20px] border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
            {!approvals && <FilterField label="Type" value={filters.type} onChange={setFilter("type")} options={TYPE_OPTIONS} all="Any type" />}
            <FilterField label="Module" value={filters.module} onChange={setFilter("module")} options={facets.modules} all="All modules" none="No modules yet" />
            <FilterField label="Level" value={filters.level} onChange={setFilter("level")} options={facets.levels} all="All levels" none="No levels yet" />
            <FilterField label="Visibility" value={filters.visibility} onChange={setFilter("visibility")} options={VISIBILITY_OPTIONS} all="Public and private" />
            <Input label="Host" icon="user" placeholder="Name or matricule" value={filters.host} onChange={(e) => setFilter("host")(e.target.value)} />
            <Input label="From" icon="calendar" type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => setFilter("from")(e.target.value)} />
            <Input label="To" icon="calendar" type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => setFilter("to")(e.target.value)} />
            {!approvals && (
              <label
                className={`flex items-center gap-2.5 self-end rounded-[10px] border border-line-strong px-3 text-sm font-semibold text-fg h-11 ${data && !data.reportsAvailable ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                title={data && !data.reportsAvailable ? "Reports aren't available yet" : undefined}
              >
                <input
                  type="checkbox"
                  checked={filters.reported}
                  disabled={Boolean(data) && !data.reportsAvailable}
                  onChange={(e) => setFilter("reported")(e.target.checked)}
                  className="size-4 accent-primary"
                />
                <Icon name="flag" size="sm" className="text-warn" /> Reported only
              </label>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <section aria-busy={loading} className="overflow-hidden rounded-[20px] border border-line bg-surface">
        {!data && loading ? (
          <TableSkeleton />
        ) : result.error && !loading ? (
          <div role="alert" className="flex flex-col items-center gap-3 px-5 py-14 text-center text-sm text-fg-2">
            <Icon name="warning" size="lg" className="text-warn" />
            <p>{adminErrorText(result.error, "We couldn't load the sessions.")}</p>
            <Button size="s" variant="outline" onClick={reload}>Try again</Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-14 text-center">
            <Icon name={approvals ? "clipboard" : "calendar"} size="lg" className="text-fg-3" />
            <p className="text-sm font-semibold text-fg">
              {filtered ? "No session matches these filters." : approvals ? "All caught up: no session is waiting for approval." : "No sessions have been created yet."}
            </p>
            {filtered && <p className="text-[13px] text-fg-3">Try another search or clear the filters.</p>}
          </div>
        ) : (
          <div className={`transition-opacity ${loading ? "opacity-60" : ""}`}>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-[13px] font-bold text-fg-2">
                    <th scope="col" className="w-14 py-3.5 pl-5"><span className="sr-only">Open</span></th>
                    <SortHeader label="Session" by="title" sort={sort} onSort={toggleSort} />
                    <th scope="col" className="px-3 py-3.5">Host</th>
                    <th scope="col" className="px-3 py-3.5">Module · Level</th>
                    {!approvals && <th scope="col" className="px-3 py-3.5">Type</th>}
                    <th scope="col" className="px-3 py-3.5">Visibility</th>
                    <SortHeader label="Date & time" by="startsAt" sort={sort} onSort={toggleSort} />
                    {approvals ? (
                      <SortHeader label="Submitted" by="createdAt" sort={sort} onSort={toggleSort} />
                    ) : (
                      <SortHeader label="Participants" by="participants" sort={sort} onSort={toggleSort} />
                    )}
                    <th scope="col" className="px-3 py-3.5 pr-5">{approvals ? "Decision" : "Status"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {items.map((s) => (
                    <tr key={s.id} onClick={() => open(s.id)} className={`cursor-pointer align-top transition-colors hover:bg-surface-2/60 ${openId === s.id ? "bg-surface-2/60" : ""}`}>
                      <td className="py-3 pl-5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            open(s.id);
                          }}
                          aria-label={`View details of ${s.title}`}
                          aria-haspopup="dialog"
                          className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg text-fg-2 hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                          <Icon name="eye" size="sm" />
                        </button>
                      </td>
                      <td className="max-w-[300px] px-3 py-3">
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate font-bold text-fg">{s.title}</span>
                            {s.openReports > 0 && (
                              <span title={`${s.openReports} open report${s.openReports === 1 ? "" : "s"}`} className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-warn-soft px-1.5 py-0.5 text-[11px] font-bold text-warn">
                                <Icon name="flag" size="sm" className="!size-3" /> {s.openReports}
                              </span>
                            )}
                          </span>
                          {s.description && <span className="line-clamp-1 text-[13px] text-fg-3">{s.description}</span>}
                        </div>
                      </td>
                      <td className="max-w-[200px] px-3 py-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <Avatar initials={initialsOf(s.host.fullName)} src={s.host.avatarUrl} size={30} className="bg-accent-soft !text-accent-ink" />
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate font-semibold text-fg">{s.host.fullName}</span>
                            {s.host.matricule && <span className="truncate font-mono text-[11px] text-fg-3">{s.host.matricule}</span>}
                          </span>
                        </div>
                      </td>
                      <td className="max-w-[180px] px-3 py-3 text-fg-2">
                        <span className="line-clamp-2">{[s.module, s.level].filter(Boolean).join(" · ") || "—"}</span>
                      </td>
                      {!approvals && (
                        <td className="px-3 py-3"><TypeTag type={s.type} /></td>
                      )}
                      <td className="px-3 py-3"><VisibilityTag visibility={s.visibility} /></td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <span className="flex flex-col">
                          <span className="font-semibold text-fg">{fmtDate(s.startsAt)}</span>
                          <span className="text-[13px] text-fg-3">{fmtTimeRange(s.startsAt, s.durationMin)}</span>
                        </span>
                      </td>
                      {approvals ? (
                        <td className="whitespace-nowrap px-3 py-3 text-fg-2">{fmtDateTime(s.createdAt)}</td>
                      ) : (
                        <td className="whitespace-nowrap px-3 py-3 text-fg-2">
                          {s.participantCount ?? "—"}
                          {s.seats != null && <span className="text-fg-3"> / {s.seats}</span>}
                        </td>
                      )}
                      <td className="px-3 py-3 pr-5" onClick={approvals ? (e) => e.stopPropagation() : undefined}>
                        {approvals ? (
                          <QueueActions
                            session={s}
                            busy={approvingId === s.id}
                            disabled={approvingId != null}
                            onApprove={() => approve(s)}
                            onReject={() => setRowAction({ session: s, action: "reject" })}
                          />
                        ) : (
                          <AdminSessionStatusBadge status={s.status} removed={s.removed} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* < lg: stacked cards */}
            <ul className="divide-y divide-line lg:hidden">
              {items.map((s) => (
                <li key={s.id} className="flex flex-col gap-3 px-4 py-3.5">
                  <button
                    type="button"
                    onClick={() => open(s.id)}
                    aria-haspopup="dialog"
                    className="flex w-full cursor-pointer flex-col gap-2 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <span className="flex items-start gap-2">
                      <span className="min-w-0 flex-1 text-sm font-bold text-fg">{s.title}</span>
                      <AdminSessionStatusBadge status={s.status} removed={s.removed} />
                    </span>
                    <span className="text-xs text-fg-2">
                      {s.host.fullName} · {[s.module, s.level].filter(Boolean).join(" · ")}
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5 text-xs text-fg-2">
                      <TypeTag type={s.type} />
                      <VisibilityTag visibility={s.visibility} />
                      <span className="inline-flex items-center gap-1">
                        <Icon name="calendar" size="sm" className="!size-3.5 text-fg-3" /> {fmtDate(s.startsAt)}, {fmtTimeRange(s.startsAt, s.durationMin)}
                      </span>
                      {!approvals && s.participantCount != null && (
                        <span className="inline-flex items-center gap-1">
                          <Icon name="users" size="sm" className="!size-3.5 text-fg-3" /> {s.participantCount}{s.seats != null ? `/${s.seats}` : ""}
                        </span>
                      )}
                    </span>
                  </button>
                  {approvals && (
                    <QueueActions
                      session={s}
                      busy={approvingId === s.id}
                      disabled={approvingId != null}
                      onApprove={() => approve(s)}
                      onReject={() => setRowAction({ session: s, action: "reject" })}
                    />
                  )}
                </li>
              ))}
            </ul>

            <nav aria-label="Pagination" className="flex flex-col items-center justify-between gap-3 border-t border-line px-5 py-3.5 text-[13px] text-fg-2 sm:flex-row">
              <p aria-live="polite">
                Showing <b className="text-fg">{first}–{first + items.length - 1}</b> of <b className="text-fg">{total}</b> {noun}{total === 1 ? "" : "s"}
              </p>
              <div className="flex items-center gap-2">
                <Button size="s" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
                  <Icon name="chevronLeft" size="sm" /> Previous
                </Button>
                <span className="px-1 font-semibold text-fg">{page} / {pages}</span>
                <Button size="s" variant="outline" disabled={page >= pages || loading} onClick={() => setPage((p) => p + 1)}>
                  Next <Icon name="chevronRight" size="sm" />
                </Button>
              </div>
            </nav>
          </div>
        )}
      </section>

      {openId && (
        <SessionDetailDialog
          id={openId}
          position={index >= 0 ? { index: first + index, total } : null}
          onPrev={index > 0 ? () => open(items[index - 1].id) : null}
          onNext={index >= 0 && index < items.length - 1 ? () => open(items[index + 1].id) : null}
          onClose={close}
          onChanged={onChanged}
        />
      )}

      {rowAction && (
        <SessionActionDialog
          action={rowAction.action}
          session={rowAction.session}
          onCancel={() => setRowAction(null)}
          onConflict={(message) => {
            setRowAction(null);
            onChanged(message, "error");
          }}
          onDone={() => {
            const { session, action } = rowAction;
            setRowAction(null);
            onChanged(SESSION_ACTIONS[action].done(session.title));
          }}
        />
      )}
    </>
  );
}

function QueueActions({ session, busy, disabled, onApprove, onReject }) {
  const expired = reviewExpired(session);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        {!expired && (
          <Button size="s" className="!border-success !bg-success hover:!bg-success-ink" disabled={disabled} aria-busy={busy} onClick={onApprove} aria-label={`Approve ${session.title}`}>
            <Icon name={busy ? "loader" : "check"} size="sm" className={busy ? "animate-spin" : ""} /> Approve
          </Button>
        )}
        <Button size="s" variant="outline" className="!border-live/40 !bg-surface !text-live hover:!bg-danger-soft" disabled={disabled} onClick={onReject} aria-label={`Reject ${session.title}`}>
          <Icon name="circleX" size="sm" /> Reject…
        </Button>
      </div>
      {expired && <span className="text-xs font-semibold text-warn">Start time passed: can only be rejected.</span>}
    </div>
  );
}

function TypeTag({ type }) {
  const t = SESSION_TYPES[type] ?? SESSION_TYPES.scheduled;
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold leading-none ${type === "instant" ? "bg-highlight/20 text-fg" : "bg-accent-soft text-accent-ink"}`}>
      <Icon name={t.icon} size="sm" className="!size-3.5" /> {t.label}
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

function FilterField({ label, value, onChange, options, all, none }) {
  const empty = options.length === 0;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[13px] font-bold leading-[18px] text-fg">{label}</span>
      <Dropdown ariaLabel={label} value={value} onChange={onChange} options={options} placeholder={empty && none ? none : all} emptyOption={!empty} disabled={empty} />
    </div>
  );
}

function SortHeader({ label, by, sort, onSort, className = "" }) {
  const active = sort.by === by;
  return (
    <th scope="col" aria-sort={active ? (sort.order === "asc" ? "ascending" : "descending") : "none"} className={`px-3 py-3.5 ${className}`}>
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
    <div role="status" aria-label="Loading sessions" className="flex flex-col divide-y divide-line">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <span className="size-9 shrink-0 animate-pulse rounded-lg bg-surface-2" />
          <span className="flex flex-1 flex-col gap-2">
            <span className="h-3.5 w-56 animate-pulse rounded bg-surface-2" />
            <span className="h-3 w-32 animate-pulse rounded bg-surface-2" />
          </span>
          <span className="hidden h-6 w-24 animate-pulse rounded-full bg-surface-2 md:block" />
          <span className="hidden h-6 w-20 animate-pulse rounded-full bg-surface-2 md:block" />
        </div>
      ))}
    </div>
  );
}
