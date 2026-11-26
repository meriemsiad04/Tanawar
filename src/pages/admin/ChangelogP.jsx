import { useEffect, useState } from "react";
import Button from "../../Components/uiC/Button.jsx";
import Icon from "../../Components/uiC/Icon.jsx";
import Input from "../../Components/uiC/Input.jsx";
import Dropdown from "../../Components/uiC/Dropdown.jsx";
import { CHANGE_ACTIONS, CHANGE_CATEGORIES, PERIODS, listChanges } from "../../services/adminSystemService.js";
import { adminErrorText } from "./students/format.js";

const TONES = {
  blue: "bg-primary-soft text-primary-text",
  green: "bg-success-soft text-success-ink",
  warn: "bg-warn-soft text-warn",
  red: "bg-danger-soft text-live",
};
const EMPTY_FILTERS = { category: "", actor: "", period: "" };
const CATEGORY_OPTIONS = Object.entries(CHANGE_CATEGORIES).map(([value, c]) => ({ value, label: c.label }));

/** Where a target can be opened (the directories accept ?student= / ?session= deep links). */
const targetHref = (t) =>
  t?.id && t.type === "student" ? `/admin/users?student=${encodeURIComponent(t.id)}`
  : t?.id && t.type === "session" ? `/admin/sessions?session=${encodeURIComponent(t.id)}`
  : t?.type === "operator" ? "/admin/operators"
  : null;

const dayLabel = (iso) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
};
const timeOf = (iso) => new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

/**
 * Admin: change log (/admin/changelog). Every admin action on TANAWAR, newest first: who did what, to whom, when, why,
 * and for settings the exact before → after values. Read-only: entries are written by the server with each change
 * and can't be edited or deleted (docs/system-admin.md).
 */
export default function ChangelogP() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  // `?category=settings` (e.g. "See history" on the settings page) opens the log pre-filtered.
  const [filters, setFilters] = useState(() => {
    const category = new URLSearchParams(window.location.search).get("category");
    return { ...EMPTY_FILTERS, category: CHANGE_CATEGORIES[category] ? category : "" };
  });
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState({ key: null, data: null, error: null });

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const key = JSON.stringify([debounced, filters, page, tick]);
  useEffect(() => {
    let active = true;
    const [q, f, p] = JSON.parse(key);
    listChanges({ q, ...f, page: p }).then(
      (data) => active && setResult({ key, data, error: null }),
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
  const pageSize = data?.pageSize ?? 25;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const filtered = Boolean(debounced.trim()) || Object.values(filters).some(Boolean);
  const actorOptions = (data?.facets.actors ?? []).map((a) => ({ value: a.id, label: a.name }));

  const setFilter = (name) => (value) => {
    setFilters((f) => ({ ...f, [name]: value }));
    setPage(1);
  };

  // Group the page by calendar day.
  const days = [];
  for (const e of items) {
    const label = e.at ? dayLabel(e.at) : "Unknown date";
    if (days.at(-1)?.label !== label) days.push({ label, entries: [] });
    days.at(-1).entries.push(e);
  }
  const first = (page - 1) * pageSize + 1;

  return (
    <>
      <header className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-extrabold leading-8 text-fg">Change log</h1>
        <p className="text-sm leading-5 text-fg-2">
          Every action taken by an operator, newest first. Entries are recorded automatically and can't be edited or deleted.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 rounded-[20px] border border-line bg-surface p-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))_auto] xl:items-end">
        <Input
          label="Search"
          icon="search"
          type="search"
          placeholder="Operator, student, session, reason…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
        />
        <Filter label="Area" value={filters.category} onChange={setFilter("category")} options={CATEGORY_OPTIONS} all="All areas" />
        <Filter label="Operator" value={filters.actor} onChange={setFilter("actor")} options={actorOptions} all="All operators" />
        <Filter label="Period" value={filters.period} onChange={setFilter("period")} options={PERIODS} all="Any time" />
        <button
          type="button"
          disabled={!filtered}
          onClick={() => {
            setFilters(EMPTY_FILTERS);
            setQuery("");
            setPage(1);
          }}
          className="h-11 cursor-pointer rounded-lg px-2 text-[13px] font-bold text-primary-text hover:underline disabled:invisible focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          Clear all
        </button>
      </div>

      <section aria-busy={loading} className="overflow-hidden rounded-[20px] border border-line bg-surface">
        {!data && loading ? (
          <Skeleton />
        ) : result.error && !loading ? (
          <div role="alert" className="flex flex-col items-center gap-3 px-5 py-14 text-center text-sm text-fg-2">
            <Icon name="warning" size="lg" className="text-warn" />
            <p>{adminErrorText(result.error, "We couldn't load the change log.")}</p>
            <Button size="s" variant="outline" onClick={() => setTick((t) => t + 1)}>Try again</Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-14 text-center">
            <Icon name="history" size="lg" className="text-fg-3" />
            <p className="text-sm font-semibold text-fg">{filtered ? "No change matches these filters." : "No changes recorded yet."}</p>
            <p className="text-[13px] text-fg-3">
              {filtered ? "Try another search or clear the filters." : "Approving a student, moderating a session or editing settings will appear here."}
            </p>
          </div>
        ) : (
          <div className={`transition-opacity ${loading ? "opacity-60" : ""}`}>
            {days.map((day) => (
              <div key={day.label}>
                <h2 className="sticky top-[72px] z-10 border-b border-line bg-surface-2/90 px-5 py-2 text-xs font-bold uppercase tracking-[0.12em] text-fg-2 backdrop-blur short:top-16">
                  {day.label}
                </h2>
                <ol className="divide-y divide-line">
                  {day.entries.map((e) => (
                    <Entry key={e.id} entry={e} />
                  ))}
                </ol>
              </div>
            ))}

            <nav aria-label="Pagination" className="flex flex-col items-center justify-between gap-3 border-t border-line px-5 py-3.5 text-[13px] text-fg-2 sm:flex-row">
              <p aria-live="polite">
                Showing <b className="text-fg">{first}–{first + items.length - 1}</b> of <b className="text-fg">{total}</b> change{total === 1 ? "" : "s"}
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
    </>
  );
}

function Entry({ entry: e }) {
  const def = CHANGE_ACTIONS[e.action];
  const category = CHANGE_CATEGORIES[e.category];
  const href = targetHref(e.target);
  return (
    <li className="flex gap-3.5 px-5 py-4">
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${TONES[def?.tone ?? "blue"]}`}>
        <Icon name={def?.icon ?? "activity"} size="sm" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <p className="min-w-0 text-sm leading-5 text-fg">
            <b className="font-bold">{e.actor.name}</b> {def?.label ?? e.action.replaceAll("_", " ")}
            {e.target && (
              <>
                {" "}
                {href ? (
                  <a href={href} className="font-bold text-primary-text hover:underline">{e.target.label}</a>
                ) : (
                  <b className="font-bold">{e.target.label}</b>
                )}
              </>
            )}
          </p>
          <span className="flex shrink-0 items-center gap-2 text-xs text-fg-3">
            {category && (
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 font-semibold text-fg-2">
                <Icon name={category.icon} size="sm" className="!size-3.5" />
                {category.label}
              </span>
            )}
            {e.at && <time dateTime={e.at}>{timeOf(e.at)}</time>}
          </span>
        </div>

        {e.reason && (
          <p className="rounded-[10px] border-l-[3px] border-line-strong bg-surface-2/70 px-3 py-2 text-[13px] leading-5 text-fg-2">“{e.reason}”</p>
        )}

        {e.changes?.length > 0 && (
          <ul className="flex flex-col gap-1.5 text-[13px] leading-5">
            {e.changes.map((c) => (
              <li key={c.field} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-semibold text-fg-2">{c.label ?? c.field}:</span>
                {c.from != null && (
                  <>
                    <span className="rounded-md bg-danger-soft px-1.5 py-0.5 text-live line-through decoration-1">{String(c.from)}</span>
                    <Icon name="chevronRight" size="sm" className="!size-3.5 text-fg-3" />
                  </>
                )}
                <span className="rounded-md bg-success-soft px-1.5 py-0.5 font-semibold text-success-ink">{String(c.to ?? "empty")}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

function Filter({ label, value, onChange, options, all }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[13px] font-bold leading-[18px] text-fg">{label}</span>
      <Dropdown ariaLabel={label} value={value} onChange={onChange} options={options} placeholder={all} emptyOption />
    </div>
  );
}

function Skeleton() {
  return (
    <div role="status" aria-label="Loading the change log" className="flex flex-col divide-y divide-line">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-start gap-3.5 px-5 py-4">
          <span className="size-9 shrink-0 animate-pulse rounded-full bg-surface-2" />
          <span className="flex flex-1 flex-col gap-2">
            <span className="h-3.5 w-2/3 animate-pulse rounded bg-surface-2" />
            <span className="h-3 w-1/3 animate-pulse rounded bg-surface-2" />
          </span>
        </div>
      ))}
    </div>
  );
}
