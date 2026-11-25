import { useMemo, useState } from "react";
import Button from "../../Components/uiC/Button.jsx";
import Chips from "../../Components/uiC/Chips.jsx";
import Icon from "../../Components/uiC/Icon.jsx";
import SessionListCard from "../../Components/sharedC/SessionListCard.jsx";
import LeaveSessionDialog from "../../Components/sharedC/LeaveSessionDialog.jsx";
import { useAsync } from "../../hooks/useAsync.js";
import { useSessionActions } from "../../hooks/useSessionActions.js";
import { getSession } from "../../services/authService.js";
import { dayPart, listSessions, recommendSessions } from "../../services/sessionsService.js";
import { getFriends, getModules } from "../../services/studentsService.js";

const AVAILABILITY = [
  { value: "", label: "Any" },
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
];

const Note = ({ children }) => (
  <div className="flex flex-col items-start gap-3 rounded-[18px] border border-line bg-surface p-5 text-[13px] leading-[19px] text-fg-2">{children}</div>
);

// Sessions, the student's modules and friends load together; modules/friends are optional signals.
async function loadForYou() {
  const [sessions, modules, friends] = await Promise.all([
    listSessions(),
    getModules().catch(() => []),
    getFriends().catch(() => []),
  ]);
  return { sessions, modules, friends };
}

/** "For you": sessions ranked by the student's modules, level and friends, filterable by time of day. */
export default function RecommendationsP() {
  const { status, data, reload } = useAsync(loadForYou);
  const actions = useSessionActions();
  const { apply } = actions;
  const [availability, setAvailability] = useState("");
  const level = getSession()?.user?.level ?? "";

  const moduleNames = useMemo(() => (data?.modules ?? []).map((m) => m.name), [data]);
  const ranked = useMemo(
    () =>
      recommendSessions(apply(data?.sessions ?? []), { modules: moduleNames, level, friends: (data?.friends ?? []).map((f) => f.id) }).filter(
        (s) => !availability || dayPart(s.startsAt) === availability
      ),
    [apply, data, moduleNames, level, availability]
  );
  const basis = [moduleNames.join(", "), level].filter(Boolean).join(" · ");

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="font-serif text-[30px] font-bold leading-[38px] tracking-[-0.005em] text-fg">For you</h1>
        <p className="text-[15px] leading-[23px] text-fg-2">
          {basis ? `Based on ${basis}` : "Based on your modules, level and friends."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-bold text-fg">Availability:</span>
        <Chips label="Availability" value={availability} options={AVAILABILITY} onChange={setAvailability} size="s" />
      </div>

      {actions.error && (
        <p role="alert" className="text-[13px] font-bold text-live">
          {actions.error}
        </p>
      )}

      {status === "loading" ? (
        <Note>Finding sessions for you…</Note>
      ) : status === "error" ? (
        <Note>
          Recommendations aren’t available right now.
          <Button variant="outline" size="s" onClick={reload}>
            Try again
          </Button>
        </Note>
      ) : ranked.length ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {ranked.map((s) => (
            <div key={s.id} className="flex flex-col gap-2">
              <ul aria-label="Why it’s recommended" className="flex min-h-[26px] flex-wrap gap-1.5">
                {s.reasons.map((r) => (
                  <li key={r} className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-[5px] text-xs font-bold leading-4 text-accent-ink">
                    <Icon name="spark" size="sm" className="!size-3.5" /> {r}
                  </li>
                ))}
              </ul>
              <SessionListCard
                session={s}
                busy={actions.busyId === s.id}
                onAction={actions.onAction}
                onCancel={actions.cancelRequest}
                onEnter={actions.enter}
                onLeave={actions.askLeave}
              />
            </div>
          ))}
        </div>
      ) : (
        <Note>
          {availability ? "Nothing matches this time of day. Try another one." : "No recommendations yet. Add your strong modules in your profile."}
        </Note>
      )}

      <LeaveSessionDialog
        session={actions.leaving}
        busy={actions.busyId === actions.leaving?.id}
        onConfirm={actions.confirmLeave}
        onCancel={actions.cancelLeave}
      />
    </>
  );
}
