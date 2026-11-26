import { useEffect, useState } from "react";
import Button from "../../Components/uiC/Button.jsx";
import Icon from "../../Components/uiC/Icon.jsx";
import Input from "../../Components/uiC/Input.jsx";
import Switch from "../../Components/uiC/Switch.jsx";
import { DEMO_MODE } from "../../config/demo.js";
import { useAsync } from "../../hooks/useAsync.js";
import { isApiConfigured } from "../../services/apiClient.js";
import {
  SETTINGS_SECTIONS,
  can,
  changedKeys,
  getSettings,
  listOperators,
  saveSettings,
  systemErrorText,
  validateSettings,
} from "../../services/adminSystemService.js";
import { adminErrorText, fmtDateTime } from "./students/format.js";

/** Settings + whether the signed-in operator may edit them (unknown role → editable; the server has the last word). */
async function loadPage() {
  const [settings, operators] = await Promise.all([getSettings(), listOperators().catch(() => null)]);
  const me = operators?.items.find((o) => o.id === operators.me);
  return { settings, editable: !me || can(me.role, "settings") };
}

/**
 * Admin: platform settings (/admin/settings): registration, sessions, Study With Me, resources, maintenance.
 * Changes are kept locally until "Save changes"; only the changed keys are sent, and the server records them in the
 * change log with their before → after values (docs/system-admin.md). Super admins only.
 */
export default function AdminSettingP() {
  const { status, data, error, reload } = useAsync(loadPage);
  if (status === "loading") return <Header />;
  if (status === "error") {
    return (
      <>
        <Header />
        <div role="alert" className="flex flex-col items-center gap-3 rounded-[20px] border border-line bg-surface px-5 py-14 text-center text-sm text-fg-2">
          <Icon name="warning" size="lg" className="text-warn" />
          <p>{adminErrorText(error, "We couldn't load the settings.")}</p>
          <Button size="s" variant="outline" onClick={reload}>Try again</Button>
        </div>
      </>
    );
  }
  return <SettingsForm initial={data.settings} editable={data.editable} />;
}

function Header({ meta }) {
  return (
    <header className="flex flex-col gap-1.5">
      <h1 className="text-2xl font-extrabold leading-8 text-fg">Settings</h1>
      <p className="text-sm leading-5 text-fg-2">Platform-wide rules for every student. Each change is recorded in the change log.</p>
      {meta}
    </header>
  );
}

function SettingsForm({ initial, editable }) {
  const [saved, setSaved] = useState(initial);
  const [values, setValues] = useState(initial.values);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const dirty = changedKeys(saved.values, values);
  const errors = touched ? validateSettings(values) : {};
  const set = (key) => (value) => {
    setValues((v) => ({ ...v, [key]: value }));
    setNotice(null);
  };

  // Leaving the page with unsaved changes asks first.
  useEffect(() => {
    if (!dirty.length) return;
    const warn = (e) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty.length]);

  const save = async () => {
    setTouched(true);
    if (Object.keys(validateSettings(values)).length) {
      setNotice({ tone: "error", text: "Some values need fixing before saving." });
      return;
    }
    setBusy(true);
    try {
      const next = await saveSettings(saved.values, values);
      setSaved(next);
      setValues(next.values);
      setTouched(false);
      setNotice({ tone: "ok", text: `${dirty.length} setting${dirty.length === 1 ? "" : "s"} saved.` });
    } catch (err) {
      setNotice({ tone: "error", text: systemErrorText(err) ?? adminErrorText(err, "The settings couldn't be saved.") });
    } finally {
      setBusy(false);
    }
  };
  const discard = () => {
    setValues(saved.values);
    setTouched(false);
    setNotice(null);
  };

  return (
    <>
      <Header
        meta={
          saved.updatedAt && (
            <p className="text-[13px] text-fg-3">
              Last changed {fmtDateTime(saved.updatedAt)}
              {saved.updatedBy ? ` by ${saved.updatedBy}` : ""} · <a href="/admin/changelog?category=settings" className="font-semibold text-primary-text hover:underline">See history</a>
            </p>
          )
        }
      />

      {DEMO_MODE && !isApiConfigured() && (
        <p className="flex items-start gap-2 rounded-xl border border-highlight/50 bg-highlight/15 px-4 py-3 text-sm text-fg">
          <Icon name="alert" size="sm" className="mt-px" />
          Demo: settings are saved in this browser and appear in the change log, but the app doesn't apply them until the server does.
        </p>
      )}
      {!editable && (
        <p className="flex items-start gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-fg-2">
          <Icon name="lock" size="sm" className="mt-px text-fg-3" />
          Only super admins can change platform settings. You can read them.
        </p>
      )}
      {values.maintenanceMode && saved.values.maintenanceMode && (
        <p role="status" className="flex items-start gap-2 rounded-xl border border-live/25 bg-danger-soft px-4 py-3 text-sm font-semibold text-live">
          <Icon name="wrench" size="sm" className="mt-px" />
          Maintenance mode is on: students can't use TANAWAR right now.
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="hidden xl:block">
          <ul className="sticky top-[96px] flex flex-col gap-1">
            {SETTINGS_SECTIONS.map((s) => {
              const changed = s.fields.some((f) => dirty.includes(f.key));
              return (
                <li key={s.key}>
                  <a href={`#${s.key}`} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-fg-2 transition-colors hover:bg-surface hover:text-fg">
                    <Icon name={s.icon} size="sm" />
                    <span className="flex-1">{s.title}</span>
                    {changed && <span className="size-2 rounded-full bg-highlight" aria-label="unsaved changes" />}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <fieldset disabled={!editable || busy} className="flex min-w-0 flex-col gap-5">
          {SETTINGS_SECTIONS.map((s) => (
            <section key={s.key} id={s.key} className="scroll-mt-24 overflow-hidden rounded-[20px] border border-line bg-surface">
              <div className="flex items-start gap-3 border-b border-line px-5 py-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-text">
                  <Icon name={s.icon} />
                </span>
                <div className="flex flex-col gap-0.5">
                  <h2 className="text-base font-extrabold text-fg">{s.title}</h2>
                  <p className="text-[13px] text-fg-2">{s.description}</p>
                </div>
              </div>
              <div className="divide-y divide-line">
                {s.fields.map((f) => (
                  <Field key={f.key} field={f} value={values[f.key]} onChange={set(f.key)} error={errors[f.key]} changed={dirty.includes(f.key)} />
                ))}
              </div>
            </section>
          ))}
        </fieldset>
      </div>

      {notice && (
        <div
          role={notice.tone === "error" ? "alert" : "status"}
          className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${
            notice.tone === "error" ? "border-live/25 bg-danger-soft text-live" : "border-primary/25 bg-primary-soft text-primary-text"
          }`}
        >
          <Icon name={notice.tone === "error" ? "alert" : "check"} size="sm" className="mt-px" />
          {notice.text}
        </div>
      )}

      {editable && dirty.length > 0 && (
        <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-[20px] border border-line bg-surface px-5 py-3.5 shadow-pop sm:flex-row sm:items-center">
          <p className="flex-1 text-sm font-semibold text-fg">
            {dirty.length} unsaved change{dirty.length === 1 ? "" : "s"}
          </p>
          <div className="flex gap-2.5">
            <Button variant="outline" size="s" onClick={discard} disabled={busy}>Discard</Button>
            <Button size="s" onClick={save} disabled={busy} aria-busy={busy}>
              {busy && <Icon name="loader" size="sm" className="animate-spin" />}
              Save changes
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

function Field({ field: f, value, onChange, error, changed }) {
  const mark = changed && <span className="ml-1.5 inline-block size-2 rounded-full bg-highlight align-middle" aria-label="changed" />;

  if (f.type === "toggle") {
    return (
      <div className="flex items-start gap-4 px-5 py-4">
        <div className="flex flex-1 flex-col gap-0.5">
          <span id={`set-${f.key}`} className={`text-sm font-bold ${f.danger && value ? "text-live" : "text-fg"}`}>{f.label}{mark}</span>
          {f.hint && <span className="text-[13px] leading-5 text-fg-2">{f.hint}</span>}
        </div>
        <Switch checked={Boolean(value)} onChange={onChange} aria-labelledby={`set-${f.key}`} />
      </div>
    );
  }

  if (f.type === "multi") {
    const list = Array.isArray(value) ? value : [];
    return (
      <fieldset className="flex flex-col gap-2.5 px-5 py-4">
        <legend className="contents">
          <span className="text-sm font-bold text-fg">{f.label}{mark}</span>
        </legend>
        {f.hint && <span className="-mt-1.5 text-[13px] leading-5 text-fg-2">{f.hint}</span>}
        <div className="flex flex-wrap gap-2">
          {f.options.map((o) => {
            const on = list.includes(o.value);
            return (
              <label
                key={o.value}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors ${
                  on ? "border-primary bg-primary-soft text-primary-text" : "border-line text-fg-2 hover:bg-surface-2"
                }`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => onChange(on ? list.filter((v) => v !== o.value) : [...list, o.value])}
                  className="size-4 accent-[var(--color-primary)]"
                />
                {o.label}
              </label>
            );
          })}
        </div>
        {error && <p className="text-xs font-semibold text-live">{error}</p>}
      </fieldset>
    );
  }

  if (f.type === "number") {
    return (
      <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start">
        <div className="flex flex-1 flex-col gap-0.5">
          <label htmlFor={`set-${f.key}`} className="text-sm font-bold text-fg">{f.label}{mark}</label>
          <span className="text-[13px] leading-5 text-fg-2">
            {f.hint ? `${f.hint} ` : ""}From {f.min} to {f.max}.
          </span>
        </div>
        <div className="flex flex-col gap-1 sm:w-[180px]">
          <Input
            id={`set-${f.key}`}
            type="number"
            inputMode="numeric"
            min={f.min}
            max={f.max}
            step={1}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
            error={error}
            trailing={f.unit && <span className="text-[13px] font-semibold text-fg-3">{f.unit}</span>}
          />
        </div>
      </div>
    );
  }

  // text / email
  return (
    <div className="flex flex-col gap-1.5 px-5 py-4">
      <Input
        label={<>{f.label}{mark}</>}
        type={f.type === "email" ? "email" : "text"}
        icon={f.type === "email" ? "mail" : undefined}
        value={value ?? ""}
        maxLength={f.maxLength}
        placeholder={f.placeholder}
        onChange={(e) => onChange(e.target.value)}
        error={error}
      />
      {f.hint && <span className="text-[13px] leading-5 text-fg-2">{f.hint}</span>}
    </div>
  );
}
