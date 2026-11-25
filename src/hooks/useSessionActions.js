import { useCallback, useState } from "react";
import { cancelJoinRequest, classroomPath, joinSession, leaveSession, requestToJoin } from "../services/sessionsService.js";

/**
 * Join / request / cancel request / leave / enter for session cards, shared by every page that lists sessions.
 * Changes are applied on top of the loaded list with `apply(list)` (the API stays the source of truth on reload).
 * Leaving asks first: `askLeave(session)` sets `leaving`, then `confirmLeave()` / `cancelLeave()`.
 */
export function useSessionActions() {
  const [overrides, setOverrides] = useState({}); // session id → { myStatus, joined }
  const [busyId, setBusyId] = useState(null);
  const [leaving, setLeaving] = useState(null);
  const [error, setError] = useState("");

  const apply = useCallback((list) => list.map((s) => (overrides[s.id] ? { ...s, ...overrides[s.id] } : s)), [overrides]);

  const run = async (session, action, patch, failMessage) => {
    setError("");
    setBusyId(session.id);
    try {
      await action(session.id);
      setOverrides((o) => ({ ...o, [session.id]: { ...o[session.id], ...patch } }));
      return true;
    } catch {
      setError(failMessage);
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const join = (s) => run(s, joinSession, { myStatus: "joined", joined: s.joined + 1 }, "Couldn’t join the session. Please try again.");
  const request = (s) => run(s, requestToJoin, { myStatus: "pending" }, "Couldn’t send your join request. Please try again.");
  const cancelRequest = (s) => run(s, cancelJoinRequest, { myStatus: "none" }, "Couldn’t cancel your request. Please try again.");
  /** Card main action: public sessions are joined instantly, private ones need the host's approval. */
  const onAction = (s) => (s.visibility === "private" ? request(s) : join(s));
  const confirmLeave = async () => {
    const s = leaving;
    await run(s, leaveSession, { myStatus: "none", joined: Math.max(0, s.joined - 1) }, "Couldn’t leave the session. Please try again.");
    setLeaving(null);
  };
  const enter = ({ id }) => window.location.assign(classroomPath(id));

  return { apply, busyId, error, onAction, cancelRequest, enter, leaving, askLeave: setLeaving, cancelLeave: () => setLeaving(null), confirmLeave };
}
