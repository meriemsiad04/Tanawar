import { useId } from "react";
import Icon from "./Icon.jsx";
import Dropdown from "./Dropdown.jsx";

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
// Labelled form dropdown (label, icon, options, error). Renders the styled TANAWAR Dropdown instead of a native <select>.
// `onChange` still receives an event-like `{ target: { value } }`, so existing `set(field)` handlers keep working.

export default function Select({ label, icon, value, onChange, onBlur, options, placeholder, error, required, disabled }) {
  const id = useId();
  return (
    <div className="flex flex-col">
      <label htmlFor={id} className="mb-1.5 text-[13px] font-bold leading-[18px] text-fg">
        {label}
        {required && <Req />}
      </label>
      <Dropdown
        id={id}
        icon={icon}
        value={value}
        options={options}
        placeholder={placeholder}
        error={error}
        disabled={disabled}
        ariaDescribedBy={error ? `${id}-error` : undefined}
        onChange={(next) => onChange?.({ target: { value: next } })}
        onBlur={onBlur}
      />
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}

// Displays the current character count against the maximum allowed length.

export const Counter = ({ value, max }) => <span className="text-xs text-fg-3">{value.length}/{max}</span>;
