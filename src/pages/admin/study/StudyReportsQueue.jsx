import { useEffect, useState } from "react";
import Button from "../../../Components/uiC/Button.jsx";
import Icon from "../../../Components/uiC/Icon.jsx";
import Chips from "../../../Components/uiC/Chips.jsx";
import Avatar from "../../../Components/uiC/Avatar.jsx";
import StudyRoomStatusBadge from "../../../Components/sharedC/StudyRoomStatusBadge.jsx";
import { REPORT_STATUS, answerStudyReport, listStudyReports } from "../../../services/adminStudyRoomsService.js";
import { adminErrorText, fmtDateTime, initialsOf } from "../students/format.js";

const STATUS_CHIPS = Object.entries(REPORT_STATUS).map(([value, s]) => ({ value, label: s.label }));

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
function age(iso) {
  const h = Math.round((Date.now() - new Date(iso).getTime()) / 3600_000);
  if (h < 1) return "just now";
  if (h < 48) return rtf.format(-h, "hour");
  return rtf.format(-Math.round(h / 24), "day");
}

/**
 * Reports on study rooms across the platform. Open reports come oldest first (they have waited the longest).
 * "Investigate" opens the room on its Reports tab, where the reported student can be warned or removed.
 */
export default function StudyReportsQueue({ version, onInvestigate, onChanged }) {
  const [status, setStatus] = useState("open");
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState({ key: null, data: null, error: null });
  const [busyId, setBusyId] = useState(null);

  const key = `${status}|${tick}|${version}`;
  useEffect(() => {
    let active = true;
    listStudyReports(status).then(
      (data) => active && setResult({ key, data, error: null }),
      (error) => active && setResult({ key, data: null, error })
    );
    return () => {
      active = false;
    };
  }, [key, status]);

  const loading = result.key !== key;
  const items = result.data?.items ?? [];

  const answer = async (rep, decision) => {
    setBusyId(rep.id);
    try {
      await answerStudyReport(rep.room.id, rep.id, decision);
      onChanged(decision === "resolve" ? `Report on “${rep.room.title}” marked as resolved.` : `Report on “${rep.room.title}” dismissed.`);
    } catch (err) {
      onChanged(adminErrorText(err, "That didn't work. Please try again."), "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Chips label="Report status" size="s" value={status} options={STATUS_CHIPS} onChange={setStatus} />
        {status === "open" && result.data && (
          <p className="text-[13px] text-fg-2">
            <b className="text-fg">{result.data.total}</b> open report{result.data.total === 1 ? "" : "s"}, oldest first
          </p>
        )}
      </div>

      <section aria-busy={loading} aria-label="Study room reports" className={`flex flex-col gap-3 transition-opacity ${loading && result.data ? "opacity-60" : ""}`}>
        {!result.data && loading ? (
          Array.from({ length: 3 }, (_, i) => <span key={i} className="h-36 animate-pulse rounded-[20px] bg-surface-2" />)
        ) : result.error && !loading ? (
          <div role="alert" className="flex flex-col items-center gap-3 rounded-[20px] border border-line bg-surface px-5 py-14 text-center text-sm text-fg-2">
            <Icon name="warning" size="lg" className="text-warn" />
            <p>{adminErrorText(result.error, "We couldn't load the reports.")}</p>
            <Button size="s" variant="outline" onClick={() => setTick((t) => t + 1)}>Try again</Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-[20px] border border-line bg-surface px-5 py-14 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-success-soft text-success-ink"><Icon name={status === "open" ? "check" : "inbox"} size="lg" /></span>
            <p className="text-sm font-semibold text-fg">{status === "open" ? "All caught up: no open report on study rooms." : `No ${REPORT_STATUS[status].label.toLowerCase()} reports.`}</p>
          </div>
        ) : (
          items.map((rep) => {
            const open = rep.status === "open";
            return (
              <article key={rep.id} className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-4 transition-shadow hover:shadow-md sm:p-5 lg:flex-row lg:items-center lg:gap-5">
                <span className={`hidden size-11 shrink-0 items-center justify-center rounded-[14px] sm:flex ${open ? "bg-warn-soft text-warn" : "bg-surface-2 text-fg-3"}`}>
                  <Icon name="flag" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-extrabold text-fg">{rep.reason}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${REPORT_STATUS[rep.status].className}`}>{REPORT_STATUS[rep.status].label}</span>
                    {open && <span className="text-xs font-semibold text-warn" title={fmtDateTime(rep.at)}>{age(rep.at)}</span>}
                  </div>
                  {rep.details && <p className="line-clamp-2 break-words text-[13px] text-fg-2">“{rep.details}”</p>}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-fg-3">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-fg">
                      <Icon name="lamp" size="sm" className="!size-3.5 text-fg-3" /> {rep.room?.title}
                    </span>
                    {rep.room && <StudyRoomStatusBadge status={rep.room.status} />}
                    {rep.reportedUser && (
                      <span className="inline-flex items-center gap-1.5">
                        <Avatar initials={initialsOf(rep.reportedUser.fullName)} size={20} className="bg-danger-soft !text-live" />
                        Reported student: <b className="text-fg">{rep.reportedUser.fullName}</b>
                      </span>
                    )}
                    <span>by {rep.reporter?.fullName ?? "a student"} · {fmtDateTime(rep.at)}</span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button size="s" onClick={() => onInvestigate(rep.room.id)}>
                    <Icon name="search" size="sm" /> Investigate
                  </Button>
                  {open && (
                    <>
                      <Button size="s" variant="outline" disabled={busyId != null} aria-busy={busyId === rep.id} onClick={() => answer(rep, "resolve")} aria-label={`Mark the report on ${rep.room.title} resolved`}>
                        <Icon name={busyId === rep.id ? "loader" : "check"} size="sm" className={busyId === rep.id ? "animate-spin" : ""} /> Resolve
                      </Button>
                      <Button size="s" variant="outline" className="!border-line-strong !bg-surface !text-fg-2" disabled={busyId != null} onClick={() => answer(rep, "dismiss")} aria-label={`Dismiss the report on ${rep.room.title}`}>
                        Dismiss
                      </Button>
                    </>
                  )}
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
