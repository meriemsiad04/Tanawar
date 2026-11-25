import { useSyncExternalStore } from "react";

/**
 * One shared 1-second clock for every running timer on the page (a single interval, however many timers).
 * Returns a performance.now() value: use it with liveSeconds() from studyRoomsService, never as a date.
 */
let now = typeof performance !== "undefined" ? performance.now() : 0;
const listeners = new Set();
let timer = null;

const tick = () => {
  now = performance.now();
  listeners.forEach((l) => l());
};

function subscribe(listener) {
  listeners.add(listener);
  if (!timer) {
    tick();
    timer = setInterval(tick, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      clearInterval(timer);
      timer = null;
    }
  };
}

export const useNow = () => useSyncExternalStore(subscribe, () => now);
