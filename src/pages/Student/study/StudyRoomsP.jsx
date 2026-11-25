import { useCallback, useMemo, useState } from "react";
import Button from "../../../Components/uiC/Button.jsx";
import Icon from "../../../Components/uiC/Icon.jsx";
import Input from "../../../Components/uiC/Input.jsx";
import Chips from "../../../Components/uiC/Chips.jsx";
import ConfirmDialog from "../../../Components/sharedC/ConfirmDialog.jsx";
import StudyRoomCard from "../../../Components/sharedC/StudyRoomCard.jsx";
import StudyIllustration from "../../../Components/sharedC/StudyIllustration.jsx";
import CreateStudyRoomModal from "../../../Components/sharedC/CreateStudyRoomModal.jsx";
import { useLiveQuery } from "../../../hooks/useLiveQuery.js";
import { useNow } from "../../../hooks/useNow.js";
import { useSettings } from "../../../hooks/useSettings.js";
import { DEFAULT_SETTINGS } from "../../../services/settingsService.js";
import { MODULES_BY_LEVEL } from "../../../data/sessionOptions.js";
import {
  POLL_MS,
  fmtClock,
  fmtDuration,
  getMyStudyStats,
  joinStudyRoom,
  listStudyRooms,
  liveStats,
  studyMilestones,
  studyRoomPath,
} from "../../../services/studyRoomsService.js";

const filtersFor = (level) => [
  { value: "", label: "All rooms" },
  { value: "live", label: "Studying now" },
  ...(MODULES_BY_LEVEL[level] ? [{ value: "mine", label: `${level} modules` }] : []),
];

const Note = ({ children }) => (
  <div className="flex flex-col items-start gap-3 rounded-[18px] border border-line bg-surface p-5 text-[13px] leading-[19px] text-fg-2">{children}</div>
);

const errorText = (error, what) =>
  error?.code === "NOT_CONFIGURED" ? `${what} will appear here once the server is connected.` : error?.message ?? `${what} aren’t available right now.`;

/* ───────────── Personal stats ───────────── */

function WeekBars({ days }) {
  const max = Math.max(3600, ...days.map((d) => d.seconds));
  return (
    <div className="flex h-[92px] items-end gap-2" role="img" aria-label={`Study time over the last 7 days: ${days.map((d) => fmtDuration(d.seconds)).join(", ")}`}>
      {days.map((d, i) => {
        const today = i === days.length - 1;
        const label = new Date(`${d.date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "narrow" });
        return (
          <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex h-[68px] w-full items-end overflow-hidden rounded-lg bg-white/[.07]">
              <div
                className={`w-full rounded-lg transition-[height] duration-700 ease-out ${today ? "bg-highlight" : "bg-accent"}`}
                style={{ height: `${Math.max(d.seconds ? 6 : 0, (d.seconds / max) * 100)}%` }}
              />
            </div>
            <span className={`text-[11px] font-bold leading-3 ${today ? "text-highlight" : "text-on-dark-2"}`}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function Milestones({ items }) {
  const unlocked = items.filter((m) => m.unlocked).length;
  return (
    <section className="flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-5 sm:p-[22px]">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-lg font-extrabold leading-6 text-fg">Study milestones</h2>
          <p className="text-[13px] leading-[19px] text-fg-2">Earned with real time at your desk. {unlocked} of {items.length} unlocked.</p>
        </div>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((m) => {
          const pct = Math.round((m.current / m.target) * 100);
          const progress = m.unit === "time" ? `${fmtDuration(m.current)} / ${fmtDuration(m.target)}` : `${m.current} / ${m.target}`;
          return (
            <li
              key={m.id}
              className={`flex items-center gap-3 rounded-[16px] border p-3.5 transition-colors ${m.unlocked ? "border-accent-line bg-accent-soft" : "border-line bg-surface"}`}
            >
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${m.unlocked ? "bg-primary text-white" : "bg-surface-2 text-fg-3"}`}>
                <Icon name={m.icon} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="flex items-center gap-1.5 text-sm font-extrabold leading-5 text-fg">
                  {m.title}
                  {m.unlocked && <Icon name="check" size="sm" className="!size-4 text-primary-text" label="Unlocked" />}
                </p>
                <p className="truncate text-xs leading-4 text-fg-2">{m.text}</p>
                {!m.unlocked && (
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="shrink-0 text-[11px] font-bold tabular-nums text-fg-3">{progress}</span>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Progress toward a goal, on the dark card. */
function GoalBar({ label, done, target }) {
  const pct = Math.min(100, Math.round((done / target) * 100));
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-bold uppercase tracking-wide text-on-dark-2">{label}</span>
        <span className="font-bold tabular-nums">
          {fmtDuration(done)} / {fmtDuration(target)} {pct >= 100 && <span className="text-highlight">· reached</span>}
        </span>
      </div>
      <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-highlight transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** `learning` = the student's learning preferences (daily / weekly goal and goals, from Settings). */
function MyStudy({ stats, now, learning }) {
  const live = liveStats(stats, now);
  const tiles = [
    ["This week", fmtDuration(live.weekSeconds)],
    ["All time", fmtDuration(live.totalSeconds)],
    ["Best sitting", fmtDuration(live.longestSittingSeconds)],
    ["Streak", `${live.streakDays} ${live.streakDays === 1 ? "day" : "days"}`],
  ];
  return (
    <>
      <section aria-label="Your study time" className="relative grid gap-6 overflow-hidden rounded-[22px] bg-ink p-6 text-white md:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
        <span aria-hidden="true" className="absolute -right-20 -top-20 size-56 rounded-full bg-highlight/20 blur-3xl" />
        <div className="relative flex flex-col gap-4">
          <p className="flex items-center gap-2 text-xs font-extrabold uppercase leading-4 tracking-[0.14em] text-on-dark-2">
            <Icon name="timer" size="sm" className="!size-4 text-highlight" /> Studied today
          </p>
          <p className="text-[clamp(40px,4vw,54px)] font-extrabold leading-none tracking-[-0.02em] tabular-nums">{fmtClock(live.todaySeconds)}</p>
          <p className="text-[13px] leading-[19px] text-on-dark-2">
            {live.active
              ? `Your timer is running in “${live.active.roomTitle}”.`
              : live.todaySeconds
                ? "Nice work today. Take a seat in a room to add more."
                : "Join a room below: your timer starts the moment you sit down."}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <GoalBar label="Daily goal" done={live.todaySeconds} target={learning.dailyGoalMinutes * 60} />
            <GoalBar label="Weekly goal" done={live.weekSeconds} target={learning.weeklyGoalHours * 3600} />
          </div>
          {learning.goals.length > 0 && (
            <ul aria-label="My learning goals" className="flex flex-wrap gap-2">
              {learning.goals.map((g, i) => (
                <li key={`${i}-${g}`} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                  <Icon name="target" size="sm" className="!size-3.5 text-highlight" /> {g}
                </li>
              ))}
            </ul>
          )}
          <a href="/app/settings#learning" className="self-start text-xs font-bold text-on-dark-2 underline-offset-2 hover:text-white hover:underline">
            Edit goals ›
          </a>
          <dl className="grid grid-cols-2 gap-3 border-t border-white/10 pt-4 sm:grid-cols-4">
            {tiles.map(([label, value]) => (
              <div key={label} className="flex flex-col gap-0.5">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-on-dark-2">{label}</dt>
                <dd className="text-base font-extrabold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="relative flex flex-col gap-3">
          <p className="text-xs font-extrabold uppercase leading-4 tracking-[0.14em] text-on-dark-2">Last 7 days</p>
          <WeekBars days={live.last7} />
        </div>
      </section>
      <Milestones items={studyMilestones(live)} />
    </>
  );
}

/* ───────────── Page ───────────── */

export default function StudyRoomsP({ user }) {
  const rooms = useLiveQuery(listStudyRooms, POLL_MS.list);
  const stats = useLiveQuery(getMyStudyStats, POLL_MS.stats);
  const settings = useSettings();
  const now = useNow();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [joining, setJoining] = useState(null);
  const [switchTo, setSwitchTo] = useState(null);
  const [joinError, setJoinError] = useState(null);

  const data = rooms.data;
  const myRoomId = data?.myActiveRoomId ?? null;
  const myRoom = data?.rooms.find((r) => r.id === myRoomId);
  const studyingNow = data?.rooms.reduce((n, r) => n + r.activeCount, 0) ?? 0;

  const visible = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.rooms.filter(
      (r) =>
        (!q || [r.title, r.module, r.description, r.creator?.fullName].some((t) => t?.toLowerCase().includes(q))) &&
        (filter !== "live" || r.activeCount > 0) &&
        (filter !== "mine" || (MODULES_BY_LEVEL[user?.level] ?? []).includes(r.module))
    );
  }, [data, query, filter, user]);

  const enter = useCallback(async (room) => {
    setJoining(room.id);
    setJoinError(null);
    try {
      await joinStudyRoom(room.id);
      window.location.assign(studyRoomPath(room.id));
    } catch (err) {
      setJoinError(err?.message ?? "Couldn’t join the room. Please try again.");
      setJoining(null);
    }
  }, []);

  const onJoin = (room) => {
    if (room.id === myRoomId) return window.location.assign(studyRoomPath(room.id));
    if (myRoomId) return setSwitchTo(room);
    enter(room);
  };

  return (
    <>
      {createOpen && (
        <CreateStudyRoomModal
          level={user?.level}
          favoriteModules={settings.data?.learning.favoriteModules}
          onClose={() => setCreateOpen(false)}
          onCreated={(room) => window.location.assign(studyRoomPath(room.id))}
        />
      )}
      {switchTo && (
        <ConfirmDialog
          title="Switch rooms?"
          message={`Your timer in “${myRoom?.title ?? "your current room"}” stops and your time there is saved. A new timer starts in “${switchTo.title}”.`}
          confirmLabel="Switch & sit down"
          tone="primary"
          busy={joining === switchTo.id}
          onCancel={() => setSwitchTo(null)}
          onConfirm={() => enter(switchTo)}
        />
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-[640px] flex-col gap-1.5">
          <h1 className="font-serif text-[30px] font-bold leading-[38px] tracking-[-0.005em] text-fg">Study With Me</h1>
          <p className="text-[15px] leading-[23px] text-fg-2">
            Study alongside other UMBB students. No camera, no chat: just company, a desk and a clock that keeps you honest.
          </p>
        </div>
        <Button variant="amber" size="m" onClick={() => setCreateOpen(true)}>
          <Icon name="plus" size="sm" /> Open a study room
        </Button>
      </div>

      {myRoom && (
        <a
          href={studyRoomPath(myRoom.id)}
          className="group flex items-center gap-4 rounded-[18px] border border-accent-line bg-accent-soft p-3 pr-5 transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
        >
          <StudyIllustration seed={myRoom.id + "me"} pose={2} className="w-[86px] shrink-0" />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-primary-text">Your desk is waiting</span>
            <span className="truncate text-[15px] font-bold text-fg">You’re studying in {myRoom.title}</span>
          </span>
          <span className="hidden items-center gap-1 text-sm font-bold text-primary-text sm:flex">
            Back to your desk <Icon name="chevronRight" size="sm" className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </a>
      )}

      {stats.status === "ready" ? (
        <MyStudy stats={stats.data} now={now} learning={(settings.data ?? DEFAULT_SETTINGS).learning} />
      ) : stats.status === "loading" ? (
        <div className="h-[220px] animate-pulse rounded-[22px] bg-surface-2" aria-hidden="true" />
      ) : null}

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-lg font-extrabold leading-6 text-fg">Open rooms</h2>
            <p className="text-[13px] leading-[19px] text-fg-2" aria-live="polite">
              {data ? `${studyingNow} ${studyingNow === 1 ? "student is" : "students are"} studying right now${rooms.stale ? " · reconnecting…" : ""}` : " "}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <Input
            icon="search"
            aria-label="Search rooms"
            placeholder="Search by room, module or student"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="md:w-[340px]"
          />
          <Chips label="Filter rooms" value={filter} options={filtersFor(user?.level)} onChange={setFilter} />
        </div>

        {joinError && <p role="alert" className="text-[13px] font-bold text-live">{joinError}</p>}

        {rooms.status === "loading" ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[380px] animate-pulse rounded-[20px] bg-surface-2" />
            ))}
          </div>
        ) : rooms.status === "error" ? (
          <Note>
            {errorText(rooms.error, "Study rooms")}
            <Button variant="outline" size="s" onClick={rooms.refresh} className="dark:bg-surface dark:text-fg">Try again</Button>
          </Note>
        ) : visible.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((room) => (
              <StudyRoomCard
                key={room.id}
                room={room}
                snapshot={data}
                now={now}
                mine={room.id === myRoomId}
                busy={joining === room.id}
                onJoin={onJoin}
              />
            ))}
          </div>
        ) : (
          <section className="flex flex-col items-center gap-3 rounded-[22px] border border-dashed border-line-strong bg-surface px-6 py-10 text-center">
            <StudyIllustration seed="empty-list" pose="empty" className="w-[160px]" />
            <p className="text-lg font-extrabold text-fg">{data?.rooms.length ? "No room matches" : "No rooms open yet"}</p>
            <p className="max-w-[420px] text-sm leading-5 text-fg-2">
              {data?.rooms.length ? "Try another search or filter, or open your own room." : "Be the first: open a room and others can come and study beside you."}
            </p>
            <Button variant="primary" size="s" onClick={() => setCreateOpen(true)}>
              <Icon name="plus" size="sm" /> Open a study room
            </Button>
          </section>
        )}
      </section>
    </>
  );
}
