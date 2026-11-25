import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "../services/appearance.js";

/**
 * 3D tilt that follows the cursor.
 * - `containerRef`: element that listens for the pointer (stays still).
 * - `targetRef`: element that gets rotated (and receives --tilt-sx / --tilt-sy
 *   CSS variables so children can build a dynamic shadow).
 * Disabled for touch/pen pointers and when reduced motion is on (OS setting or TANAWAR setting).
 * Mutates styles directly, so it never triggers React re-renders.
 */
export default function useTilt({ max = 6, perspective = 1000, shadow = 14 } = {}) {
  const containerRef = useRef(null);
  const targetRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const target = targetRef.current;
    if (!container || !target) return undefined;

    let frame = 0;

    const apply = (rx, ry, sx, sy, duration) => {
      target.style.transition = `transform ${duration}ms cubic-bezier(.2,.7,.2,1)`;
      target.style.transform = `perspective(${perspective}px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      target.style.setProperty("--tilt-sx", `${sx}px`);
      target.style.setProperty("--tilt-sy", `${sy}px`);
    };

    const onMove = (e) => {
      if (e.pointerType !== "mouse" || prefersReducedMotion()) return;
      const { clientX, clientY } = e;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = container.getBoundingClientRect();
        // -1..1 from the center of the container
        const x = Math.max(-1, Math.min(1, ((clientX - r.left) / r.width - 0.5) * 2));
        const y = Math.max(-1, Math.min(1, ((clientY - r.top) / r.height - 0.5) * 2));
        // Cursor at the top tilts the top away (positive rotateX).
        apply(-y * max, x * max, -x * shadow, 12 + y * shadow, 120);
      });
    };

    const onLeave = () => {
      cancelAnimationFrame(frame);
      apply(0, 0, 0, 12, 600);
    };

    container.addEventListener("pointermove", onMove);
    container.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      container.removeEventListener("pointermove", onMove);
      container.removeEventListener("pointerleave", onLeave);
    };
  }, [max, perspective, shadow]);

  return { containerRef, targetRef };
}
