import Avatar from "../uiC/Avatar.jsx";
import Button from "../uiC/Button.jsx";
import Icon from "../uiC/Icon.jsx";
import { studentPath } from "../../services/studentsService.js";

const initialsOf = (n = "") => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

/**
 * Full-width join request (Bookings → Requests to approve). Approval is never automatic.
 * `request`: { sessionTitle, student: { id, fullName, major, level, avatarUrl } }. `busy` disables both answers.
 */
export default function JoinRequestRow({ request, busy = false, onApprove, onDecline }) {
  const { sessionTitle, student } = request;
  return (
    <article className="flex items-center gap-3.5 rounded-[18px] border border-line bg-surface px-5 py-4">
      <Avatar initials={initialsOf(student.fullName)} src={student.avatarUrl} size={40} className="bg-accent" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-[15px] leading-5 text-fg">
          <a href={studentPath(student.id)} className="font-bold hover:underline">
            {student.fullName}
          </a>
          <span className="text-fg-2"> · {[student.level, student.major].filter(Boolean).join(" ")}</span>
        </p>
        <p className="truncate text-[13px] leading-[19px] text-fg-2">wants to join “{sessionTitle}”</p>
      </div>
      <button
        type="button"
        onClick={() => onDecline?.(request)}
        disabled={busy}
        aria-label={`Decline ${student.fullName}`}
        title="Decline"
        className="inline-flex size-[38px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-line-strong text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Icon name="close" size="sm" />
      </button>
      <Button size="s" onClick={() => onApprove?.(request)} disabled={busy}>
        <Icon name="check" size="sm" /> Approve
      </Button>
    </article>
  );
}
