import { useEffect, useState } from "react";
import useInView from "./useInView.js";

/** Splits "2,480" / "4.8 / 5" into a numeric part and the rest of the string. */
function parse(value) {
  const m = /^([\d,]+(?:\.\d+)?)(.*)$/.exec(value);
  if (!m) return null;
  const raw = m[1];
  const decimals = raw.includes(".") ? raw.split(".")[1].length : 0;
  return {
    target: parseFloat(raw.replace(/,/g, "")),
    decimals,
    grouped: raw.includes(","),
    suffix: m[2],
  };
}

/** Counts from 0 to the value once visible. Final text always equals `value`. */
export default function CountUp({ value, duration = 2000 }) {
  const parsed = parse(value);
  const [ref, seen] = useInView({ threshold: 0.4, rootMargin: "0px" });
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!seen || !parsed) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(parsed.target);
      return undefined;
    }
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      setN(parsed.target * (1 - Math.pow(1 - t, 3))); // easeOutCubic
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seen]);

  if (!parsed) return <span>{value}</span>;
  const text = n.toLocaleString("en-US", {
    minimumFractionDigits: parsed.decimals,
    maximumFractionDigits: parsed.decimals,
    useGrouping: parsed.grouped,
  });
  // Reserve final width so the layout never shifts while counting.
  return (
    <span ref={ref} aria-label={value}>
      <span aria-hidden="true">
        {text}
        {parsed.suffix}
      </span>
    </span>
  );
}
