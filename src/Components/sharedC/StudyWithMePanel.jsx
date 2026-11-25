import Button from "../uiC/Button.jsx";
import Icon from "../uiC/Icon.jsx";
import StudyIllustration from "./StudyIllustration.jsx";
import { useLiveQuery } from "../../hooks/useLiveQuery.js";
import { useNow } from "../../hooks/useNow.js";
import { POLL_MS, STUDY_PATH, fmtDuration, listStudyRooms, liveRoomSeconds, studyRoomPath } from "../../services/studyRoomsService.js";

/**
 * Dashboard entry to Study With Me: who is studying right now, the busiest rooms, and the way back to your own desk.
 * Hidden when the service isn't reachable (the full page explains that).
 */
export default function StudyWithMePanel() {
  const { status, data } = useLiveQuery(listStudyRooms, POLL_MS.list);
  const now = useNow();
  if (status !== "ready") return null;

  const rooms = data.rooms.slice(0, 3);
  const studying = data.rooms.reduce((n, r) => n + r.activeCount, 0);
  const mine = data.rooms.find((r) => r.id === data.myActiveRoomId);
  const faces = data.rooms.flatMap((r) => r.participants ?? []).slice(0, 4);

  return (
    <section aria-labelledby="swm-title" className="relative flex flex-col gap-4 overflow-hidden rounded-[20px] border border-line bg-surface p-[22px]">
      <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-highlight/15 blur-3xl" />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id="swm-title" className="flex items-center gap-2 text-lg font-extrabold leading-6 text-fg">
            <Icon name="lamp" className="text-primary-text" /> Study With Me
          </h2>
          <p className="text-[13px] leading-[19px] text-fg-2">
            {studying
              ? `${studying} ${studying === 1 ? "student is" : "students are"} studying right now. Pull up a chair.`
              : "Quiet right now. Open a room and others will join you."}
          </p>
        </div>
        <div className="flex items-end" aria-hidden="true">
          {(faces.length ? faces : [{ id: "empty" }]).map((p, i) => (
            <StudyIllustration key={p.id} seed={p.id} pose={faces.length ? undefined : "empty"} className={`w-[64px] ${i ? "-ml-4" : ""}`} />
          ))}
        </div>
      </div>

      {mine && (
        <a
          href={studyRoomPath(mine.id)}
          className="relative flex items-center gap-3 rounded-[14px] bg-ink px-4 py-3 text-white transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
        >
          <span className="live-pulse size-2 shrink-0 rounded-full bg-[#2fa37a]" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-sm font-bold">Your timer is running in {mine.title}</span>
          <span className="text-sm font-bold text-highlight">Back to your desk →</span>
        </a>
      )}

      {rooms.length > 0 && (
        <ul className="relative flex flex-col divide-y divide-line">
          {rooms.map((r) => (
            <li key={r.id}>
              <a href={studyRoomPath(r.id)} className="group flex items-center gap-3 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-ink">
                  <Icon name="books" size="sm" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-bold leading-5 text-fg group-hover:text-primary-text">{r.title}</span>
                  <span className="truncate text-xs leading-4 text-fg-3">
                    {r.module} · {fmtDuration(liveRoomSeconds(r, data, now))} studied
                  </span>
                </span>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${r.activeCount ? "bg-primary-soft text-primary-text" : "bg-surface-2 text-fg-3"}`}>
                  {r.activeCount ? `${r.activeCount} studying` : "quiet"}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}

      <Button variant="outline" size="s" onClick={() => window.location.assign(STUDY_PATH)} className="relative w-full sm:w-fit dark:bg-surface dark:text-fg">
        {rooms.length ? "See all study rooms" : "Open a study room"} <span aria-hidden="true">→</span>
      </Button>
    </section>
  );
}
