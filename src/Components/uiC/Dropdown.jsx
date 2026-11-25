import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon.jsx";
import { fieldShell } from "./fieldShell.js";

const MAX_LIST_HEIGHT = 288;
const GAP = 6;
const TYPEAHEAD_MS = 500;

const normalize = (options) => options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));

/**
 * TANAWAR dropdown: replaces the native <select>, whose open list can't be styled.
 * Field look = Input (44px, 10px radius, leading icon). The list opens in a portal above everything (modals included),
 * flips upward when there's no room below, and follows the ARIA "select-only combobox" pattern:
 * ↑/↓ Home/End move, Enter/Space pick, Esc closes, typing jumps to a matching option. Focus stays on the trigger.
 *
 * Props: value, onChange(value), options (strings or { value, label }), placeholder, icon, error, disabled, onBlur,
 *   id (for an external <label htmlFor>), ariaLabel, ariaDescribedBy,
 *   emptyOption: true → the placeholder is itself a choice with value "" (filters: "All modules"), shown first in the list.
 */
export default function Dropdown({
  value,
  onChange,
  options,
  placeholder = "Select…",
  icon,
  error,
  disabled = false,
  onBlur,
  id,
  ariaLabel,
  ariaDescribedBy,
  emptyOption = false,
  className = "",
}) {
  const autoId = useId();
  const triggerId = id ?? autoId;
  const listId = `${triggerId}-list`;
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const typed = useRef({ text: "", at: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [pos, setPos] = useState(null);

  const items = [...(emptyOption ? [{ value: "", label: placeholder }] : []), ...normalize(options)];
  const selectedIndex = items.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 && (value !== "" || emptyOption) ? items[selectedIndex] : null;
  const optionId = (i) => `${triggerId}-opt-${i}`;

  // Place the list under (or above) the trigger; recomputed on scroll / resize while open.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const below = window.innerHeight - r.bottom - GAP - 8;
      const above = r.top - GAP - 8;
      const wanted = Math.min(MAX_LIST_HEIGHT, (listRef.current?.scrollHeight ?? MAX_LIST_HEIGHT) + 2);
      const up = below < wanted && above > below;
      const width = Math.max(r.width, 200);
      setPos({
        left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)),
        width,
        maxHeight: Math.max(120, Math.min(MAX_LIST_HEIGHT, up ? above : below)),
        ...(up ? { bottom: window.innerHeight - r.top + GAP } : { top: r.bottom + GAP }),
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  // Close when clicking anywhere else.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!triggerRef.current?.contains(e.target) && !listRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Keep the highlighted option visible.
  useEffect(() => {
    if (open && active >= 0) document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
  });

  const openList = (index = selectedIndex >= 0 ? selectedIndex : 0) => {
    if (disabled || !items.length) return;
    setActive(index);
    setOpen(true);
  };

  const pick = (i) => {
    const o = items[i];
    if (!o) return;
    if (o.value !== value) onChange?.(o.value);
    setOpen(false);
  };

  const typeahead = (char) => {
    const now = Date.now();
    typed.current = { text: (now - typed.current.at < TYPEAHEAD_MS ? typed.current.text : "") + char.toLowerCase(), at: now };
    const start = open ? active : selectedIndex;
    const order = [...items.keys()].map((k) => (k + Math.max(start, 0) + (typed.current.text.length === 1 ? 1 : 0)) % items.length);
    const hit = order.find((i) => items[i].label.toLowerCase().startsWith(typed.current.text));
    if (hit === undefined) return;
    if (open) setActive(hit);
    else pick(hit);
  };

  const onKeyDown = (e) => {
    const last = items.length - 1;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList(e.key === "ArrowUp" && selectedIndex < 0 ? last : undefined);
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) typeahead(e.key);
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((i) => Math.min(last, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(last);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        pick(active);
        break;
      case "Escape":
        e.preventDefault();
        e.stopPropagation(); // don't close a surrounding modal
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) typeahead(e.key);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        aria-label={ariaLabel}
        aria-invalid={error ? true : undefined}
        aria-describedby={ariaDescribedBy}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        onBlur={(e) => {
          setOpen(false);
          onBlur?.(e);
        }}
        className={[
          fieldShell(error),
          "relative h-11 w-full cursor-pointer text-left text-sm outline-none",
          "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-line-strong",
          open && !error ? "!border-primary ring-4 ring-primary/15" : "",
          className,
        ].join(" ")}
      >
        {icon && <Icon name={icon} size="sm" className={open ? "text-primary-text" : "text-fg-3 group-focus-within:text-primary-text"} />}
        {/* A value missing from the options (e.g. pre-filled from a link) is still shown rather than the placeholder. */}
        <span className={`min-w-0 flex-1 truncate ${selected || value || emptyOption ? "text-fg" : "text-fg-3"}`}>
          {selected ? selected.label : value || placeholder}
        </span>
        <Icon name="chevronDown" size="sm" className={`text-fg-3 transition-transform duration-200 ${open ? "rotate-180 text-primary-text" : ""}`} />
      </button>

      {open &&
        createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-labelledby={ariaLabel ? undefined : triggerId}
            aria-label={ariaLabel}
            tabIndex={-1}
            style={pos ? { position: "fixed", ...pos } : { position: "fixed", visibility: "hidden" }}
            className="animate-overlay-in z-[200] overflow-y-auto overscroll-contain rounded-xl border border-line bg-surface p-1.5 shadow-raised [scrollbar-width:thin]"
          >
            {items.map((o, i) => {
              const isSelected = i === selectedIndex && (o.value !== "" || emptyOption);
              const isActive = i === active;
              return (
                <li
                  key={o.value || "__empty"}
                  id={optionId(i)}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => e.preventDefault()} // keep focus on the trigger
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(i)}
                  className={[
                    "flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-sm leading-5 transition-colors",
                    isActive ? "bg-surface-2" : "",
                    isSelected ? "font-bold text-primary-text" : "text-fg",
                  ].join(" ")}
                >
                  <span className="min-w-0 flex-1">{o.label}</span>
                  {isSelected && <Icon name="check" size="sm" className="!size-4 shrink-0" />}
                </li>
              );
            })}
          </ul>,
          document.body
        )}
    </>
  );
}
