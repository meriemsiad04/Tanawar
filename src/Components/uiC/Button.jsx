//This constant defines the styles shared by all buttons, regardless of their variant or size.

const BASE =
  "inline-flex items-center justify-center gap-2 font-bold leading-none whitespace-nowrap " +
  "select-none cursor-pointer transition-all duration-200 ease-out " +
  "hover:-translate-y-px hover:shadow-md active:translate-y-0 active:scale-[0.97] active:shadow-none " +
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 " +
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none " +
  "disabled:hover:translate-y-0 disabled:active:scale-100";

 //This object defines the different visual styles available.
// Each variant has its own background, border, text, hover and focus colors.
const VARIANTS = {
  primary:
    "bg-primary border-primary text-white hover:bg-[#3D2FD0] hover:border-[#3D2FD0] focus-visible:ring-primary/40",
  secondary:
    "bg-[#6858F5] border-[#6858F5] text-white hover:bg-[#5948E6] hover:border-[#5948E6] focus-visible:ring-[#6858F5]/40",
  outline:
    "bg-white border-[#4938E8] text-[#17144D] hover:bg-[#F1F0FF] focus-visible:ring-[#4938E8]/40",
  warning:
    "bg-[#FFB500] border-[#FFB500] text-[#2A2000] hover:bg-[#F0A800] hover:border-[#F0A800] focus-visible:ring-[#FFB500]/50",
  // Landing page (dark bands): highlight yellow + translucent ghost.
  amber:
    "bg-highlight border-highlight text-ink hover:bg-[#F0AB00] hover:border-[#F0AB00] focus-visible:ring-highlight/50",
  ghostDark:
    "bg-white/5 border-white/30 text-white hover:bg-white/10 focus-visible:ring-white/40",
  danger:
    "bg-[#D21F20] border-[#D21F20] text-white hover:bg-[#B91819] hover:border-[#B91819] focus-visible:ring-[#D21F20]/40",
};

const SIZES = {
  // Radius and border width live here (not in BASE) so sizes never fight the base classes.
  large: "h-14 px-8 text-base rounded-xl border-2",
  medium: "h-11 px-6 text-sm rounded-xl border-2",
  // Figma "Button" component sizes: M = 46px tall, S = 38px tall, 1px borders.
  m: "h-[46px] px-[22px] text-[15px] rounded-xl border",
  s: "h-[38px] px-3.5 text-sm rounded-[10px] border",
};

/**
 * Reusable TANAWAR button.
 * Icons: pass them as part of `children` (e.g. <Button><Icon /> Save</Button>);
 * the built-in gap handles spacing. Mark decorative icons aria-hidden.
 */
export default function Button({
  variant = "primary",
  size = "medium",
  children,
  onClick,
  type = "button",
  disabled = false,
  className = "",
  ...rest
}) {
  const classes = [
    BASE,
    VARIANTS[variant] ?? VARIANTS.primary,
    SIZES[size] ?? SIZES.medium,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classes}
      {...rest}
    >
      {children}
    </button>
  );
}
