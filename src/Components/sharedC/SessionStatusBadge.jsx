const TONES = {
  live: "bg-danger-soft text-live gap-1.5",
  clay: "bg-accent-soft text-accent-ink",
};

/** Pill badge. tone "live" shows the red dot; "clay" is the soft-violet label. */
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
