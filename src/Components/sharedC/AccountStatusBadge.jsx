import Icon from "../uiC/Icon.jsx";
import { ACCOUNT_STATUS } from "../../services/adminStudentsService.js";

/** Account access pill (Active / Suspended / Banned), shown next to VerificationStatusBadge in the admin student views. */
export default function AccountStatusBadge({ status }) {
  const s = ACCOUNT_STATUS[status] ?? ACCOUNT_STATUS.active;
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold leading-none ${s.className}`}>
      <Icon name={s.icon} size="sm" className="!size-3.5" />
      {s.label}
    </span>
  );
}
