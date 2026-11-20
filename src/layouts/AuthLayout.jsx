import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import Icon from "../Components/uiC/Icon.jsx";
import logoMark from "../assets/logo/logo.svg";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Auth pop-up shell (sign in / sign up): centred card over a blurred, darkened backdrop.
 * Figma "02 · Sign in": 460px wide card, header with mark + title + subtitle + close.
 *
 * - Escape / backdrop click / ✕ call `onClose` (blocked while `busy`)
 * - Focus moves into the dialog, is trapped inside it, and returns to the opener on close
 * - Page scroll is locked while open
 */
export default function AuthLayout({ open, onClose, title, subtitle, busy = false, children }) {
  const titleId = useId();
  const subtitleId = useId();
  const panelRef = useRef(null);

  // Lock scroll + remember / restore focus.
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement;
    const { overflow, paddingRight } = document.body.style;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;

    // Focus the first field (falls back to the panel itself).
    const first = panelRef.current?.querySelector("input:not([disabled])");
    (first ?? panelRef.current)?.focus();

    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [open]);

  if (!open) return null;

  const requestClose = () => {
    if (!busy) onClose?.();
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      requestClose();
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

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto p-4 sm:items-center"
      onKeyDown={onKeyDown}
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={requestClose}
        className="animate-overlay-in fixed inset-0 bg-ink/60 backdrop-blur-md dark:bg-black/60"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
        tabIndex={-1}
        className="animate-dialog-in relative my-auto w-full max-w-[460px] overflow-hidden rounded-2xl border border-line bg-surface shadow-pop outline-none"
      >
        <header className="flex items-start gap-3 border-b border-line px-5 py-4 sm:px-6">
          <img src={logoMark} alt="" aria-hidden="true" className="h-9 w-auto shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-extrabold leading-6 text-fg">
              {title}
            </h2>
            {subtitle && (
              <p id={subtitleId} className="text-[13px] leading-[18px] text-fg-2">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={requestClose}
            disabled={busy}
            aria-label="Close"
            className="-mr-1.5 -mt-0.5 inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-fg-3 transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="close" size="sm" />
          </button>
        </header>

        {children}
      </div>
    </div>,
    document.body
  );
}
