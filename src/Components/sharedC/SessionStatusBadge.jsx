const TONES = {
  live: "bg-danger-soft text-live gap-1.5",
  clay: "bg-accent-soft text-accent-ink",
  joined: "bg-primary-soft text-primary-text",
  warn: "bg-warn-soft text-warn",
  neutral: "bg-surface-2 text-fg-2",
};

/** Pill badge. tone "live" shows the red dot; others: clay, joined, warn, neutral. */
export default function SessionStatusBadge({ tone = "live", children }) {
  return (
    <span
      className={`inline-flex h-[26px] items-center rounded-full px-2.5 text-xs font-bold leading-4 whitespace-nowrap ${
        TONES[tone] ?? TONES.live
      }`}
    >
      {tone === "live" && (
        <span aria-hidden="true" className="size-[7px] rounded-full bg-live" />
      )}
      {children}
    </span>
  );
}
