import { forwardRef, useId } from "react";
import Icon from "./Icon.jsx";

/**
 * Labelled text field (Figma "Input": 40px tall, 10px radius, leading icon).
 * - `icon`   leading Icon name (e.g. "lock")
 * - `error`  message shown under the field; also turns the border red
 * - `trailing` optional node rendered inside the right edge (e.g. a toggle button)
 * Every other prop is forwarded to the <input>.
 */
const Input = forwardRef(function Input(
  { label, icon, error, trailing, id, className = "", ...rest },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="text-[13px] font-bold leading-[18px] text-fg">
          {label}
        </label>
      )}

      <div
        className={[
          "group flex h-11 items-center gap-2.5 rounded-[10px] border bg-surface px-3 transition-[border-color,box-shadow] duration-150",
          "focus-within:ring-4",
          error
            ? "border-live focus-within:border-live focus-within:ring-live/15"
            : "border-line-strong hover:border-fg-3 focus-within:border-primary focus-within:ring-primary/15",
        ].join(" ")}
      >
        {icon && (
          <Icon
            name={icon}
            size="sm"
            className={error ? "text-live" : "text-fg-3 group-focus-within:text-primary-text"}
          />
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-3 disabled:cursor-not-allowed disabled:opacity-60"
          {...rest}
        />
        {trailing}
      </div>

      {error && (
        <p id={errorId} className="flex items-center gap-1.5 text-xs font-semibold leading-4 text-live">
          <Icon name="alert" size="sm" className="!size-3.5" />
          {error}
        </p>
      )}
    </div>
  );
});

export default Input;
