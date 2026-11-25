import Icon from "../uiC/Icon.jsx";

const STYLES = {
  pending: { label: "Pending", icon: "clock", className: "bg-warn-soft text-warn" },
  approved: { label: "Approved", icon: "verified", className: "bg-primary-soft text-primary-text" },
  rejected: { label: "Rejected", icon: "alert", className: "bg-danger-soft text-live" },
};

/** Registration verification status pill (admin queue, account views). */
export default function VerificationStatusBadge({ status }) {
  const s = STYLES[status] ?? STYLES.pending;
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold leading-none ${s.className}`}>
      <Icon name={s.icon} size="sm" className="!size-3.5" />
      {s.label}
    </span>
  );
}
