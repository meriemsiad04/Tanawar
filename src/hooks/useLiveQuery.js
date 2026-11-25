import { useCallback, useEffect, useRef, useState } from "react";
import { onStudyRoomsChanged } from "../services/studyRoomsService.js";

/**
 * Like useAsync, but keeps the data fresh: refetches every `intervalMs` while the tab is visible, at once when the tab
 * becomes visible again, when the network comes back, and on every Study With Me change notification.
 * A failed refetch keeps the last data and sets `stale` (shown as "reconnecting"), so timers never disappear.
 * `load` must be a stable reference. `apply(data)` stores a fresh response (e.g. from join / leave) immediately.
 */
export function useLiveQuery(load, intervalMs) {
  const [state, setState] = useState({ status: "loading", data: null, error: null, stale: false });
  const runRef = useRef(() => {});

  useEffect(() => {
    let active = true;
    let inflight = false;
    let again = false;
    const run = async () => {
      if (inflight) {
        again = true; // a change arrived mid-request: fetch once more afterwards
        return;
      }
      inflight = true;
      try {
        const data = await load();
        if (active) setState({ status: "ready", data, error: null, stale: false });
      } catch (error) {
        if (active) setState((s) => (s.data ? { ...s, stale: true, error } : { status: "error", data: null, error, stale: false }));
      } finally {
        inflight = false;
        if (again && active) {
          again = false;
          run();
        }
      }
    };
    runRef.current = run;
    run();

    const timer = setInterval(() => {
      if (!document.hidden) run();
    }, intervalMs);
    const onVisible = () => {
      if (!document.hidden) run();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", run);
    const off = onStudyRoomsChanged(run);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", run);
      off();
    };
  }, [load, intervalMs]);

  const refresh = useCallback(() => runRef.current(), []);
  const apply = useCallback((data) => setState({ status: "ready", data, error: null, stale: false }), []);
  return { ...state, refresh, apply };
}
