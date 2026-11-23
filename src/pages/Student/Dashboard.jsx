import { useState } from "react";
import Button from "../../Components/uiC/Button.jsx";
import Icon from "../../Components/uiC/Icon.jsx";
import KpiCard from "../../Components/sharedC/KpiCard.jsx";
import UpcomingRow from "../../Components/sharedC/UpcomingRow.jsx";
import JoinRequestCard from "../../Components/sharedC/JoinRequestCard.jsx";
import RecommendedSessionCard from "../../Components/sharedC/RecommendedSessionCard.jsx";
import SessionStatusBadge from "../../Components/sharedC/SessionStatusBadge.jsx";
import CreateSessionModal from "../../Components/sharedC/CreateSessionModal.jsx";

// Placeholder data (Figma v1.1) until the sessions/bookings API is wired.
const KPIS = [
  { icon: "calendar", value: "6 / 8", label: "Sessions joined this month" },
  { icon: "cap", value: "12", label: "Sessions hosted" },
  { icon: "star", value: "4.7", label: "Host rating" },
  { icon: "flame", value: "6", label: "Active days this month" },
];

const INITIAL_UPCOMING = [
  { id: 1, day: "TODAY", time: "12:30", today: true, title: "Jointures SQL et normalisation", meta: "Bases de données · Online", status: "Live now", statusTone: "live", actionLabel: "Enter classroom", actionVariant: "primary" },
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
  const [upcoming, setUpcoming] = useState(INITIAL_UPCOMING);
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
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-serif text-[30px] font-bold leading-[38px] tracking-[-0.005em] text-fg">
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

      <div className="flex items-start gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {/* Happening now */}
          <section className="flex flex-col gap-3.5 rounded-[22px] bg-ink p-6">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-xs font-extrabold uppercase leading-4 tracking-[0.14em] text-on-dark-2">
                <Icon name="clock" size="sm" className="size-4" /> Happening now
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-highlight/[.18] px-2.5 py-[5px] text-xs font-bold leading-4 text-highlight">
                <Icon name="video" size="sm" className="size-3.5" /> Online
              </span>
            </div>
            <p className="text-[42px] font-extrabold leading-[46px] tracking-[-0.01em] text-white">12:30 – 13:30</p>
            <div className="flex flex-col gap-0.5">
              <p className="text-[17px] font-bold leading-6 text-white">Jointures SQL et normalisation</p>
              <p className="text-[13px] leading-[19px] text-on-dark-2">with Yacine Haddad · Bases de données</p>
            </div>
            <div className="flex items-center gap-3.5">
              <Button variant="amber" size="m">
                Enter classroom <span aria-hidden="true">→</span>
              </Button>
              <span className="text-[13px] leading-[19px] text-on-dark-2">3 seats left</span>
            </div>
          </section>

          <div className="flex gap-4">
            {KPIS.map((k) => (
              <KpiCard key={k.label} {...k} />
            ))}
          </div>

          <Panel title="Your upcoming sessions" action={<ViewAll />} className="flex flex-col gap-1.5">
            <div>
              {upcomingRows.map(({ id, ...row }) => (
                <UpcomingRow key={id} {...row} />
              ))}
            </div>
          </Panel>
        </div>

        {/* Right rail */}
        <div className="flex w-[360px] shrink-0 flex-col gap-6">
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
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-lg font-extrabold leading-6 text-fg">Recommended for you</h2>
            <p className="text-[13px] leading-[19px] text-fg-2">
              Based on your modules, field and level, connections, host ratings and timing.
            </p>
          </div>
          <ViewAll />
        </div>
        <div className="flex items-stretch gap-5">
          {RECOMMENDED.map(({ id, ...session }) => (
            <RecommendedSessionCard key={id} session={session} />
          ))}
        </div>
      </section>
    </>
  );
}
