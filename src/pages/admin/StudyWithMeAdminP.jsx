import { useCallback, useEffect, useState } from "react";
import Button from "../../Components/uiC/Button.jsx";
import Icon from "../../Components/uiC/Icon.jsx";
import CountUp from "../../Components/motion/CountUp.jsx";
import { fmtNum, getStudyOverview, isStudyDemo, resetStudyDemo } from "../../services/adminStudyRoomsService.js";
import { adminErrorText } from "./students/format.js";
import StudyRoomsTable from "./study/StudyRoomsTable.jsx";
import StudyReportsQueue from "./study/StudyReportsQueue.jsx";
import StudyAnalytics from "./study/StudyAnalytics.jsx";
import StudyRoomDetailDialog from "./study/StudyRoomDetailDialog.jsx";
import RoomActionDialog from "./study/RoomActionDialog.jsx";

const TABS = [
  { key: "rooms", label: "Study rooms", icon: "lamp" },
  { key: "reports", label: "Reports", icon: "flag" },
  { key: "analytics", label: "Analytics", icon: "chartLine" },
];
const REFRESH_MS = 30_000;

const readTab = () => {
  const h = window.location.hash.slice(1);
  return TABS.some((t) => t.key === h) ? h : "rooms";
};
/** `?room=<id>` opens that room, so it can be linked to (overview, activity log). */
const readRoom = () => new URLSearchParams(window.location.search).get("room");
const writeRoom = (id) => {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("room", id);
  else url.searchParams.delete("room");
  window.history.replaceState(null, "", url);
};

/**
 * Admin: Study With Me (/admin/study). Overview numbers, the rooms table, the reports queue and analytics, plus the
 * room details dialog with moderation (close / reopen, remove / warn a participant, notes, reports).
 * Spec + backend contract: docs/study-with-me-admin.md. Every rule is enforced by the server; hiding a button is UX only.
 */
export default function StudyWithMeAdminP() {
  const [tab, setTab] = useState(readTab);
  const [version, setVersion] = useState(0);
  const [overview, setOverview] = useState({ data: null, error: null, loading: true });
  const [notice, setNotice] = useState({ text: "", tone: "ok" });
  const [open, setOpen] = useState(() => (readRoom() ? { id: readRoom(), tab: "participants" } : null));
  const [page, setPage] = useState({ items: [], first: 1, total: 0 });
  const [quick, setQuick] = useState(null); // { room, action } from a table row

  useEffect(() => {
    const onHash = () => setTab(readTab());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Overview: on load, after every change, and every 30 s while the tab is visible.
  useEffect(() => {
    let active = true;
    const load = () =>
      getStudyOverview().then(
        (data) => active && setOverview({ data, error: null, loading: false }),
        (error) => active && setOverview((o) => ({ data: o.data, error, loading: false }))
      );
    load();
    const t = setInterval(() => !document.hidden && load(), REFRESH_MS);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [version]);

  const changed = useCallback((text, tone = "ok") => {
    if (text) setNotice({ text, tone });
    setVersion((v) => v + 1);
  }, []);

  const selectTab = (key) => {
    setTab(key);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${key}`);
  };
  const openRoom = (id, roomTab = "participants") => {
    setOpen({ id, tab: roomTab });
    writeRoom(id);
  };
  const closeRoom = () => {
    setOpen(null);
    writeRoom(null);
  };
  const onPage = useCallback((items, first, total) => setPage({ items, first, total }), []);

  // Previous / Next only when the open room is on the table's current page.
  const index = open && tab === "rooms" ? page.items.findIndex((r) => r.id === open.id) : -1;
  const o = overview.data;

  return (
    <>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="flex items-center gap-2.5 text-2xl font-extrabold leading-8 text-fg">
            Study With Me
            {o?.activeRooms ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-xs font-bold text-success-ink">
                <span aria-hidden="true" className="size-[7px] animate-pulse rounded-full bg-success motion-reduce:animate-none" /> Live
              </span>
            ) : null}
          </h1>
          <p className="max-w-[720px] text-sm leading-5 text-fg-2">
            Every study room on TANAWAR: who is studying, where and for how long. Investigate reports, close rooms that break the rules and follow how students use the feature.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isStudyDemo() && (
            <Button
              size="s"
              variant="outline"
              className="!border-line-strong !bg-surface !text-fg-2 hover:!bg-surface-2"
              title="Demo only: undo every admin action made on the mock data"
              onClick={() => {
                resetStudyDemo();
                changed("Demo data reset.");
              }}
            >
              <Icon name="flip" size="sm" /> Reset demo
            </Button>
          )}
          <Button size="s" variant="outline" className="!border-line-strong !bg-surface !text-fg hover:!bg-surface-2" onClick={() => changed("")} aria-label="Refresh">
            <Icon name="flip" size="sm" className={overview.loading ? "animate-spin" : ""} /> Refresh
          </Button>
        </div>
      </header>

      {notice.text && (
        <div
          role={notice.tone === "error" ? "alert" : "status"}
          className={`animate-dialog-in flex items-start gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${
            notice.tone === "error" ? "border-live/25 bg-danger-soft text-live" : "border-primary/25 bg-primary-soft text-primary-text"
          }`}
        >
          <Icon name={notice.tone === "error" ? "alert" : "check"} size="sm" className="mt-px" />
          <span className="flex-1">{notice.text}</span>
          <button type="button" onClick={() => setNotice({ text: "", tone: "ok" })} aria-label="Dismiss" className="cursor-pointer rounded opacity-70 hover:opacity-100">
            <Icon name="close" size="sm" />
          </button>
        </div>
      )}

      <OverviewCards overview={overview} onReported={() => selectTab("reports")} />

      <div className="flex flex-col gap-4">
        <div role="tablist" aria-label="Study With Me sections" className="inline-flex w-fit max-w-full gap-1 overflow-x-auto rounded-[14px] bg-surface-2 p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`study-tab-${t.key}`}
              aria-selected={tab === t.key}
              aria-controls={`study-panel-${t.key}`}
              onClick={() => selectTab(t.key)}
              className={`flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-[10px] px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 ${
                tab === t.key ? "bg-surface text-fg shadow-sm" : "text-fg-2 hover:text-fg"
              }`}
            >
              <Icon name={t.icon} size="sm" />
              {t.label}
              {t.key === "reports" && o?.openReports ? (
                <span className="rounded-full bg-warn px-1.5 py-0.5 text-[11px] leading-none text-white dark:text-ink">{o.openReports}</span>
              ) : null}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`study-panel-${tab}`} aria-labelledby={`study-tab-${tab}`}>
          {tab === "rooms" && (
            <StudyRoomsTable version={version} openId={open?.id} onOpen={(id) => openRoom(id)} onPage={onPage} onQuickAction={(room, action) => setQuick({ room, action })} />
          )}
          {tab === "reports" && <StudyReportsQueue version={version} onInvestigate={(id) => openRoom(id, "reports")} onChanged={changed} />}
          {tab === "analytics" && <StudyAnalytics version={version} onOpenRoom={(id) => openRoom(id)} />}
        </div>
      </div>

      {open && (
        <StudyRoomDetailDialog
          key={open.tab}
          id={open.id}
          tab={open.tab}
          position={index >= 0 ? { index: page.first + index, total: page.total } : null}
          onPrev={index > 0 ? () => openRoom(page.items[index - 1].id) : null}
          onNext={index >= 0 && index < page.items.length - 1 ? () => openRoom(page.items[index + 1].id) : null}
          onClose={closeRoom}
          onChanged={changed}
        />
      )}

      {quick && (
        <RoomActionDialog
          action={quick.action}
          room={quick.room}
          onCancel={() => setQuick(null)}
          onConflict={(message) => {
            setQuick(null);
            changed(message, "error");
          }}
          onDone={(message) => {
            setQuick(null);
            changed(message);
          }}
        />
      )}
    </>
  );
}

const CARDS = [
  { key: "totalRooms", label: "Study rooms", icon: "lamp", tint: "bg-accent-soft text-accent-ink", value: (o) => o.totalRooms },
  { key: "activeRooms", label: "Active right now", icon: "activity", tint: "bg-success-soft text-success-ink", value: (o) => o.activeRooms, live: true },
  { key: "studyingNow", label: "Students studying now", icon: "users", tint: "bg-primary-soft text-primary-text", value: (o) => o.studyingNow, live: true },
  { key: "totalSeconds", label: "Total study hours", icon: "timer", tint: "bg-highlight/20 text-fg", value: (o) => (o.totalSeconds == null ? null : Math.round(o.totalSeconds / 3600)), suffix: " h" },
  { key: "reportedRooms", label: "Reported rooms", icon: "flag", tint: "bg-warn-soft text-warn", value: (o) => o.reportedRooms, hint: (o) => (o.openReports != null ? `${fmtNum(o.openReports)} open report${o.openReports === 1 ? "" : "s"}` : null), link: true },
];

function OverviewCards({ overview, onReported }) {
  const o = overview.data;
  if (!o && overview.loading) {
    return (
      <div role="status" aria-label="Loading statistics" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {CARDS.map((c) => <span key={c.key} className="h-[126px] animate-pulse rounded-[18px] bg-surface-2" />)}
      </div>
    );
  }
  if (!o && overview.error) {
    return (
      <div role="alert" className="flex items-start gap-3 rounded-[18px] border border-line bg-surface p-4 text-sm text-fg-2">
        <Icon name="warning" className="text-warn" />
        <span>{adminErrorText(overview.error, "We couldn't load the Study With Me statistics.")}</span>
      </div>
    );
  }
  return (
    <section aria-label="Study With Me overview" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {CARDS.map((c) => {
        const v = c.value(o);
        const hint = c.hint?.(o);
        const body = (
          <>
            <div className="mb-1.5 flex items-center justify-between">
              <span className={`flex size-10 items-center justify-center rounded-xl ${c.tint}`}>
                <Icon name={c.icon} />
              </span>
              {c.live && v > 0 && <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-success motion-reduce:animate-none" />}
              {c.link && <Icon name="chevronRight" size="sm" className="text-fg-3 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />}
            </div>
            <p className="text-2xl font-extrabold leading-[30px] tracking-[-0.01em] tabular-nums text-fg">
              {v == null ? <span className="text-base font-bold text-fg-3">Not available yet</span> : <CountUp key={v} value={`${fmtNum(v)}${c.suffix ?? ""}`} duration={900} />}
            </p>
            <p className="text-[13px] leading-[19px] text-fg-2">{c.label}</p>
            {hint && <p className="text-xs leading-4 text-fg-3">{hint}</p>}
          </>
        );
        const cls = "group flex min-w-0 flex-col gap-1 rounded-[18px] border border-line bg-surface p-[18px] text-left transition-[border-color,box-shadow] hover:shadow-md";
        return c.link ? (
          <button key={c.key} type="button" onClick={onReported} className={`${cls} cursor-pointer hover:border-warn/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30`}>
            {body}
          </button>
        ) : (
          <div key={c.key} className={cls}>{body}</div>
        );
      })}
    </section>
  );
}
