import { useState } from "react";
import Button from "../uiC/Button.jsx";
import Icon from "../uiC/Icon.jsx";

/**
 * Approve / Decline for a join-request notification, or the decision once made.
 * `request` = { status: "pending" | "approved" | "declined" }; `onRespond(decision)` returns a promise.
 */
export default function JoinRequestActions({ request, onRespond, compact = false }) {
  const [busy, setBusy] = useState(null); // decision being sent
  const [error, setError] = useState("");

  if (request.status !== "pending") {
    const approved = request.status === "approved";
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${approved ? "text-primary-text" : "text-fg-3"}`}>
        <Icon name={approved ? "check" : "close"} size="sm" className="!size-3.5" />
        {approved ? "Approved" : "Declined"}
      </span>
    );
  }

  const send = async (decision) => {
    setBusy(decision);
    setError("");
    try {
      await onRespond(decision);
    } catch {
      setError("Couldn’t send your answer. Please try again.");
      setBusy(null);
    }
  };

  const size = compact ? "h-8 px-3 text-[13px] rounded-lg" : "";
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <Button size="s" className={size} disabled={Boolean(busy)} aria-busy={busy === "approved"} onClick={() => send("approved")}>
          {busy === "approved" && <Icon name="loader" size="sm" className="!size-4 animate-spin" />}
          Approve
        </Button>
        <Button size="s" variant="outline" className={size} disabled={Boolean(busy)} aria-busy={busy === "declined"} onClick={() => send("declined")}>
          Decline
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs font-bold text-live">
          {error}
        </p>
      )}
    </div>
  );
}
