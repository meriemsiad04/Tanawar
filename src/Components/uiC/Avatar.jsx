/**
 * Initials avatar. Override the fill per person with `className` (e.g. "bg-accent").
 * Font size scales with the avatar size (Figma: 38px → 13.3px, 44px → 15.4px).
 */
export default function Avatar({
  initials,
  size = 38,
  className = "bg-primary",
  ringed = false,
}) {
  return (
    <span
      className={[
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white",
        ringed ? "border-2 border-ink" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </span>
  );
}
