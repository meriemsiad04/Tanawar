import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "../../../Components/uiC/Button.jsx";
import Icon from "../../../Components/uiC/Icon.jsx";
import Avatar from "../../../Components/uiC/Avatar.jsx";
import ConfirmDialog from "../../../Components/sharedC/ConfirmDialog.jsx";
import StudyIllustration from "../../../Components/sharedC/StudyIllustration.jsx";
import { LiveCount } from "../../../Components/sharedC/StudyRoomCard.jsx";
import { avatarFill, firstName, initialsOf } from "../../../Components/sharedC/studyUi.js";
import { useStudyRoom } from "../../../hooks/useStudyRoom.js";
import { useLiveQuery } from "../../../hooks/useLiveQuery.js";
import { useNow } from "../../../hooks/useNow.js";
import { getSession } from "../../../services/authService.js";
import {
  POLL_MS,
  STUDY_PATH,
  fmtClock,
  fmtDuration,
  getMyStudyStats,
  liveRoomSeconds,
  liveSeconds,
  liveStats,
  studyMilestones,
} from "../../../services/studyRoomsService.js";

const myId = () => {
  const u = getSession()?.user;
  return u?.id ?? (u?.matricule ? `m-${u.matricule}` : null);
};

const sinceText = (iso) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  return h < 24 ? `${h} h ago` : new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

/* ───────────── Desks ───────────── */

function Desk({ p, seconds, leader, me }) {
  return (
    <li
      className={`seat-in relative flex flex-col items-center gap-2 rounded-[20px] border px-3 pb-4 pt-3 transition-[border-color,box-shadow] duration-500 ${
        leader ? "border-highlight bg-highlight/[.07] shadow-[0_0_0_3px_rgb(255_184_0/0.18)]" : me ? "border-primary bg-primary-soft" : "border-line bg-surface"
      }`}
    >
      {leader && (
        <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-highlight px-2 py-0.5 text-[11px] font-extrabold leading-4 text-[#2a2000]">
          <Icon name="crown" size="sm" className="!size-3.5" /> Longest
        </span>
      )}
      {me && (
        <span className="absolute right-3 top-3 z-10 rounded-full bg-primary px-2 py-0.5 text-[11px] font-extrabold leading-4 text-white">You</span>
      )}
      <StudyIllustration seed={p.id} label={`${p.fullName} studying`} className="w-full max-w-[170px]" />
      <p className="w-full truncate text-center text-sm font-bold leading-5 text-fg">{me ? "You" : p.fullName}</p>
      <p className="text-[22px] font-extrabold leading-none tracking-[-0.01em] text-fg tabular-nums" aria-label={`${fmtDuration(seconds)} in this room`}>
        {fmtClock(seconds)}
      </p>
    </li>
  );
}

function EmptySeat({ onJoin, busy }) {
  return (
    <li className="flex flex-col items-center justify-center gap-2 rounded-[20px] border-2 border-dashed border-accent-line bg-accent-soft/60 px-3 pb-4 pt-3">
      <StudyIllustration seed="free-seat" pose="empty" className="w-full max-w-[170px]" />
      <p className="text-sm font-bold text-fg">A free desk</p>
      <Button variant="primary" size="s" onClick={onJoin} disabled={busy}>
        <Icon name="enter" size="sm" /> {busy ? "Sitting down…" : "Take a seat"}
      </Button>
    </li>
  );
}

/* ───────────── My desk ───────────── */

function MyDesk({ room, inRoom, mySeconds, sitting, today, nextMilestone, busy, onJoin, onLeave }) {
  return (
    <section aria-label="Your timer" className="relative flex flex-col gap-4 overflow-hidden rounded-[22px] bg-ink p-6 text-white">
      <span aria-hidden="true" className={`absolute -right-16 -top-16 size-52 rounded-full blur-3xl transition-colors duration-700 ${inRoom ? "bg-highlight/30" : "bg-white/5"}`} />
      <p className="relative flex items-center gap-2 text-xs font-extrabold uppercase leading-4 tracking-[0.14em] text-on-dark-2">
        {inRoom ? <span className="live-pulse size-2 rounded-full bg-[#2fa37a]" aria-hidden="true" /> : <Icon name="timer" size="sm" className="!size-4" />}
        {inRoom ? "You’re studying" : "Your time in this room"}
      </p>
      <p className="relative text-[clamp(40px,3.6vw,52px)] font-extrabold leading-none tracking-[-0.02em] tabular-nums" aria-live="off">
        {fmtClock(mySeconds)}
      </p>
      <dl className="relative grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
        <div className="flex flex-col gap-0.5">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-on-dark-2">This sitting</dt>
          <dd className="text-base font-extrabold tabular-nums">{inRoom ? fmtClock(sitting) : "—"}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-on-dark-2">Today, all rooms</dt>
          <dd className="text-base font-extrabold tabular-nums">{today === null ? "—" : fmtDuration(today)}</dd>
        </div>
      </dl>
      {nextMilestone && (
        <div className="relative flex items-center gap-3 rounded-[14px] bg-white/[.07] p-3">
          <Icon name={nextMilestone.icon} className="text-highlight" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="truncate text-xs font-bold text-white">Next: {nextMilestone.title}</p>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-highlight transition-[width] duration-700" style={{ width: `${Math.round((nextMilestone.current / nextMilestone.target) * 100)}%` }} />
            </div>
          </div>
        </div>
      )}
      {inRoom ? (
        <Button variant="ghostDark" size="m" onClick={onLeave} disabled={busy === "leave"} className="relative w-full">
          <Icon name="door" size="sm" /> {busy === "leave" ? "Leaving…" : "Leave room"}
        </Button>
      ) : (
        <Button variant="amber" size="m" onClick={onJoin} disabled={busy === "join"} className="relative w-full">
          <Icon name="enter" size="sm" /> {busy === "join" ? "Sitting down…" : mySeconds ? "Sit back down" : "Take a seat"}
        </Button>
      )}
      <p className="relative text-xs leading-[18px] text-on-dark-2">
        {inRoom
          ? "Your timer runs while this page is open. Leave or close it and the timer stops; your time in “" + room.title + "” is kept."
          : "Your timer starts the moment you sit down. Nobody sees or hears you: only your name and your time."}
      </p>
    </section>
  );
}

/* ───────────── Ranking ───────────── */

const RANK_STYLE = ["bg-highlight text-[#2a2000]", "bg-line-strong text-fg", "bg-[#e0a37a] text-[#3a1d0a]"];

function Ranking({ rows, meId }) {
  const leader = rows[0]?.seconds || 1;
  const top = rows.slice(0, 10);
  const mine = rows.findIndex((r) => r.id === meId);
  const list = mine >= 10 ? [...top, { ...rows[mine], rank: mine + 1 }] : top;
  return (
    <section className="flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-5">
      <div className="flex flex-col gap-0.5">
        <h2 className="flex items-center gap-2 text-lg font-extrabold leading-6 text-fg">
          <Icon name="trophy" className="text-warn" /> Live ranking
        </h2>
        <p className="text-[13px] leading-[19px] text-fg-2">Total time in this room, updated live. Time is kept when someone steps away.</p>
      </div>
      {list.length ? (
        <ol className="flex flex-col gap-1.5">
          {list.map((r, i) => {
            const rank = r.rank ?? i + 1;
            const me = r.id === meId;
            return (
              <li key={r.id} className={`flex flex-col gap-1.5 rounded-[12px] px-2.5 py-2 ${me ? "bg-primary-soft" : ""} ${mine >= 10 && me ? "mt-1 border-t border-dashed border-line pt-2.5" : ""}`}>
                <div className="flex items-center gap-2.5">
                  <span className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${RANK_STYLE[rank - 1] ?? "bg-surface-2 text-fg-2"}`}>{rank}</span>
                  <Avatar initials={initialsOf(r.fullName)} src={r.avatarUrl} size={30} className={avatarFill(r.id)} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[13px] font-bold leading-[18px] text-fg">{me ? "You" : r.fullName}</span>
                    <span className="flex items-center gap-1 text-[11px] leading-4 text-fg-3">
                      {r.active ? (
                        <>
                          <span className="size-1.5 rounded-full bg-[#2fa37a]" aria-hidden="true" /> studying
                        </>
                      ) : (
                        `away · ${sinceText(r.lastSeenAt)}`
                      )}
                    </span>
                  </div>
                  <span className="shrink-0 text-[13px] font-extrabold tabular-nums text-fg">{fmtClock(r.seconds)}</span>
                </div>
                <div className="ml-[34px] h-1 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${rank === 1 ? "bg-highlight" : me ? "bg-primary" : "bg-accent/60"}`}
                    style={{ width: `${Math.max(2, (r.seconds / leader) * 100)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-[13px] text-fg-2">Nobody has studied here yet. Take the first spot.</p>
      )}
    </section>
  );
}

/* ───────────── Page ───────────── */

export default function StudyRoomP({ roomId }) {
  const room = useStudyRoom(roomId);
  const stats = useLiveQuery(getMyStudyStats, POLL_MS.stats);
  const now = useNow();
  const [confirmLeave, setConfirmLeave] = useState(false);
  const meId = useMemo(() => myId(), []);

  const { data, status, error, inRoom } = room;

  // Everyone's live time, ranked (all rooms' participants, including those who stepped away).
  const ranked = useMemo(() => {
    if (!data) return [];
    return data.participants
      .map((p) => ({ ...p, seconds: liveSeconds(p.seconds, p.active, data, now) }))
      .sort((a, b) => b.seconds - a.seconds || Number(b.active) - Number(a.active));
  }, [data, now]);
  const studying = ranked.filter((p) => p.active);
  const leaderId = studying.length > 1 ? studying[0].id : null;

  const mySeconds = data ? liveSeconds(data.me.seconds, inRoom, data, now) : 0;
  const sitting = data ? liveSeconds(data.me.sittingSeconds, inRoom, data, now) : 0;
  const myStats = stats.data ? liveStats(stats.data, now) : null;
  const nextMilestone = myStats ? studyMilestones(myStats).find((m) => !m.unlocked) : null;

  // The tab title shows the running timer, so it stays visible from other tabs.
  useEffect(() => {
    if (!data) return;
    const previous = document.title;
    document.title = inRoom ? `${fmtClock(mySeconds)} · ${data.room.title}` : `${data.room.title} · Study With Me`;
    return () => {
      document.title = previous;
    };
  }, [data, inRoom, mySeconds]);

  const leave = useCallback(async () => {
    await room.leave();
    setConfirmLeave(false);
  }, [room]);

  if (status === "loading") {
    return <div className="h-[420px] animate-pulse rounded-[22px] bg-surface-2" aria-label="Loading the room" />;
  }
  if (status === "error") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[22px] border border-line bg-surface px-6 py-12 text-center">
        <StudyIllustration seed="missing" pose="empty" className="w-[150px]" />
        <p className="text-lg font-extrabold text-fg">{error?.code === "ROOM_NOT_FOUND" ? "This room has closed" : "Couldn’t open this room"}</p>
        <p className="max-w-[420px] text-sm leading-5 text-fg-2">
          {error?.code === "NOT_CONFIGURED" ? "Study rooms will be available once the server is connected." : error?.message}
        </p>
        <div className="flex gap-2.5">
          {error?.code !== "ROOM_NOT_FOUND" && (
            <Button variant="outline" size="s" onClick={room.refresh} className="dark:bg-surface dark:text-fg">Try again</Button>
          )}
          <Button variant="primary" size="s" onClick={() => window.location.assign(STUDY_PATH)}>All study rooms</Button>
        </div>
      </div>
    );
  }

  const r = data.room;
  return (
    <>
      {confirmLeave && (
        <ConfirmDialog
          title="Leave the room?"
          message={`Your timer stops at ${fmtClock(mySeconds)}. Your time is saved and keeps adding up when you come back.`}
          confirmLabel="Leave room"
          cancelLabel="Keep studying"
          busy={room.busy === "leave"}
          onCancel={() => setConfirmLeave(false)}
          onConfirm={leave}
        />
      )}

      <a href={STUDY_PATH} className="-mb-2 inline-flex w-fit items-center gap-1.5 text-[13px] font-bold text-fg-2 hover:text-fg">
        <span aria-hidden="true">←</span> All study rooms
      </a>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 max-w-[720px] flex-col gap-1.5">
          <p className="text-xs font-extrabold uppercase leading-4 tracking-[0.14em] text-primary-text">{r.module}</p>
          <h1 className="font-serif text-[30px] font-bold leading-[38px] tracking-[-0.005em] text-fg">{r.title}</h1>
          <p className="text-[14px] leading-[22px] text-fg-2">
            Opened by {r.creator?.id === meId ? "you" : r.creator?.fullName}
            {r.description ? <> · {r.description}</> : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-bold text-fg-2">
            <Icon name="clock" size="sm" className="!size-3.5" />
            <span className="tabular-nums text-fg">{fmtDuration(liveRoomSeconds(r, data, now))}</span> studied here
          </span>
          <span className="rounded-full border border-line">
            <LiveCount count={r.activeCount} />
          </span>
          {room.stale && (
            <span role="status" className="inline-flex items-center gap-1.5 rounded-full bg-warn-soft px-3 py-1.5 text-xs font-bold text-warn">
              <Icon name="loader" size="sm" className="!size-3.5 animate-spin" /> Reconnecting…
            </span>
          )}
        </div>
      </header>

      {room.interrupted && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-[14px] border border-line bg-warn-soft px-4 py-3 text-[13px] leading-[19px] text-fg">
          <Icon name="alert" size="sm" className="text-warn" />
          <span className="min-w-0 flex-1">
            Your timer stopped: we lost contact with this page for a while (sleep, network, or you joined another room). Your time is saved.
          </span>
          <Button variant="primary" size="s" onClick={room.join} disabled={room.busy === "join"}>Sit back down</Button>
          <button type="button" onClick={room.dismissInterrupted} aria-label="Dismiss" className="cursor-pointer text-fg-3 hover:text-fg">
            <Icon name="close" size="sm" />
          </button>
        </div>
      )}
      {room.actionError && <p role="alert" className="text-[13px] font-bold text-live">{room.actionError}</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start xl:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-label="Study hall" className="relative flex flex-col gap-4 overflow-hidden rounded-[22px] border border-line bg-surface p-5 sm:p-6">
          <span aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-highlight/10 blur-3xl" />
          <div className="relative flex items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold leading-6 text-fg">The study hall</h2>
            <p className="text-[13px] text-fg-3">
              {studying.length ? `${studying.length} at ${studying.length === 1 ? "a desk" : "their desks"}` : "Empty for now"}
            </p>
          </div>
          <ul className="relative grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
            {!inRoom && <EmptySeat onJoin={room.join} busy={room.busy === "join"} />}
            {studying.map((p) => (
              <Desk key={p.id} p={p} seconds={p.seconds} leader={p.id === leaderId} me={p.id === meId} />
            ))}
          </ul>
          {studying.length === 1 && inRoom && (
            <p className="relative text-[13px] leading-[19px] text-fg-3">
              You’re the first one here. Others see this room in the list and can join you anytime.
            </p>
          )}
        </section>

        <aside className="flex min-w-0 flex-col gap-6">
          <MyDesk
            room={r}
            inRoom={inRoom}
            mySeconds={mySeconds}
            sitting={sitting}
            today={myStats ? myStats.todaySeconds : null}
            nextMilestone={nextMilestone}
            busy={room.busy}
            onJoin={room.join}
            onLeave={() => setConfirmLeave(true)}
          />
          <Ranking rows={ranked} meId={meId} />
        </aside>
      </div>

      {studying.length > 0 && (
        <p className="sr-only" aria-live="polite">
          {studying.length} studying: {studying.slice(0, 5).map((p) => firstName(p.fullName)).join(", ")}
        </p>
      )}
    </>
  );
}
