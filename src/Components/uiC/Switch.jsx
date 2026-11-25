/**
 * On/off switch (role="switch"). Label it with `aria-labelledby` / `aria-label`, or wrap it in a <label>.
 * Props: checked, onChange(nextChecked), disabled, plus any aria-* / id.
 */
export default function Switch({ checked, onChange, disabled = false, className = "", ...rest }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "border-primary bg-primary" : "border-line-strong bg-surface-2"
      } ${className}`}
      {...rest}
    >
      <span
        aria-hidden="true"
        className={`absolute top-1/2 size-[18px] -translate-y-1/2 rounded-full bg-white shadow-sm transition-[left] duration-200 ${checked ? "left-[22px]" : "left-[2px]"}`}
      />
    </button>
  );
}
