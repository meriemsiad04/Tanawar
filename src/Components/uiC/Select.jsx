import { useId } from "react";
import Icon from "./Icon.jsx";
import { fieldShell } from "./fieldShell.js";

// Shared form pieces (extracted from CreateSessionModal): required mark, field error, field shell, select, counter.
// Displays the required-field asterisk.

export const Req = () => <span aria-hidden="true"> *</span>;
// Displays an error message below an input field.
export function FieldError({ id, children }) {
  if (!children) return null;
  return (
    <p id={id} className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold leading-4 text-live">
      <Icon name="alert" size="sm" className="!size-3.5" />
      {children}
    </p>
  );
}
// Reusable dropdown component with label, icon, options and error handling.

export default function Select({ label, icon, value, onChange, onBlur, options, placeholder, error, required, disabled }) {
  const id = useId();
  return (
    <div className="flex flex-col">
      <label htmlFor={id} className="mb-1.5 text-[13px] font-bold leading-[18px] text-fg">
        {label}
        {required && <Req />}
      </label>
      <div className={`${fieldShell(error)} relative h-11`}>
        <Icon name={icon} size="sm" className="text-fg-3 group-focus-within:text-primary-text" />
        <select
          id={id}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`h-full min-w-0 flex-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 appearance-none bg-transparent pr-6 text-sm outline-none ${value ? "text-fg" : "text-fg-3"}`}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o} value={o} className="text-fg">
              {o}
            </option>
          ))}
        </select>
        <Icon name="chevronDown" size="sm" className="pointer-events-none absolute right-3 text-fg-3" />
      </div>
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}

// Displays the current character count against the maximum allowed length.

export const Counter = ({ value, max }) => <span className="text-xs text-fg-3">{value.length}/{max}</span>;
