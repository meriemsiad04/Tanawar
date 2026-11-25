import { useId } from "react";
import Button from "../../../Components/uiC/Button.jsx";
import Dropdown from "../../../Components/uiC/Dropdown.jsx";
import Icon from "../../../Components/uiC/Icon.jsx";
import Input from "../../../Components/uiC/Input.jsx";
import Switch from "../../../Components/uiC/Switch.jsx";

/** One settings card: title, one-line description, content. `id` is the anchor used by the side navigation. */
export function Section({ id, icon, title, description, tone = "default", action, children }) {
  const danger = tone === "danger";
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={`scroll-mt-24 rounded-[20px] border bg-surface p-5 sm:p-[22px] ${danger ? "border-live/40" : "border-line"}`}
    >
      <header className="flex flex-wrap items-start gap-3 pb-4">
        {icon && (
          <span
            aria-hidden="true"
            className={`grid size-9 shrink-0 place-items-center rounded-xl ${danger ? "bg-danger-soft text-live" : "bg-primary-soft text-primary-text"}`}
          >
            <Icon name={icon} size="sm" />
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 id={`${id}-title`} className={`text-lg font-extrabold leading-6 ${danger ? "text-live" : "text-fg"}`}>
            {title}
          </h2>
          {description && <p className="text-[13px] leading-[18px] text-fg-2">{description}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

/** "Unsaved" pill shown next to a changed setting. */
export const UnsavedTag = () => (
  <span className="inline-flex items-center gap-1 rounded-full bg-highlight/20 px-2 py-0.5 text-[11px] font-bold leading-4 text-fg">
    <span aria-hidden="true" className="size-1.5 rounded-full bg-highlight" />
    Unsaved
  </span>
);

/**
 * A labelled setting row: text on the left, control on the right (stacks on small screens).
 * `changed` highlights it as unsaved. `labelId` lets the control reference the label.
 */
export function Row({ label, hint, labelId, changed, error, stack = false, children }) {
  return (
    <div
      className={`-mx-2 flex gap-3 rounded-xl px-2 py-3.5 transition-colors ${stack ? "flex-col" : "flex-col sm:flex-row sm:items-center"} ${
        changed ? "bg-highlight/10 shadow-[inset_3px_0_0_var(--color-highlight)]" : ""
      }`}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span id={labelId} className="flex flex-wrap items-center gap-2 text-sm font-semibold text-fg">
          {label}
          {changed && <UnsavedTag />}
        </span>
        {hint && <span className="text-xs leading-4 text-fg-2">{hint}</span>}
      </div>
      <div className={stack ? "" : "shrink-0 sm:max-w-[60%]"}>{children}</div>
      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-xs font-semibold leading-4 text-live">
          <Icon name="alert" size="sm" className="!size-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}

/** Row with a switch. */
export function SwitchRow({ label, hint, checked, onChange, changed, disabled }) {
  const id = useId();
  return (
    <Row label={label} hint={hint} labelId={id} changed={changed}>
      <Switch checked={checked} onChange={onChange} aria-labelledby={id} disabled={disabled} />
    </Row>
  );
}

/** Row with a dropdown. */
export function SelectRow({ label, hint, value, options, onChange, changed, icon }) {
  const id = useId();
  return (
    <Row label={label} hint={hint} labelId={id} changed={changed}>
      <Dropdown value={value} options={options} onChange={onChange} icon={icon} ariaLabel={typeof label === "string" ? label : undefined} className="w-full sm:w-[230px]" />
    </Row>
  );
}

/** Segmented single choice (theme, font size, language). `options`: [{ value, label, icon? , lang? }]. */
export function Segmented({ label, value, options, onChange, columns = options.length }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            lang={o.lang}
            onClick={() => onChange(o.value)}
            className={`inline-flex h-11 min-w-0 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 ${
              on ? "border-primary bg-primary-soft text-primary-text" : "border-line-strong bg-surface text-fg hover:bg-surface-2"
            }`}
          >
            {o.icon && <Icon name={o.icon} size="sm" className="!size-4" />}
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Loading / error states for a section's remote data. */
export function Remote({ state, what, children }) {
  if (state.status === "loading" || state.status === "idle")
    return (
      <div role="status" aria-label={`Loading ${what}`} className="flex flex-col gap-3 py-2">
        <span className="h-4 w-1/2 animate-pulse rounded bg-surface-2" />
        <span className="h-4 w-3/4 animate-pulse rounded bg-surface-2" />
        <span className="h-4 w-2/3 animate-pulse rounded bg-surface-2" />
      </div>
    );
  if (state.status === "error")
    return (
      <div role="alert" className="flex flex-col items-start gap-3 py-2 text-sm text-fg-2">
        <p>{state.error?.code === "NOT_CONFIGURED" ? `Your ${what} will appear once the server is connected.` : `We couldn’t load your ${what}. ${state.error?.message ?? ""}`}</p>
        <Button size="s" variant="outline" onClick={state.reload} className="dark:bg-surface dark:text-fg">
          Try again
        </Button>
      </div>
    );
  return children;
}

/** Inline form message: success (green check) or error. */
export function FormNote({ kind, children }) {
  if (!children) return null;
  const ok = kind === "ok";
  return (
    <p
      role={ok ? "status" : "alert"}
      className={`flex items-start gap-2 rounded-xl px-3.5 py-3 text-sm font-semibold ${ok ? "bg-primary-soft text-primary-text" : "bg-danger-soft text-live"}`}
    >
      <Icon name={ok ? "check" : "alert"} size="sm" className="mt-px" />
      {children}
    </p>
  );
}

/** Label / value pair for read-only account details. */
export function Detail({ label, children }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-line bg-surface-2 px-3.5 py-3">
      <dt className="text-[11px] font-bold uppercase tracking-wide text-fg-3">{label}</dt>
      <dd className="text-sm font-semibold text-fg [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

/** "Needs the server" note, for settings that the backend enforces. */
export const ServerNote = ({ children }) => (
  <p className="flex items-start gap-2 pt-3 text-xs leading-4 text-fg-3">
    <Icon name="shield" size="sm" className="!size-3.5 mt-px" />
    <span>{children}</span>
  </p>
);

/** Password field with a show/hide button (same pattern as the sign-up form). */
export function PasswordInput({ shown, onToggle, ...rest }) {
  return (
    <Input
      icon="lock"
      type={shown ? "text" : "password"}
      {...rest}
      trailing={
        <button
          type="button"
          onClick={onToggle}
          aria-label={shown ? "Hide password" : "Show password"}
          aria-pressed={shown}
          className="-mr-1 inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-fg-3 transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <Icon name={shown ? "eyeOff" : "eye"} size="sm" />
        </button>
      }
    />
  );
}
