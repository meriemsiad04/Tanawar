import logoMark from "../../assets/logo/Logo2.svg";

/**
 * TANAWAR logo lockup: logo.svg mark + wordmark.
 * variant "onDark" → for ink backgrounds, "default" → for light backgrounds.
 * Every usage (Navbar, Footer) updates from here.
 */
export default function Logo({ variant = "default", className = "" }) {
  const color = variant === "onDark" ? "text-white" : "text-ink dark:text-white";
  return (
    <span
      className={`inline-flex items-center gap-2.5 text-xl font-extrabold tracking-wide ${color} ${className}`}
    >
      <img src={logoMark} alt="" className="h-9 w-auto" />
      
    </span>
  );
}
