import { useEffect, useSyncExternalStore } from "react";
import { settingsStore } from "../services/settingsService.js";

/**
 * The signed-in student's settings, shared by every component (Settings page, study rooms, theme toggle…).
 * The first component that mounts loads them. Returns { status: "idle" | "loading" | "ready" | "error", data, error, reload, save }.
 * Readers that only need a value can use `data?.learning…` and fall back to DEFAULT_SETTINGS while loading.
 */
export function useSettings() {
  const state = useSyncExternalStore(settingsStore.subscribe, settingsStore.getSnapshot);

  useEffect(() => {
    if (settingsStore.getSnapshot().status === "idle") settingsStore.load().catch(() => {});
  }, []);

  return { ...state, reload: () => settingsStore.load().catch(() => {}), save: settingsStore.save };
}
