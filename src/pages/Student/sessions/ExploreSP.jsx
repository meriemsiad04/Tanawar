// S stands for session and P stands for page in the pages naming inside the student pannel
import { useMemo, useState } from "react";
import Button from "../../../Components/uiC/Button.jsx";
import Icon from "../../../Components/uiC/Icon.jsx";
import { fieldShell } from "../../../Components/uiC/fieldShell.js";
import SessionListCard from "../../../Components/sharedC/SessionListCard.jsx";
import CreateSessionModal from "../../../Components/sharedC/CreateSessionModal.jsx";
import ConfirmDialog from "../../../Components/sharedC/ConfirmDialog.jsx";
import { useAsync } from "../../../hooks/useAsync.js";
import { LEVELS } from "../../../data/sessionOptions.js";
import {
  classroomPath,
  filterSessions,
  joinSession,
  leaveSession,
  listSessions,
  requestToJoin,
} from "../../../services/sessionsService.js";

// Empty value = "All".
const INITIAL_FILTERS = { query: "", module: "", level: "", mode: "", visibility: "", availableOnly: false };

const MODE_OPTIONS = [
  { value: "", label: "All" },
  { value: "online", label: "Online" },
  { value: "onsite", label: "On-site" },
];
const VISIBILITY_OPTIONS = [
  { value: "", label: "All" },
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
];

const Note = ({ children }) => (
  <div className="flex flex-col items-start gap-3 rounded-[18px] border border-line bg-surface p-5 text-[13px] leading-[19px] text-fg-2">{children}</div>
);

/** Pill toggle group (one choice). */
function Chips({ label, value, options, onChange }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value || "all"}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={`h-9 cursor-pointer rounded-full px-4 text-[13px] font-bold leading-none transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 ${
              active ? "bg-primary text-white" : "border border-line-strong bg-surface text-fg-2 hover:bg-surface-2 hover:text-fg"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Label-less dropdown for the filter bar (the first option is "All …"). */
function FilterSelect({ label, value, onChange, options, placeholder, className = "" }) {
  return (
    <div className={`${fieldShell()} relative h-11 ${className}`}>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-full min-w-0 flex-1 cursor-pointer appearance-none bg-transparent pr-6 text-sm text-fg outline-none"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <Icon name="chevronDown" size="sm" className="pointer-events-none absolute right-3 text-fg-3" />
    </div>
  );
}

/** Sessions page: browse, filter, join / request / leave sessions, create one. */
export default function ExploreSP({ user }) {
  const { status, data, reload } = useAsync(listSessions);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [overrides, setOverrides] = useState({}); // session id → { myStatus, joined } changed on this page
  const [mine, setMine] = useState([]); // sessions created from this page
  const [busyId, setBusyId] = useState(null);
  const [leaving, setLeaving] = useState(null); // session waiting for the Leave confirmation
  const [actionError, setActionError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [created, setCreated] = useState(null);

  const sessions = useMemo(
    () => [...mine, ...(data ?? [])].map((s) => (overrides[s.id] ? { ...s, ...overrides[s.id] } : s)),
    [mine, data, overrides]
  );
  const shown = useMemo(() => filterSessions(sessions, filters), [sessions, filters]);
  const modules = useMemo(() => [...new Set(sessions.map((s) => s.module))].sort((a, b) => a.localeCompare(b)), [sessions]);
  const filtered = Object.keys(INITIAL_FILTERS).some((k) => filters[k] !== INITIAL_FILTERS[k]);

  const setFilter = (key) => (value) => setFilters((f) => ({ ...f, [key]: value }));
  const update = (id, patch) => setOverrides((o) => ({ ...o, [id]: { ...o[id], ...patch } }));

  /** Runs a join / request / leave call for one card, then applies `patch` to it. Returns true on success. */
  const run = async (session, action, patch, failMessage) => {
    setActionError("");
    setBusyId(session.id);
    try {
      await action(session.id);
      update(session.id, patch);
      return true;
    } catch {
      setActionError(failMessage);
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const join = (s) => run(s, joinSession, { myStatus: "joined", joined: s.joined + 1 }, "Couldn’t join the session. Please try again.");
  const request = (s) => run(s, requestToJoin, { myStatus: "pending" }, "Couldn’t send your join request. Please try again.");
  const confirmLeave = async () => {
    const s = leaving;
    await run(s, leaveSession, { myStatus: "none", joined: Math.max(0, s.joined - 1) }, "Couldn’t leave the session. Please try again.");
    setLeaving(null);
  };
  const enter = ({ id }) => window.location.assign(classroomPath(id));

  const addCreated = (session) => {
    // TODO: POST the session to the API (resources as multipart) once the backend exists.
    setMine((list) => [
      {
        id: crypto.randomUUID(),
        title: session.title,
        description: session.description,
        module: session.module,
        level: session.level,
        startsAt: session.startsAt,
        durationMin: session.duration,
        seats: session.seats,
        joined: 0,
        mode: session.mode,
        meetingLink: session.meetingLink,
        location: session.location,
        visibility: session.visibility,
        host: { name: user?.fullName ?? "You", rating: null, verified: true },
        myStatus: "host",
      },
      ...list,
    ]);
    setCreated(session);
    setCreateOpen(false);
  };

  const total = sessions.length;
  const countLabel = shown.length === total ? `${total} session${total === 1 ? "" : "s"}` : `${shown.length} of ${total} sessions`;

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-serif text-[30px] font-bold leading-[38px] tracking-[-0.005em] text-fg">Sessions</h1>
          <p className="text-[15px] leading-[23px] text-fg-2">{status === "ready" ? countLabel : "Find a study session or host your own."}</p>
        </div>
        <Button variant="amber" size="m" onClick={() => setCreateOpen(true)}>
          <Icon name="plus" size="sm" /> Create session
        </Button>
      </div>

      {created && (
        <div role="status" className="flex items-center gap-3 rounded-[14px] border border-line bg-primary-soft px-4 py-3 text-sm text-fg">
          <Icon name="check" className="text-primary" />
          <span className="flex-1">
            <b>{created.title}</b> was created and is now live on the platform.
          </span>
          <button type="button" onClick={() => setCreated(null)} aria-label="Dismiss" className="cursor-pointer text-fg-3 hover:text-fg">
            <Icon name="close" size="sm" />
          </button>
        </div>
      )}

      {/* Filters */}
      <section aria-label="Filter sessions" className="flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-5">
        <div className="flex flex-col gap-3 lg:flex-row">
          <label className={`${fieldShell()} h-11 min-w-0 flex-1`}>
            <Icon name="search" size="sm" className="text-fg-3 group-focus-within:text-primary-text" />
            <input
              type="search"
              value={filters.query}
              onChange={(e) => setFilter("query")(e.target.value)}
              placeholder="Search sessions, modules, students…"
              aria-label="Search sessions"
              className="h-full min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-3"
            />
          </label>
          <FilterSelect label="Module" placeholder="All modules" value={filters.module} onChange={setFilter("module")} options={modules} className="lg:w-[200px]" />
          <FilterSelect label="Level" placeholder="All levels" value={filters.level} onChange={setFilter("level")} options={LEVELS} className="lg:w-[150px]" />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Chips label="Mode" value={filters.mode} options={MODE_OPTIONS} onChange={setFilter("mode")} />
          <span aria-hidden="true" className="hidden h-6 w-px bg-line sm:block" />
          <Chips label="Visibility" value={filters.visibility} options={VISIBILITY_OPTIONS} onChange={setFilter("visibility")} />
          <label className="ml-auto inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-fg">
            <input
              type="checkbox"
              checked={filters.availableOnly}
              onChange={(e) => setFilter("availableOnly")(e.target.checked)}
              className="size-4 cursor-pointer accent-primary"
            />
            Available only
          </label>
        </div>
      </section>

      {actionError && (
        <p role="alert" className="text-[13px] font-bold text-live">
          {actionError}
        </p>
      )}

      {/* List */}
      {status === "loading" ? (
        <Note>Loading sessions…</Note>
      ) : status === "error" && !mine.length ? (
        <Note>
          Sessions aren’t available right now.
          <Button variant="outline" size="s" onClick={reload}>
            Try again
          </Button>
        </Note>
      ) : shown.length ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((s) => (
            <SessionListCard
              key={s.id}
              session={s}
              busy={busyId === s.id}
              onAction={s.visibility === "private" ? request : join}
              onEnter={enter}
              onLeave={setLeaving}
            />
          ))}
        </div>
      ) : (
        <Note>
          {filtered ? "No sessions match your filters." : "No sessions yet. Be the first to host one!"}
          {filtered && (
            <Button variant="outline" size="s" onClick={() => setFilters(INITIAL_FILTERS)}>
              Clear filters
            </Button>
          )}
        </Note>
      )}

      {createOpen && <CreateSessionModal user={user} onClose={() => setCreateOpen(false)} onCreate={addCreated} />}

      {leaving && (
        <ConfirmDialog
          title="Leave this session?"
          message={`You’ll lose your seat in “${leaving.title}”. You can join again later if seats are still available.`}
          confirmLabel="Leave session"
          busy={busyId === leaving.id}
          onConfirm={confirmLeave}
          onCancel={() => setLeaving(null)}
        />
      )}
    </>
  );
}
