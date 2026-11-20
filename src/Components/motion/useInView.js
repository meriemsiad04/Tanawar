import { useEffect, useRef, useState } from "react";

/** True once the element has entered the viewport. Fires only once. */
export default function useInView({ threshold = 0.15, rootMargin = "0px 0px -8% 0px" } = {}) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === "undefined");

  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen, threshold, rootMargin]);

  return [ref, seen];
}
