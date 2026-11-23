import useInView from "./useInView.js";

/**
 * Fade-up reveal, played once when the element enters the viewport.
 * `delay` in ms (use for staggering), `scale` adds a subtle scale-in.
 * Styles live in index.css (.reveal) and are disabled for reduced motion.
 */
export default function Reveal({
  as: Tag = "div",
  delay = 0,
  scale = false,
  className = "",
  style,
  children,
  ...rest
}) {
  const [ref, seen] = useInView();
  return (
    <Tag
      ref={ref}
      data-reveal={seen ? "in" : "out"}
      className={`reveal ${scale ? "reveal-scale" : ""} ${className}`}
      style={{ ...style, "--reveal-delay": `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
