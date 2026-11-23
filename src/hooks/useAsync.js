import { useCallback, useEffect, useState } from "react";

/**
 * Runs `load()` on mount and on reload(). Returns { status: "loading" | "ready" | "error", data, error, reload }.
 * `load` must be a stable reference (module-level function or useCallback).
 */
export function useAsync(load) {
  const [state, setState] = useState({ status: "loading", data: null, error: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let active = true;
    load().then(
      (data) => active && setState({ status: "ready", data, error: null }),
      (error) => active && setState({ status: "error", data: null, error })
    );
    return () => {
      active = false;
    };
  }, [load, tick]);

  const reload = useCallback(() => {
    setState({ status: "loading", data: null, error: null });
    setTick((t) => t + 1);
  }, []);

  return { ...state, reload };
}
