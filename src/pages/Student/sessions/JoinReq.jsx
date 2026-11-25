// Join requests on the sessions the student hosts (Bookings → "Requests to approve" tab).
import { useState } from "react";
import Button from "../../../Components/uiC/Button.jsx";
import JoinRequestRow from "../../../Components/sharedC/JoinRequestRow.jsx";
import { answerJoinRequest } from "../../../services/sessionsService.js";

const Note = ({ children }) => (
  <div className="flex flex-col items-start gap-3 rounded-[18px] border border-line bg-surface p-5 text-[13px] leading-[19px] text-fg-2">{children}</div>
);

/**
 * Host decisions on private-session requests.
 * `state`: the page's useAsync(listJoinRequests) result plus `requests` (the ones still pending).
 * Each answer is reported with `onAnswered(request, decision)` so the page can drop it.
 */
export default function JoinReq({ state, onAnswered }) {
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const answer = async (request, decision) => {
    setError("");
    setBusyId(request.id);
    try {
      await answerJoinRequest(request, decision);
      onAnswered?.(request, decision);
    } catch {
      setError(`Couldn’t ${decision} the request. Please try again.`);
    } finally {
      setBusyId(null);
    }
  };

  if (state.status === "loading") return <Note>Loading requests…</Note>;
  if (state.status === "error")
    return (
      <Note>
        Requests aren’t available right now.
        <Button variant="outline" size="s" onClick={state.reload}>
          Try again
        </Button>
      </Note>
    );
  if (!state.requests.length) return <Note>No pending requests. You’re all caught up.</Note>;

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="text-[13px] font-bold text-live">
          {error}
        </p>
      )}
      {state.requests.map((r) => (
        <JoinRequestRow
          key={r.id}
          request={r}
          busy={busyId === r.id}
          onApprove={(req) => answer(req, "approve")}
          onDecline={(req) => answer(req, "decline")}
        />
      ))}
    </div>
  );
}
