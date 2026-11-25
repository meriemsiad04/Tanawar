import { useState } from "react";
import Button from "../../Components/uiC/Button.jsx";
import Icon from "../../Components/uiC/Icon.jsx";
import KpiCard from "../../Components/sharedC/KpiCard.jsx";
import UpcomingRow from "../../Components/sharedC/UpcomingRow.jsx";
import JoinRequestCard from "../../Components/sharedC/JoinRequestCard.jsx";
import RecommendedSessionCard from "../../Components/sharedC/RecommendedSessionCard.jsx";
import SessionStatusBadge from "../../Components/sharedC/SessionStatusBadge.jsx";
import CreateSessionModal from "../../Components/sharedC/CreateSessionModal.jsx";
import ModuleCard from "../../Components/sharedC/ModuleCard.jsx";
import SuggestedStudentCard from "../../Components/sharedC/SuggestedStudentCard.jsx";
import { classroomPath, joinSession, leaveSession } from "../../services/sessionsService.js";
import { useAsync } from "../../hooks/useAsync.js";
import { getModules, getSuggestedStudents, sendFriendRequest } from "../../services/studentsService.js";

// Placeholder data (Figma v1.1) until the sessions/bookings API is wired.


const INITIAL_UPCOMING = [
  { id: "live-sql", day: "TODAY", time: "12:30", today: true, title: "Jointures SQL et normalisation", meta: "Bases de données · Online", status: "Live now", statusTone: "live", actionLabel: "Enter classroom", actionVariant: "primary", onAction: () => window.location.assign(classroomPath("live-sql")) },
  { id: 2, day: "THU", time: "10:00", title: "Analyse 2 – Séries entières", meta: "Analyse · Bloc 5, Salle 12", status: "Joined", statusTone: "joined", actionLabel: "Leave" },
  { id: 3, day: "SAT", time: "14:00", title: "Réseaux – Modèle OSI en 1 heure", meta: "Réseaux · Online", status: "Request pending", statusTone: "warn", actionLabel: "Cancel request" },
];

// Placeholder join requests, seeded when a private session is opened until the bookings API exists.
const DEMO_REQUESTERS = [
  { initials: "SB", name: "Sara Benali", level: "L2", avatarClassName: "bg-primary" },
  { initials: "AK", name: "Amine Kaci", level: "L3", avatarClassName: "bg-accent" },
];

const RECOMMENDED = [
  { id: 1, module: "Systèmes d’exploitation · L3", status: "Scheduled", statusTone: "clay", reason: "Matches your module", title: "Ordonnancement des processus : exercices type examen", host: { initials: "LO", name: "Lina Ouali", rating: "4.8", className: "bg-accent" }, when: "Tomorrow · 16:00 · 90 min", where: "Bloc 2, Salle 7", booked: 6, capacity: 15, access: "Public" },
  { id: 2, module: "Génie logiciel · L3", status: "Scheduled", statusTone: "clay", reason: "Same field and level", title: "Diagrammes UML : cas d’utilisation et séquence", host: { initials: "RS", name: "Rania Saadi", rating: "4.9", className: "bg-primary" }, when: "Thu · 18:00 · 60 min", where: "Online classroom", whereIcon: "video", booked: 8, capacity: 10, access: "Private" },
  { id: 3, module: "Analyse 2 · L2", status: "Full", statusTone: "neutral", reason: "Module you need help with", title: "Intégrales généralisées : méthode et exercices types", host: { initials: "AK", name: "Amina Khelifi", rating: "4.8", className: "bg-warn" }, when: "Tomorrow · 10:00 · 120 min", where: "Amphi B", booked: 20, capacity: 20, access: "Public" },
];

// Placeholder: two sessions "created by" the user, to preview the "Your sessions" column until the sessions API exists.
// Remove (start from []) once real data is wired.
const inDays = (days, hour, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};
const initialMine = () => [
  {
    id: "mine-1", type: "scheduled", title: "Révision SQL : jointures et sous-requêtes", module: "Bases de données", level: "L3",
    startsAt: inDays(1, 14), mode: "online", meetingLink: "https://meet.google.com/", location: null, seats: 12, visibility: "public",
    createdAt: Date.now() - 3600_000,
  },
  {
    id: "mine-2", type: "scheduled", title: "Exercices UML : diagrammes de séquence", module: "Génie logiciel", level: "L3",
    startsAt: inDays(3, 10, 30), mode: "onsite", meetingLink: null, location: "Bloc 5, Salle 12", seats: 20, visibility: "private",
    createdAt: Date.now() - 2 * 3600_000,
  },
];

// Placeholder: pending join requests for the private test session above. Remove (start from []) once real data is wired.
const INITIAL_REQUESTS = [
  { id: "req-1", sessionId: "mine-2", session: "Exercices UML : diagrammes de séquence", initials: "SB", name: "Sara Benali", level: "L2", avatarClassName: "bg-primary" },
  { id: "req-2", sessionId: "mine-2", session: "Exercices UML : diagrammes de séquence", initials: "AK", name: "Amine Kaci", level: "L3", avatarClassName: "bg-accent" },
];

function greeting(date = new Date()) {
  const h = date.getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function Panel({ title, action, className = "", children }) {
  return (
    <section className={`rounded-[20px] border border-line bg-surface p-[22px] ${className}`}>
      <div className="flex items-center justify-between pb-2">
        <h2 className="text-lg font-extrabold leading-6 text-fg">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const Eyebrow = ({ children }) => (
  <p className="text-xs font-extrabold uppercase leading-4 tracking-[0.14em] text-fg-3">{children}</p>
);

const ViewAll = () => (
  <a href="/app/sessions" className="text-sm font-bold leading-5 text-accent-ink hover:underline">
    View all ›
  </a>
);

const SeeAll = ({ href }) => (
  <a href={href} className="text-sm font-bold leading-5 text-primary-text hover:underline">
    See all
  </a>
);

const SectionHead = ({ title, href }) => (
  <div className="flex items-center justify-between">
    <h2 className="text-lg font-extrabold leading-6 text-fg">{title}</h2>
    <SeeAll href={href} />
  </div>
);

const Note = ({ children }) => <p className="rounded-[18px] border border-line bg-surface p-5 text-[13px] leading-[19px] text-fg-2">{children}</p>;

const MODULES_SHOWN = 4;
const STUDENTS_SHOWN = 4;

async function loadDashboardPeople() {
  const modules = await getModules().catch(() => null);
  const students = await getSuggestedStudents(modules ?? []);
  return { modules, students };
}

/** "Your modules" + "Suggested students" (ranked by shared modules, then major/level/rating). */
function ModulesAndStudents() {
  // Modules load first; suggestions are ranked against them, but still load if modules fail.
  const { status, data } = useAsync(loadDashboardPeople);
  const modules = { status, data: data?.modules ?? [] };
  const students = { status, data: data?.students ?? [] };
  const [friend, setFriend] = useState({}); // id → "sending" | "sent"
  const [friendError, setFriendError] = useState("");

  const addFriend = async ({ id }) => {
    setFriendError("");
    setFriend((f) => ({ ...f, [id]: "sending" }));
    try {
      await sendFriendRequest(id);
      setFriend((f) => ({ ...f, [id]: "sent" }));
    } catch {
      setFriend((f) => Object.fromEntries(Object.entries(f).filter(([k]) => k !== id)));
      setFriendError("Couldn’t send the friend request. Please try again.");
    }
  };

  return (
    <>
      <section className="flex flex-col gap-3.5">
        <SectionHead title="Your modules" href="/app/modules" />
        {status === "loading" ? (
          <Note>Loading your modules…</Note>
        ) : status === "error" || !data.modules ? (
          <Note>Your modules aren’t available right now.</Note>
        ) : modules.data.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            {modules.data.slice(0, MODULES_SHOWN).map((m) => (
              <ModuleCard key={m.code} module={m} />
            ))}
          </div>
        ) : (
          <Note>You have no modules yet. Add your strong modules in your profile.</Note>
        )}
      </section>

      <section className="flex flex-col gap-3.5">
        <SectionHead title="Suggested students" href="/app/students" />
        {friendError && (
          <p role="alert" className="text-[13px] font-bold text-live">
            {friendError}
          </p>
        )}
        {students.status === "ready" && students.data.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {students.data.slice(0, STUDENTS_SHOWN).map((s) => (
              <SuggestedStudentCard key={s.id} student={s} status={friend[s.id]} onAdd={addFriend} />
            ))}
          </div>
        ) : (
          <Note>
            {students.status === "error"
              ? "Suggestions aren’t available right now."
              : students.status === "loading"
                ? "Finding students for you…"
                : "No suggestions yet. Check back once more students join your modules."}
          </Note>
        )}
      </section>
    </>
  );
}

const MY_SESSIONS_SHOWN = 4;
const hhmm = (d) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const whenLabel = (iso) => {
  const d = new Date(iso);
  const today = d.toDateString() === new Date().toDateString();
  return `${today ? "Today" : d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} · ${hhmm(d)}`;
};

/**
 * Right column, under "Create session": the sessions this user created.
 * Order: the one running now, then scheduled ones (soonest first), then ended ones (latest first).
 */
function MySessionsPanel({ sessions, runningId, onEnd }) {
  const rank = (s) => (s.id === runningId ? 0 : s.type === "scheduled" ? 1 : 2);
  const sorted = [...sessions].sort((a, b) =>
    rank(a) - rank(b) || (rank(a) === 1 ? new Date(a.startsAt) - new Date(b.startsAt) : b.createdAt - a.createdAt)
  );

  return (
    <Panel title="Your sessions" action={sessions.length > MY_SESSIONS_SHOWN ? <ViewAll /> : null} className="flex flex-col gap-1">
      {sorted.length ? (
        <ul className="flex flex-col">
          {sorted.slice(0, MY_SESSIONS_SHOWN).map((s) => {
            const live = s.id === runningId;
            const online = s.mode === "online";
            return (
              <li key={s.id} className="flex flex-col gap-2 border-b border-line py-3 last:border-b-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  {live ? (
                    <SessionStatusBadge tone="live">Live now</SessionStatusBadge>
                  ) : s.type === "scheduled" ? (
                    <SessionStatusBadge tone="clay">Scheduled</SessionStatusBadge>
                  ) : (
                    <SessionStatusBadge tone="neutral">Ended</SessionStatusBadge>
                  )}
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-fg-3">
                    <Icon name={s.visibility === "private" ? "lock" : "globe"} size="sm" className="!size-3.5" />
                    {s.visibility === "private" ? "Private" : "Public"}
                  </span>
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="line-clamp-2 text-sm font-bold leading-5 text-fg">{s.title}</p>
                  <p className="text-[13px] leading-[19px] text-fg-2">
                    {whenLabel(s.startsAt)} · {online ? "Online" : s.location}
                  </p>
                  {live && (
                    <p className="text-[13px] leading-[19px] text-fg-2">
                      {s.joined} / {s.seats} joined
                    </p>
                  )}
                </div>
                {live && (
                  <div className="flex flex-wrap gap-2">
                    {online && (
                      <a
                        href={s.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-[38px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] bg-primary px-3 text-sm font-bold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
                      >
                        <Icon name="video" size="sm" className="!size-4" /> Open
                      </a>
                    )}
                    <Button size="s" variant="outline" onClick={onEnd} className={online ? "" : "flex-1"}>
                      End
                    </Button>
                  </div>
                )}
                {!live && s.type === "scheduled" && online && s.meetingLink && (
                  <a href={s.meetingLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] font-bold text-primary-text hover:underline">
                    Meeting link <Icon name="external" size="sm" className="!size-3.5" />
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-[13px] leading-[19px] text-fg-2">Sessions you create will appear here, so you can get back to them quickly.</p>
      )}
    </Panel>
  );
}

export default function Dashboard({ user = { name: "Meriem" } }) {
  const [requests, setRequests] = useState(INITIAL_REQUESTS);
  const [running, setRunning] = useState(null); // the session this user is hosting right now
  const [createOpen, setCreateOpen] = useState(false);
  const [created, setCreated] = useState(null);
  const [joined, setJoined] = useState({}); // recommended session id → true once joined (public sessions)
  const [requested, setRequested] = useState({}); // recommended session id → true once a join request is sent (private sessions)
  const [joinError, setJoinError] = useState("");
  const [upcoming, setUpcoming] = useState(INITIAL_UPCOMING);
  const [mine, setMine] = useState(initialMine); // sessions this user created (right column), until the sessions API exists
  const join = async ({ id }) => {
    setJoinError("");
    try {
      await joinSession(id);
      setJoined((j) => ({ ...j, [id]: true }));
    } catch {
      setJoinError("Couldn’t join the session. Please try again.");
    }
  };
  // TODO: call the join-request API once it exists; the host then approves or declines.
  const requestJoin = ({ id }) => setRequested((r) => ({ ...r, [id]: true }));
  const leave = async ({ id }) => {
    setJoinError("");
    try {
      await leaveSession(id);
      setJoined(({ ...j }) => (delete j[id], j));
    } catch {
      setJoinError("Couldn’t leave the session. Please try again.");
    }
  };
  const dismiss = (req) => setRequests((rs) => rs.filter((r) => r.id !== req.id));
  const approve = (req) => {
    // TODO: call approve API
    dismiss(req);
    setRunning((s) => (s && s.id === req.sessionId ? { ...s, joined: Math.min(s.joined + 1, s.seats) } : s));
  };
  const deny = (req) => dismiss(req); // TODO: call deny API
  const endSession = () => {
    // TODO: call end-session API
    setRunning(null);
    setRequests([]);
  };
  // Sessions go live on the platform as soon as they are created (no admin approval for now).
  const addUpcoming = (session) => {
    const d = new Date(session.startsAt);
    const isToday = d.toDateString() === new Date().toDateString();
    setUpcoming((list) => [
      ...list,
      {
        id: crypto.randomUUID(),
        startsAt: d.getTime(),
        day: isToday ? "TODAY" : d.toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase(),
        time: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        today: isToday,
        title: session.title,
        meta: `${session.module} · ${session.mode === "online" ? "Online" : session.location}`,
        status: "Hosting",
        statusTone: "joined",
        actionLabel: "Manage",
      },
    ]);
  };
  const openSession = (session) => {
    const id = session.id ?? crypto.randomUUID();
    setRunning({ ...session, id, joined: 0 });
    // Only private sessions need host approval; public ones are joined instantly.
    setRequests(
      session.visibility === "private"
        ? DEMO_REQUESTERS.map((r, i) => ({ ...r, id: `${id}-${i}`, sessionId: id, session: session.title }))
        : []
    );
  };

  // The session being hosted right now is also one of the user's upcoming sessions.
  const upcomingRows = running
    ? [
        {
          id: running.id,
          day: "TODAY",
          time: new Date(running.startsAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
          today: true,
          title: running.title,
          meta: `${running.module} · ${running.mode === "online" ? "Online" : running.location}`,
          status: "Live now",
          statusTone: "live",
          actionLabel: running.mode === "online" ? "Enter classroom" : "End session",
          actionVariant: "primary",
          onAction: running.mode === "online" ? () => window.open(running.meetingLink, "_blank", "noopener") : endSession,
        },
        ...upcoming,
      ]
    : upcoming;
  const todayCount = upcomingRows.filter((s) => s.today).length;

  return (
    <>
      {createOpen && (
        <CreateSessionModal
          user={user}
          onClose={() => setCreateOpen(false)}
          onCreate={(session) => {
            // TODO: POST the session to the API (resources as multipart) once the backend exists.
            const mineSession = { ...session, id: crypto.randomUUID(), createdAt: Date.now() };
            setMine((list) => [mineSession, ...list]);
            setCreated(session);
            if (session.type === "instant") openSession(mineSession);
            else addUpcoming(session);
            setCreateOpen(false);
          }}
        />
      )}

      {/* Two columns from lg (≥1024px). Row 1: greeting | "Create session" (bottom-aligned with the greeting).
          Row 2: main column | the user's sessions, so both columns start at the same height.
          On phones: greeting, Create session, your sessions, then the rest. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-start xl:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-1.5 lg:col-start-1 lg:row-start-1">
          <h1 className="font-serif text-[clamp(26px,2.1vw,30px)] font-bold leading-[1.27] tracking-[-0.005em] text-fg">
            {greeting()}, {user.name}
          </h1>
          <p className="text-[15px] leading-[23px] text-fg-2">
            You have {todayCount} session{todayCount === 1 ? "" : "s"} today and {requests.length} join request
            {requests.length === 1 ? "" : "s"} to review.
          </p>
        </div>

        <Button variant="amber" size="m" onClick={() => setCreateOpen(true)} className="w-full lg:col-start-2 lg:row-start-1 lg:self-end">
          <Icon name="plus" size="sm" /> Create session
        </Button>

        {/* Right column */}
        <aside aria-label="Your sessions" className="flex min-w-0 flex-col gap-6 lg:col-start-2 lg:row-start-2">
          <MySessionsPanel sessions={mine} runningId={running?.id} onEnd={endSession} />
          <Panel title="Needs your attention" className="flex flex-col gap-2.5">
            <div className="flex flex-col gap-2.5">
              <Eyebrow>Join requests{running ? ` · ${running.title}` : ""}</Eyebrow>
              {requests.length ? (
                requests.map((r) => <JoinRequestCard key={r.id} request={r} onApprove={approve} onDeny={deny} />)
              ) : (
                <p className="text-[13px] leading-[19px] text-fg-2">
                  {running && running.visibility === "public"
                    ? "Your session is public: students join instantly, no approval needed."
                    : "No pending requests. You’re all caught up."}
                </p>
              )}
            </div>
          </Panel>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-col gap-6 lg:col-start-1 lg:row-start-2">
          {created && (
            <div role="status" className="flex items-center gap-3 rounded-[14px] border border-line bg-primary-soft px-4 py-3 text-sm text-fg">
              <Icon name="check" className="text-primary" />
              <span className="flex-1">
                <b>{created.title}</b> was created
                {created.type === "scheduled" ? " and is now live on the platform." : " and is now running."}
              </span>
              <button type="button" onClick={() => setCreated(null)} aria-label="Dismiss" className="cursor-pointer text-fg-3 hover:text-fg">
                <Icon name="close" size="sm" />
              </button>
            </div>
          )}

          {/* Happening now */}
          <section className="flex flex-col gap-3.5 rounded-[22px] bg-ink p-6 short:gap-3 short:p-5">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-xs font-extrabold uppercase leading-4 tracking-[0.14em] text-on-dark-2">
                <Icon name="clock" size="sm" className="size-4" /> Happening now
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-highlight/[.18] px-2.5 py-[5px] text-xs font-bold leading-4 text-highlight">
                <Icon name="video" size="sm" className="size-3.5" /> Online
              </span>
            </div>
            <p className="text-[clamp(34px,2.92vw,42px)] font-extrabold leading-[1.1] tracking-[-0.01em] text-white">12:30 – 13:30</p>
            <div className="flex flex-col gap-0.5">
              <p className="text-[17px] font-bold leading-6 text-white">Jointures SQL et normalisation</p>
              <p className="text-[13px] leading-[19px] text-on-dark-2">with Yacine Haddad · Bases de données</p>
            </div>
            <div className="flex flex-wrap items-center gap-3.5">
              <Button variant="amber" size="m" onClick={() => window.location.assign(classroomPath("live-sql"))}>
                Enter classroom <span aria-hidden="true">→</span>
              </Button>
              <span className="text-[13px] leading-[19px] text-on-dark-2">3 seats left</span>
            </div>
          </section>



          <Panel title="Your upcoming sessions" action={<ViewAll />} className="flex flex-col gap-1.5">
            <div>
              {upcomingRows.map(({ id, ...row }) => (
                <UpcomingRow key={id} {...row} />
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {/* Recommended */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="text-lg font-extrabold leading-6 text-fg">Recommended for you</h2>
            <p className="text-[13px] leading-[19px] text-fg-2">
              Based on your modules, field and level, connections, host ratings and timing.
            </p>
          </div>
          <ViewAll />
        </div>
        {joinError && <p role="alert" className="text-[13px] font-bold text-live">{joinError}</p>}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {RECOMMENDED.map((session) => (
            <RecommendedSessionCard
              key={session.id}
              session={session}
              joined={Boolean(joined[session.id])}
              requested={Boolean(requested[session.id])}
              onAction={session.access === "Public" ? join : requestJoin}
              onEnter={({ id }) => window.location.assign(classroomPath(id))}
              onLeave={leave}
            />
          ))}
        </div>
      </section>

      <ModulesAndStudents />
    </>
  );
}
