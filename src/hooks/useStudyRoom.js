import { useCallback, useEffect, useState } from "react";
import { useLiveQuery } from "./useLiveQuery.js";
import {
  HEARTBEAT_MS,
  POLL_MS,
  getStudyRoom,
  joinStudyRoom,
  leaveStudyRoom,
  sendStudyHeartbeat,
} from "../services/studyRoomsService.js";

/**
 * Everything the room page needs: live room detail, join / leave, and the heartbeat that keeps the student's sitting open.
 *
 * - While the student is in the room, a heartbeat goes out every HEARTBEAT_MS (and when the tab becomes visible).
 *   Closing the tab or losing the connection stops the heartbeats; the server then ends the sitting at the last one,
 *   so abandoned time is never counted. A refresh or a short drop resumes the same sitting (no duplicate).
 * - `interrupted` turns true when the sitting ended without the student pressing Leave (expired heartbeat,
 *   switched rooms in another tab…). Their time is saved; the page offers to sit back down.
 */
export function useStudyRoom(id) {
  const load = useCallback(() => getStudyRoom(id), [id]);
  const query = useLiveQuery(load, POLL_MS.room);
  const { data, apply, refresh } = query;
  const inRoom = Boolean(data?.me?.inRoom);

  const [busy, setBusy] = useState(null); // "join" | "leave" | null
  const [actionError, setActionError] = useState(null);
  const [interrupted, setInterrupted] = useState(false);
  const [leftOnPurpose, setLeftOnPurpose] = useState(false); // set by Leave, cleared by the next join
  const [prevInRoom, setPrevInRoom] = useState(null);

  // Detect an unexpected end of the sitting (adjusted while rendering, when a new snapshot changes inRoom).
  if (data && prevInRoom !== inRoom) {
    setPrevInRoom(inRoom);
    if (inRoom) setInterrupted(false);
    else if (prevInRoom && !leftOnPurpose) setInterrupted(true);
  }

  // Heartbeat.
  useEffect(() => {
    if (!inRoom) return;
    let active = true;
    const beat = () =>
      sendStudyHeartbeat(id).catch((err) => {
        if (active && err?.code === "NOT_IN_ROOM") refresh(); // the server ended the sitting: re-read the room
        // network errors: keep trying; the server's 90 s grace covers short drops
      });
    const timer = setInterval(beat, HEARTBEAT_MS);
    const onVisible = () => {
      if (!document.hidden) beat();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", beat);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", beat);
    };
  }, [id, inRoom, refresh]);

  const join = useCallback(async () => {
    setBusy("join");
    setActionError(null);
    try {
      const res = await joinStudyRoom(id);
      setLeftOnPurpose(false);
      apply(res);
      setInterrupted(false);
    } catch (err) {
      setActionError(err?.message ?? "Couldn’t join the room. Please try again.");
    } finally {
      setBusy(null);
    }
  }, [id, apply]);

  const leave = useCallback(async () => {
    setBusy("leave");
    setActionError(null);
    setLeftOnPurpose(true);
    try {
      apply(await leaveStudyRoom(id));
    } catch (err) {
      setLeftOnPurpose(false);
      setActionError(err?.message ?? "Couldn’t leave the room. Please try again.");
    } finally {
      setBusy(null);
    }
  }, [id, apply]);

  return { ...query, inRoom, join, leave, busy, actionError, interrupted, dismissInterrupted: () => setInterrupted(false) };
}
