import { useCallback, useMemo, useState } from "react";
import Avatar from "../../../Components/uiC/Avatar.jsx";
import Button from "../../../Components/uiC/Button.jsx";
import Icon from "../../../Components/uiC/Icon.jsx";
import Label from "../../../Components/uiC/Label.jsx";
import ContributionHeatmap from "../../../Components/sharedC/ContributionHeatmap.jsx";
import RatingStars from "../../../Components/sharedC/RatingStars.jsx";
import SessionListCard from "../../../Components/sharedC/SessionListCard.jsx";
import LeaveSessionDialog from "../../../Components/sharedC/LeaveSessionDialog.jsx";
import { useAsync } from "../../../hooks/useAsync.js";
import { useSessionActions } from "../../../hooks/useSessionActions.js";
import { listSessions } from "../../../services/sessionsService.js";
import { getStudent, getStudentAttendance, rateStudent, sendFriendRequest } from "../../../services/studentsService.js";

const initialsOf = (name = "") => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
const pad = (n) => String(n).padStart(2, "0");

function Panel({ title, children, className = "" }) {
  return (
    <section className={`rounded-[20px] border border-line bg-surface p-5 sm:p-[22px] ${className}`}>
      <h2 className="pb-3 text-lg font-extrabold leading-6 text-fg">{title}</h2>
      {children}
    </section>
  );
}

const Note = ({ children }) => (
  <div className="flex flex-col items-start gap-3 rounded-[18px] border border-line bg-surface p-5 text-[13px] leading-[19px] text-fg-2">{children}</div>
);

const InfoTile = ({ label, value }) => (
  <div className="flex min-w-0 flex-col gap-0.5 rounded-[14px] bg-surface-2 px-4 py-3">
    <span className="text-xs leading-4 text-fg-2">{label}</span>
    <span className="truncate text-[15px] font-bold leading-5 text-fg">{value || "–"}</span>
  </div>
);

/** Interactive 1–5 stars for rating a tutor. */
function RateStars({ value, disabled, onRate }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value || 0;
  return (
    <div role="radiogroup" aria-label="Rate this tutor" className="flex gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          disabled={disabled}
          onMouseEnter={() => setHover(n)}
          onClick={() => onRate(n)}
          className="cursor-pointer rounded-md p-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 disabled:cursor-not-allowed"
        >
          <Icon name="star" size="lg" className={n <= shown ? "fill-highlight text-highlight" : "text-line-strong"} />
        </button>
      ))}
    </div>
  );
}

/** Another student's profile: identity, info, attendance, rating (rate this tutor) and the sessions they host. */
export default function StudentProfileP({ studentId }) {
  const student = useAsync(useCallback(() => getStudent(studentId), [studentId]));
  const sessions = useAsync(listSessions);
  const [from] = useState(() => {
    const d = new Date();
    return `${d.getFullYear() - 1}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
  const attendance = useAsync(useCallback(() => getStudentAttendance(studentId, from), [studentId, from]));
  const actions = useSessionActions();
  const { apply } = actions;
  const [friendStatus, setFriendStatus] = useState(null); // overrides the loaded one after "Add friend"
  const [rating, setRating] = useState(null); // { rating, ratingCount, myRating } after rating here
  const [rateBusy, setRateBusy] = useState(false);
  const [error, setError] = useState("");

  const hosted = useMemo(() => apply((sessions.data ?? []).filter((s) => s.host?.id === studentId)), [apply, sessions.data, studentId]);

  if (student.status === "loading") return <Note>Loading profile…</Note>;
  if (student.status === "error")
    return (
      <Note>
        {student.error?.message === "Student not found." ? "This student doesn’t exist or isn’t visible to you." : "This profile isn’t available right now."}
        <a href="/app/connections" className="text-sm font-bold text-primary-text hover:underline">
          Back to connections ›
        </a>
      </Note>
    );

  const p = student.data;
  const status = friendStatus ?? p.friendStatus;
  const r = rating ?? { rating: p.rating, ratingCount: p.ratingCount, myRating: p.myRating };
  const firstName = p.fullName.split(" ")[0];

  const addFriend = async () => {
    setError("");
    setFriendStatus("sending");
    try {
      await sendFriendRequest(p.id);
      setFriendStatus("pending");
    } catch {
      setFriendStatus(null);
      setError("Couldn’t send the friend request. Please try again.");
    }
  };

  const rate = async (value) => {
    setError("");
    setRateBusy(true);
    try {
      const saved = await rateStudent(p.id, value);
      setRating({ ...saved, myRating: value });
    } catch {
      setError("Couldn’t save your rating. Please try again.");
    } finally {
      setRateBusy(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6">
      {/* Identity */}
      <section className="overflow-hidden rounded-[20px] border border-line bg-surface">
        <div aria-hidden="true" className="h-28 bg-gradient-to-r from-ink via-primary to-accent" />
        <div className="flex flex-col gap-5 px-5 pb-5 sm:px-[22px] sm:pb-[22px]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <span className="-mt-12 self-start rounded-full border-4 border-surface">
              <Avatar initials={initialsOf(p.fullName)} src={p.avatarUrl} size={96} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:pt-3">
              <h1 className="truncate text-2xl font-extrabold leading-8 text-fg">{p.fullName}</h1>
              {p.verified && (
                <Label variant="secondary" className="self-start">
                  <Icon name="verified" size="sm" className="!size-3.5" /> Verified UMBB student
                </Label>
              )}
            </div>
            {status === "friends" ? (
              <Button size="s" variant="outline" disabled className="disabled:opacity-100">
                <Icon name="userCheck" size="sm" /> Friends
              </Button>
            ) : status === "pending" ? (
              <Button size="s" variant="outline" disabled className="disabled:opacity-70">
                <Icon name="check" size="sm" /> Request sent
              </Button>
            ) : (
              <Button size="s" onClick={addFriend} disabled={status === "sending"}>
                {status === "sending" ? "Sending…" : "Add friend"}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <InfoTile label="Field" value={p.major} />
            <InfoTile label="Level" value={p.level} />
            <InfoTile label="Faculty" value={p.faculty} />
            <InfoTile label="Sessions given" value={p.sessionsGiven} />
          </div>

          {p.bio && <p className="whitespace-pre-line text-sm leading-6 text-fg">{p.bio}</p>}

          {(p.strongModules?.length > 0 || p.interests?.length > 0) && (
            <ul className="flex flex-wrap gap-2">
              {p.strongModules?.map((m) => (
                <li key={m}>
                  <Label variant="secondary">
                    <Icon name="cap" size="sm" className="!size-3.5" /> {m}
                  </Label>
                </li>
              ))}
              {p.interests?.map((i) => (
                <li key={i}>
                  <Label variant="neutral">#{i}</Label>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {error && (
        <p role="alert" className="text-[13px] font-bold text-live">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Panel title="Attendance" className="min-w-0">
          {attendance.status === "ready" ? (
            <ContributionHeatmap data={attendance.data} />
          ) : (
            <p className="py-6 text-sm text-fg-2">{attendance.status === "loading" ? "Loading…" : "Attendance isn’t available right now."}</p>
          )}
        </Panel>

        <Panel title="Rating" className="flex flex-col">
          <p className="text-[42px] font-extrabold leading-[46px] tracking-[-0.01em] text-fg">{r.ratingCount ? Number(r.rating).toFixed(1) : "–"}</p>
          <div className="flex items-center gap-2 pt-1">
            <RatingStars value={r.rating} />
            <span className="text-sm text-fg-2">
              {r.ratingCount} review{r.ratingCount === 1 ? "" : "s"}
            </span>
          </div>
          <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
            <p className="text-sm font-bold text-fg">{r.myRating ? `You rated ${firstName} ${r.myRating}★` : "Rate this tutor"}</p>
            <RateStars value={r.myRating} disabled={rateBusy} onRate={rate} />
          </div>
        </Panel>
      </div>

      <section className="flex flex-col gap-3.5">
        <h2 className="text-lg font-extrabold leading-6 text-fg">Sessions by {firstName}</h2>
        {actions.error && (
          <p role="alert" className="text-[13px] font-bold text-live">
            {actions.error}
          </p>
        )}
        {sessions.status === "ready" && hosted.length ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {hosted.map((s) => (
              <SessionListCard
                key={s.id}
                session={s}
                busy={actions.busyId === s.id}
                onAction={actions.onAction}
                onCancel={actions.cancelRequest}
                onEnter={actions.enter}
                onLeave={actions.askLeave}
              />
            ))}
          </div>
        ) : (
          <Note>
            {sessions.status === "loading"
              ? "Loading sessions…"
              : sessions.status === "error"
                ? "Sessions aren’t available right now."
                : `${firstName} has no upcoming session.`}
          </Note>
        )}
      </section>

      <LeaveSessionDialog
        session={actions.leaving}
        busy={actions.busyId === actions.leaving?.id}
        onConfirm={actions.confirmLeave}
        onCancel={actions.cancelLeave}
      />
    </div>
  );
}
