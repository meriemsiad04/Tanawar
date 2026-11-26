import { useEffect, useState } from "react";
import Button from "../../Components/uiC/Button.jsx";
import Icon from "../../Components/uiC/Icon.jsx";
import Input from "../../Components/uiC/Input.jsx";
import Dropdown from "../../Components/uiC/Dropdown.jsx";
import Avatar from "../../Components/uiC/Avatar.jsx";
import VerificationStatusBadge from "../../Components/sharedC/VerificationStatusBadge.jsx";
import AccountStatusBadge from "../../Components/sharedC/AccountStatusBadge.jsx";
import StudentProfileDialog from "./students/StudentProfileDialog.jsx";
import { ACCOUNT_STATUS, listStudents } from "../../services/adminStudentsService.js";
import { adminErrorText, fmtDay, initialsOf } from "./students/format.js";

const EMPTY_FILTERS = { faculty: "", department: "", level: "", verification: "", status: "" };
const VERIFICATION_OPTIONS = [
  { value: "approved", label: "Verified" },
  { value: "pending", label: "Pending review" },
  { value: "rejected", label: "Rejected" },
];
const STATUS_OPTIONS = Object.entries(ACCOUNT_STATUS).map(([value, s]) => ({ value, label: s.label }));

/** `?student=<id>` opens that profile, so a profile can be linked to (e.g. from the activity log). */
const readStudentParam = () => new URLSearchParams(window.location.search).get("student");
const writeStudentParam = (id) => {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("student", id);
  else url.searchParams.delete("student");
  window.history.replaceState(null, "", url);
};

/**
 * Admin: student directory (/admin/users): search, filters, sorting, pagination, and the student profile
 * with verification and account actions. Content only, rendered inside AdminLayout.
 * Every permission is enforced by the server (docs/student-management.md); hiding a button here is UX only.
 */
export default function UserManagementP() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState({ by: "registeredAt", order: "desc" });
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState({ key: null, data: null, error: null });
  const [openId, setOpenId] = useState(readStudentParam);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // "loading" until a result for this exact key arrives (the previous rows stay visible meanwhile, dimmed).
  const key = JSON.stringify([debounced, filters, sort, page, tick]);
  useEffect(() => {
    let active = true;
    const [q, f, s, p] = JSON.parse(key);
    listStudents({ q, ...f, sort: s.by, order: s.order, page: p }).then(
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
  }, [key]);

  const loading = result.key !== key;
  const data = result.data;
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 20;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const reload = () => setTick((t) => t + 1);

  const facets = data?.facets ?? { faculties: [], departments: [], levels: [] };
  const activeFilters = Object.values(filters).filter(Boolean).length;
  const filtered = Boolean(debounced.trim()) || activeFilters > 0;

  const setFilter = (name) => (value) => {
    setFilters((f) => ({ ...f, [name]: value }));
    setPage(1);
  };
  const onSearch = (e) => {
    setQuery(e.target.value);
    setPage(1);
  };
  const toggleSort = (by) => {
    setSort((s) => (s.by === by ? { by, order: s.order === "asc" ? "desc" : "asc" } : { by, order: by === "name" ? "asc" : "desc" }));
    setPage(1);
  };
  const open = (id) => {
    setOpenId(id);
    writeStudentParam(id);
  };
  const close = () => {
    setOpenId(null);
    writeStudentParam(null);
  };
  const onChanged = (message) => {
    setNotice(message);
    reload();
  };

  const index = items.findIndex((s) => s.id === openId);
  const first = (page - 1) * pageSize + 1;

  return (
    <>
      <header className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-extrabold leading-8 text-fg">Students</h1>
        <p className="text-sm leading-5 text-fg-2">Find any student, open their profile, verify registrations, and suspend, ban or reinstate accounts.</p>
      </header>

      {notice && (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-primary/25 bg-primary-soft px-4 py-3 text-sm font-semibold text-primary-text">
          <Icon name="check" size="sm" className="mt-px" />
          <span className="flex-1">{notice}</span>
          <button type="button" onClick={() => setNotice("")} aria-label="Dismiss" className="cursor-pointer rounded text-primary-text/70 hover:text-primary-text">
            <Icon name="close" size="sm" />
          </button>
        </div>
      )}

      {/* Search + filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            className="sm:max-w-[440px] sm:flex-1"
            icon="search"
            type="search"
            placeholder="Search by name, email or matricule"
            aria-label="Search students"
            value={query}
            onChange={onSearch}
          />
          <div className="flex items-center gap-2">
            <Button
              size="s"
              variant="outline"
              className="h-11 !bg-surface !border-line-strong !text-fg hover:!bg-surface-2"
              aria-expanded={showFilters}
              aria-controls="student-filters"
              onClick={() => setShowFilters((v) => !v)}
            >
              <Icon name="sliders" size="sm" />
              Filters
              {activeFilters > 0 && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[11px] leading-none text-white">{activeFilters}</span>}
            </Button>
            {filtered && (
              <button
                type="button"
                onClick={() => {
                  setFilters(EMPTY_FILTERS);
                  setQuery("");
                  setPage(1);
                }}
                className="cursor-pointer rounded-lg px-2 py-1 text-[13px] font-bold text-primary-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {showFilters && (
          <div id="student-filters" className="grid grid-cols-1 gap-3 rounded-[20px] border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5">
            <FilterField label="Faculty" value={filters.faculty} onChange={setFilter("faculty")} options={facets.faculties} all="All faculties" none="No faculties recorded yet" />
            <FilterField label="Department" value={filters.department} onChange={setFilter("department")} options={facets.departments} all="All departments" none="No departments recorded yet" />
            <FilterField label="Level" value={filters.level} onChange={setFilter("level")} options={facets.levels} all="All levels" none="No levels recorded yet" />
            <FilterField label="Verification" value={filters.verification} onChange={setFilter("verification")} options={VERIFICATION_OPTIONS} all="Any verification" />
            <FilterField label="Account status" value={filters.status} onChange={setFilter("status")} options={STATUS_OPTIONS} all="Any status" />
          </div>
        )}
      </div>

      {/* Directory */}
      <section aria-busy={loading} className="overflow-hidden rounded-[20px] border border-line bg-surface">
        {!data && loading ? (
          <TableSkeleton />
        ) : result.error && !loading ? (
          <div role="alert" className="flex flex-col items-center gap-3 px-5 py-14 text-center text-sm text-fg-2">
            <Icon name="warning" size="lg" className="text-warn" />
            <p>{adminErrorText(result.error, "We couldn't load the students.")}</p>
            <Button size="s" variant="outline" onClick={reload}>Try again</Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-14 text-center">
            <Icon name="users" size="lg" className="text-fg-3" />
            <p className="text-sm font-semibold text-fg">{filtered ? "No student matches these filters." : "No students have registered yet."}</p>
            {filtered && <p className="text-[13px] text-fg-3">Try another search or clear the filters.</p>}
          </div>
        ) : (
          <div className={`transition-opacity ${loading ? "opacity-60" : ""}`}>
            {/* md+: table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-[13px] font-bold text-fg-2">
                    <th scope="col" className="w-14 py-3.5 pl-5"><span className="sr-only">Open</span></th>
                    <SortHeader label="Student" by="name" sort={sort} onSort={toggleSort} />
                    <th scope="col" className="px-3 py-3.5">Email</th>
                    <th scope="col" className="px-3 py-3.5">Faculty · Department</th>
                    <th scope="col" className="px-3 py-3.5">Level</th>
                    <th scope="col" className="px-3 py-3.5">Verification</th>
                    <th scope="col" className="px-3 py-3.5">Account</th>
                    <SortHeader label="Registered" by="registeredAt" sort={sort} onSort={toggleSort} className="pr-5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {items.map((s) => (
                    <tr key={s.id} onClick={() => open(s.id)} className={`cursor-pointer transition-colors hover:bg-surface-2/60 ${openId === s.id ? "bg-surface-2/60" : ""}`}>
                      <td className="py-3 pl-5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            open(s.id);
                          }}
                          aria-label={`View ${s.fullName}'s profile`}
                          aria-haspopup="dialog"
                          className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg text-fg-2 hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                          <Icon name="eye" size="sm" />
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar initials={initialsOf(s.fullName)} src={s.avatarUrl} size={40} className="bg-accent-soft !text-accent-ink" />
                          <div className="flex min-w-0 flex-col gap-1">
                            <span className="truncate font-bold text-fg">{s.fullName}</span>
                            {s.matricule && <span className="w-fit rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[11px] font-semibold text-fg-2">{s.matricule}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[220px] truncate px-3 py-3 text-fg-2">{s.email ?? "—"}</td>
                      <td className="max-w-[220px] px-3 py-3 text-fg-2">
                        <span className="line-clamp-2">{[s.faculty, s.department].filter(Boolean).join(" · ") || "—"}</span>
                      </td>
                      <td className="px-3 py-3 text-fg-2">{s.level ?? "—"}</td>
                      <td className="px-3 py-3"><VerificationStatusBadge status={s.verificationStatus} /></td>
                      <td className="px-3 py-3"><AccountStatusBadge status={s.accountStatus} /></td>
                      <td className="whitespace-nowrap py-3 pl-3 pr-5 text-fg-2">{fmtDay(s.registeredAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* < md: stacked cards */}
            <ul className="divide-y divide-line md:hidden">
              {items.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => open(s.id)}
                    aria-haspopup="dialog"
                    className="flex w-full cursor-pointer items-start gap-3 px-4 py-3.5 text-left hover:bg-surface-2/60 focus-visible:bg-surface-2 focus-visible:outline-none"
                  >
                    <Avatar initials={initialsOf(s.fullName)} src={s.avatarUrl} size={40} className="bg-accent-soft !text-accent-ink" />
                    <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <span className="truncate text-sm font-bold text-fg">{s.fullName}</span>
                      <span className="truncate text-xs text-fg-3">{[s.email, s.matricule].filter(Boolean).join(" · ")}</span>
                      <span className="flex flex-wrap gap-1.5">
                        <VerificationStatusBadge status={s.verificationStatus} />
                        <AccountStatusBadge status={s.accountStatus} />
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-fg-3">{fmtDay(s.registeredAt)}</span>
                  </button>
                </li>
              ))}
            </ul>

            {/* Pagination */}
            <nav aria-label="Pagination" className="flex flex-col items-center justify-between gap-3 border-t border-line px-5 py-3.5 text-[13px] text-fg-2 sm:flex-row">
              <p aria-live="polite">
                Showing <b className="text-fg">{first}–{first + items.length - 1}</b> of <b className="text-fg">{total}</b> student{total === 1 ? "" : "s"}
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
        <StudentProfileDialog
          id={openId}
          position={index >= 0 ? { index: first + index, total } : null}
          onPrev={index > 0 ? () => open(items[index - 1].id) : null}
          onNext={index >= 0 && index < items.length - 1 ? () => open(items[index + 1].id) : null}
          onClose={close}
          onChanged={onChanged}
        />
      )}
    </>
  );
}

function FilterField({ label, value, onChange, options, all, none }) {
  const empty = options.length === 0;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[13px] font-bold leading-[18px] text-fg">{label}</span>
      <Dropdown
        ariaLabel={label}
        value={value}
        onChange={onChange}
        options={options}
        placeholder={empty && none ? none : all}
        emptyOption={!empty}
        disabled={empty}
      />
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
    <div role="status" aria-label="Loading students" className="flex flex-col divide-y divide-line">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <span className="size-10 shrink-0 animate-pulse rounded-full bg-surface-2" />
          <span className="flex flex-1 flex-col gap-2">
            <span className="h-3.5 w-40 animate-pulse rounded bg-surface-2" />
            <span className="h-3 w-24 animate-pulse rounded bg-surface-2" />
          </span>
          <span className="hidden h-6 w-20 animate-pulse rounded-full bg-surface-2 md:block" />
          <span className="hidden h-6 w-20 animate-pulse rounded-full bg-surface-2 md:block" />
        </div>
      ))}
    </div>
  );
}
