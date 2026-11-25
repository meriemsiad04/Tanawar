import { useEffect } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal behaviour for a mounted dialog: locks page scroll, moves focus inside (first field),
 * restores focus to the opener on unmount. Returns a keydown handler that traps Tab and handles Escape.
 */
export function useDialog(panelRef, onEscape) {
  useEffect(() => {
    const opener = document.activeElement;
    const { overflow, paddingRight } = document.body.style;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;

    const first = panelRef.current?.querySelector("input:not([disabled])");
    (first ?? panelRef.current)?.focus();

    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [panelRef]);

  return (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onEscape?.();
      return;
    }
    if (e.key !== "Tab") return;
    const nodes = [...panelRef.current.querySelectorAll(FOCUSABLE)];
    if (!nodes.length) return;
    const firstEl = nodes[0];
    const lastEl = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === firstEl) {
      e.preventDefault();
      lastEl.focus();
    } else if (!e.shiftKey && document.activeElement === lastEl) {
      e.preventDefault();
      firstEl.focus();
    }
  };
}
