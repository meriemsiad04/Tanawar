/**
 * TANAWAR logo lockup — PLACEHOLDER.
 * The real logo will be provided later: replace the body of this component
 * (e.g. import it from src/assets and render an <img>) and every usage
 * (Navbar, Footer) updates at once.
 * variant "onDark" → for ink backgrounds, "default" → for light backgrounds.
 */
export default function Logo({ variant = "default", className = "" }) {
  const color = variant === "onDark" ? "text-white" : "text-ink";
  return (
    <span
      className={`inline-flex items-center text-xl font-extrabold tracking-wide ${color} ${className}`}
    >
      TANAWAR
    </span>
  );
}
