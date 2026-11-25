const BASE =
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold leading-none " +
  "whitespace-nowrap select-none transition-colors duration-200 ease-out";

const VARIANTS = {
  primary: "bg-[#FDECEC] text-[#C81E1E]",
  secondary: "bg-[#F1F0FF] text-[#3A2DD0]",
  success: "bg-[#E3F6EA] text-[#17803D]",
  warning: "bg-[#FFF4D6] text-[#A35A00]",
  neutral: "bg-[#F1F1F6] text-[#4A4868]",
};

/**
 * Small pill label / badge.
 * Icons: pass them inside `children` (e.g. <Label><Icon /> Live</Label>);
 * the built-in gap handles spacing. Mark decorative icons aria-hidden.
 */
export default function Label({
  variant = "neutral",
  children,
  className = "",
  ...rest
}) {
  const classes = [BASE, VARIANTS[variant] ?? VARIANTS.neutral, className]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} {...rest}>
      {children}
    </span>
  );
}
