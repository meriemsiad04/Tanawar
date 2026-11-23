import Avatar from "../uiC/Avatar.jsx";
import Button from "../uiC/Button.jsx";

/** Host decision on a private-session request. Approval is never automatic. */
export default function JoinRequestCard({ request, onApprove, onDeny }) {
  const { initials, name, level, session, avatarClassName } = request;
  return (
    <div className="flex flex-col gap-3 rounded-[14px] bg-surface-2 p-3.5">
      <div className="flex items-center gap-2.5">
        <Avatar initials={initials} size={36} className={avatarClassName} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-sm font-bold leading-5 text-fg">
            {name} · {level}
          </p>
          <p className="text-[13px] leading-[19px] text-fg-2">wants to join “{session}”</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="s" className="flex-1" onClick={() => onApprove?.(request)}>
          Approve
        </Button>
        <Button size="s" variant="outline" className="flex-1" onClick={() => onDeny?.(request)}>
          Deny
        </Button>
      </div>
    </div>
  );
}
