import { useEffect, useMemo, useRef, useState } from "react";
import Avatar from "../../Components/uiC/Avatar.jsx";
import Icon from "../../Components/uiC/Icon.jsx";
import SessionStatusBadge from "../../Components/sharedC/SessionStatusBadge.jsx";
import { useAsync } from "../../hooks/useAsync.js";
import { getClassroom, uploadResource } from "../../services/sessionsService.js";

const initialsOf = (n = "") => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
const pad = (n) => String(n).padStart(2, "0");

/** Seconds until `target` (ms), re-evaluated every second; 0 once reached. */
function useCountdown(target) {
  const [left, setLeft] = useState(() => Math.max(0, Math.ceil((target - Date.now()) / 1000)));
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, Math.ceil((target - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [target]);
  return left;
}

/** One half of a flip-clock digit pair: shows the top or bottom half of the glyph. */
function Half({ bottom, children, className = "" }) {
  return (
    <div className={`absolute inset-x-0 overflow-hidden ${bottom ? "bottom-0" : "top-0"} h-1/2 ${bottom ? "rounded-b-[14px] bg-[color-mix(in_srgb,var(--color-highlight)_88%,black)]" : "rounded-t-[14px] bg-highlight"} ${className}`}>
      <div className={`absolute inset-x-0 flex h-[200%] items-center justify-center text-[36px] font-extrabold tabular-nums text-ink ${bottom ? "bottom-0" : "top-0"}`}>{children}</div>
    </div>
  );
}

/** Flip-clock tile: when `value` changes the old top half folds down and the new bottom half drops in. */
function FlipTile({ value, label }) {
  const text = pad(value);
  const [state, setState] = useState({ cur: text, prev: text });
  if (state.cur !== text) setState({ cur: text, prev: state.cur }); // derive on change, no effect needed
  const flipping = state.prev !== state.cur;
  useEffect(() => {
    if (!flipping) return;
    const t = setTimeout(() => setState((s) => ({ ...s, prev: s.cur })), 650);
    return () => clearTimeout(t);
  }, [flipping, state.cur]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-[76px] w-full shadow-sm" style={{ perspective: 400 }}>
        <Half>{state.cur}</Half>
        <Half bottom>{state.prev}</Half>
        {flipping && (
          <>
            <Half className="animate-flap-top origin-bottom [backface-visibility:hidden]" key={`t${state.cur}`}>{state.prev}</Half>
            <Half bottom className="animate-flap-bottom origin-top [backface-visibility:hidden]" key={`b${state.cur}`}>{state.cur}</Half>
          </>
        )}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-ink/25" />
      </div>
      <span className="text-xs font-bold uppercase leading-4 tracking-[0.1em] text-fg-3">{label}</span>
    </div>
  );
}

function Countdown({ seconds }) {
  const units = [
    ["Days", Math.floor(seconds / 86400)],
    ["Hours", Math.floor((seconds % 86400) / 3600)],
    ["Minutes", Math.floor((seconds % 3600) / 60)],
    ["Seconds", seconds % 60],
  ];
  return (
    <div role="timer" aria-label={`Starts in ${units.map(([l, v]) => `${v} ${l.toLowerCase()}`).join(", ")}`} className="grid grid-cols-4 gap-3">
      {units.map(([label, v]) => (
        <FlipTile key={label} value={v} label={label} />
      ))}
    </div>
  );
}

function Resources({ sessionId, items: initial }) {
  const [added, setAdded] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const items = [...(initial ?? []), ...added];

  async function onPick(e) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow re-picking the same file
    if (!files.length) return;
    setBusy(true);
    setError("");
    for (const f of files) {
      try {
        const r = await uploadResource(sessionId, f);
        setAdded((a) => [...a, r]);
      } catch (err) {
        setError(err.message || "Upload failed. Please try again.");
      }
    }
    setBusy(false);
  }

  return (
    <section className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-[22px]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold leading-6 text-fg">Resources</h2>
        <input ref={inputRef} type="file" multiple hidden onChange={onPick} />
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="inline-flex h-[38px] items-center gap-2 rounded-xl border border-line bg-surface-2 px-3.5 text-sm font-bold text-fg hover:bg-accent-soft disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
        >
          <Icon name="paperclip" size="sm" /> {busy ? "Uploading…" : "Attach file"}
        </button>
      </div>
      {error && <p role="alert" className="text-[13px] font-bold text-live">{error}</p>}
      {items.length ? (
        <ul className="flex flex-col gap-2">
          {items.map((r) => (
            <li key={r.id}>
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-[12px] bg-surface-2 px-3.5 py-3 text-sm font-bold text-fg hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
              >
                <Icon name={r.kind === "link" ? "link" : "file"} size="sm" className="text-primary-text" />
                <span className="min-w-0 flex-1 truncate">{r.name}</span>
                <Icon name="external" size="sm" className="text-fg-3" />
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] leading-[19px] text-fg-2">No resources yet. Attach a file to share it with the session.</p>
      )}
    </section>
  );
}

const isEmbeddable = (url) => {
  try { return new URL(url).hostname.endsWith("jit.si"); } catch { return false; }
};

function Room({ s }) {
  const startsAt = useMemo(() => new Date(s.startsAt).getTime(), [s.startsAt]);
  const left = useCountdown(startsAt);
  const online = s.mode === "online";
  const instant = s.type === "instant";
  const started = instant || left === 0;

  // Embeddable providers (Jitsi) render inside the page; others (Google Meet blocks iframes) open in a new tab.
  const embedded = started && online && isEmbeddable(s.meetingLink);

  const when = new Date(s.startsAt).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <a href="/app" className="text-sm font-bold text-primary-text hover:underline">‹ Back to dashboard</a>
      <section className="flex flex-col gap-5 rounded-[22px] border border-line bg-surface p-6">
        <div className="flex items-center justify-between gap-3">
         <div className="flex items-center gap-3">
          <Avatar initials={initialsOf(s.host?.name)} src={s.host?.avatarUrl} size={44} className="bg-accent" />
          <div className="flex flex-col">
            <span className="text-xs font-extrabold uppercase leading-4 tracking-[0.14em] text-fg-3">Hosted by</span>
            <span className="flex items-center gap-1.5 text-[15px] font-bold leading-5 text-fg">
              {s.host?.name}
              {s.host?.verified && <Icon name="verified" size="sm" label="Verified" className="!size-4 text-primary" />}
            </span>
          </div>
         </div>
          {s.seats > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-[13px] font-bold text-fg">
              <Icon name="users" size="sm" className="text-primary-text" />
              {s.joined ?? 0} / {s.seats} joined
              <span className="font-semibold text-fg-2">· {Math.max(s.seats - (s.joined ?? 0), 0)} left</span>
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SessionStatusBadge tone="clay">{s.module}</SessionStatusBadge>
          {started ? <SessionStatusBadge tone="live">Live now</SessionStatusBadge> : <SessionStatusBadge tone="joined">Scheduled</SessionStatusBadge>}
        </div>
        <div className="flex flex-col gap-1.5">
          <h1 className="font-serif text-[28px] font-bold leading-9 text-fg">{s.title}</h1>
          <p className="text-[15px] leading-[23px] text-fg-2">
            {when} · {s.durationMin} min · {online ? "Online" : s.location}
          </p>
        </div>

        {!started && (
          <>
            <p className="text-xs font-extrabold uppercase leading-4 tracking-[0.14em] text-fg-3">Starts in</p>
            <Countdown seconds={left} />
          </>
        )}

        {online ? (
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={started ? s.meetingLink : undefined}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!started}
              className={`inline-flex h-[46px] items-center justify-center gap-2 rounded-xl px-[22px] text-[15px] font-bold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 ${started ? "bg-primary hover:opacity-90" : "pointer-events-none bg-primary opacity-50"}`}
            >
              <Icon name="video" size="sm" /> {embedded ? "Open in new tab" : instant ? "Join the meeting" : "Enter meeting"}
            </a>
            {!started && <span className="text-[13px] text-fg-2">The meeting opens when the countdown ends.</span>}
          </div>
        ) : (
          <p className="flex items-center gap-2 text-sm font-bold text-fg">
            <Icon name="pin" size="sm" className="text-primary-text" /> {s.location}
          </p>
        )}
      </section>
      {embedded && (
        <iframe
          title={`Meeting: ${s.title}`}
          src={`${s.meetingLink}#config.prejoinPageEnabled=false&config.disableDeepLinking=true`}
          allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
          className="h-[70vh] min-h-[420px] w-full rounded-[20px] border border-line bg-black"
        />
      )}
      <Resources sessionId={s.id} items={s.resources} />
    </>
  );
}

/** Classroom for a session the student joined: instant → straight to the meeting; scheduled → countdown + resources. */
export default function ClassroomP({ sessionId }) {
  const { status, data } = useAsync(useMemo(() => () => getClassroom(sessionId), [sessionId]));
  if (status === "loading") return <p className="text-[15px] text-fg-2">Loading the classroom…</p>;
  if (status === "error")
    return (
      <div className="flex flex-col gap-3">
        <p role="alert" className="text-[15px] font-bold text-live">This classroom isn’t available. Make sure you joined the session.</p>
        <a href="/app" className="text-sm font-bold text-primary-text hover:underline">‹ Back to dashboard</a>
      </div>
    );
  return <Room s={data} />;
}
