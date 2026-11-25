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

function RunningSessionCard({ session, onEnd }) {
  const { title, module, level, mode, visibility, seats, joined, duration, meetingLink, location } = session;
  const online = mode === "online";
  return (
    <Panel title="Your running session" className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-3 rounded-[14px] border border-live/30 bg-danger-soft p-3.5">
        <div className="flex items-center justify-between gap-2">
          <SessionStatusBadge tone="live">Live now</SessionStatusBadge>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-fg-2">
            <Icon name={visibility === "private" ? "lock" : "globe"} size="sm" className="!size-3.5" />
            {visibility === "private" ? "Private" : "Public"}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-bold leading-5 text-fg">{title}</p>
          <p className="text-[13px] leading-[19px] text-fg-2">
            {module} · {level} · {duration} min · {online ? "Online" : location}
          </p>
          <p className="text-[13px] leading-[19px] text-fg-2">
            {joined} / {seats} joined · {Math.max(seats - joined, 0)} seats left
          </p>
        </div>
        <div className="flex gap-2">
          {online ? (
            <a
              href={meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-[38px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-bold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
            >
              <Icon name="video" size="sm" className="!size-4" /> Open classroom
            </a>
          ) : (
            <span className="inline-flex h-[38px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-surface px-3 text-sm font-bold text-fg">
              <Icon name="pin" size="sm" className="!size-4" /> {location}
            </span>
          )}
          <Button size="s" variant="outline" onClick={onEnd}>
            End
          </Button>
        </div>
      </div>
    </Panel>
  );
}

export default function Dashboard({ user = { name: "Meriem" } }) {
  const [requests, setRequests] = useState([]);
  const [running, setRunning] = useState(null); // the session this user is hosting right now
  const [createOpen, setCreateOpen] = useState(false);
  const [created, setCreated] = useState(null);
  const [joined, setJoined] = useState({}); // recommended session id → true once joined (public sessions)
  const [requested, setRequested] = useState({}); // recommended session id → true once a join request is sent (private sessions)
  const [joinError, setJoinError] = useState("");
  const [upcoming, setUpcoming] = useState(INITIAL_UPCOMING);
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
    const id = crypto.randomUUID();
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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="font-serif text-[clamp(26px,2.1vw,30px)] font-bold leading-[1.27] tracking-[-0.005em] text-fg">
            {greeting()}, {user.name}
          </h1>
          <p className="text-[15px] leading-[23px] text-fg-2">
            You have {todayCount} session{todayCount === 1 ? "" : "s"} today and {requests.length} join request
            {requests.length === 1 ? "" : "s"} to review.
          </p>
        </div>
        <Button variant="amber" size="m" onClick={() => setCreateOpen(true)}>
          <Icon name="plus" size="sm" /> Create session
        </Button>
      </div>

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

      {createOpen && (
        <CreateSessionModal
          user={user}
          onClose={() => setCreateOpen(false)}
          onCreate={(session) => {
            // TODO: POST the session to the API (resources as multipart) once the backend exists.
            setCreated(session);
            if (session.type === "instant") openSession(session);
            else addUpcoming(session);
            setCreateOpen(false);
          }}
        />
      )}

      {/* Side rail only from xl (≥1280px); on smaller laptops it drops below so the main column keeps its width. */}
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
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

        {/* Right rail */}
        <div className={`grid gap-6 xl:flex xl:w-[320px] xl:shrink-0 xl:flex-col 2xl:w-[360px] ${running ? "lg:grid-cols-2" : ""}`}>
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
        {running && <RunningSessionCard session={running} onEnd={endSession} />}
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
