import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Button from "../../Components/uiC/Button.jsx";
import Icon from "../../Components/uiC/Icon.jsx";
import { useSettings } from "../../hooks/useSettings.js";
import { applyAppearance, restoreDeviceAppearance } from "../../services/appearance.js";
import { validateSettings } from "../../services/settingsService.js";
import AccountTab from "./settings/AccountTab.jsx";
import PreferencesTab from "./settings/PreferencesTab.jsx";
import PrivacyTab from "./settings/PrivacyTab.jsx";
import { Remote } from "./settings/settingsUi.jsx";

const TABS = [
  {
    id: "account",
    label: "Account",
    tagline: "Who I am",
    icon: "user",
    sections: [
      ["profile", "Personal information"],
      ["email", "Email & sign-in"],
      ["student-id", "Student ID & studies"],
    ],
  },
  {
    id: "preferences",
    label: "Preferences",
    tagline: "How I use TANAWAR",
    icon: "sliders",
    draftKeys: ["language", "appearance", "learning", "notifications"],
    sections: [
      ["learning", "Learning"],
      ["appearance", "Appearance"],
      ["notifications", "Notifications"],
    ],
  },
  {
    id: "privacy",
    label: "Privacy & Security",
    tagline: "How my information is protected",
    icon: "shield",
    draftKeys: ["privacy"],
    sections: [
      ["visibility", "Privacy"],
      ["password", "Password"],
      ["devices", "Devices & sessions"],
      ["your-data", "Your data"],
      ["danger-zone", "Danger zone"],
    ],
  },
];
/** Which tab holds each anchor (#notifications → Preferences). */
const TAB_OF = Object.fromEntries(TABS.flatMap((t) => [[t.id, t.id], ...t.sections.map(([s]) => [s, t.id])]));
/** Form-level edits (outside the settings draft) reported by the Account / Privacy tabs. */
const FORM_TAB = { profile: "account", email: "account", password: "privacy" };

/* Draft helpers: settings are plain nested objects; arrays are compared whole. */
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
function setIn(obj, path, value) {
  const [key, ...rest] = path.split(".");
  return { ...obj, [key]: rest.length ? setIn(obj[key], rest.join("."), value) : value };
}
function diffPaths(a, b, prefix = "") {
  const out = [];
  for (const key of new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isObj(a?.[key]) && isObj(b?.[key])) out.push(...diffPaths(a[key], b[key], path));
    else if (JSON.stringify(a?.[key]) !== JSON.stringify(b?.[key])) out.push(path);
  }
  return out;
}

const fromHash = () => decodeURIComponent(window.location.hash.slice(1));

/** Toast for save results and one-off actions. */
function Toast({ toast, raised }) {
  if (!toast) return null;
  const ok = toast.kind === "ok";
  return (
    <div
      role={ok ? "status" : "alert"}
      className={`animate-dialog-in fixed inset-x-4 z-[90] mx-auto flex max-w-[440px] items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-pop sm:inset-x-auto sm:right-6 ${
        raised ? "bottom-28 sm:bottom-24" : "bottom-6"
      } ${ok ? "border-line bg-surface text-fg" : "border-live/40 bg-danger-soft text-live"}`}
    >
      <Icon name={ok ? "check" : "alert"} size="sm" className={`mt-px ${ok ? "text-primary-text" : ""}`} />
      <span>{toast.text}</span>
    </div>
  );
}

/**
 * Settings & Preferences: Account (who I am), Preferences (how I use TANAWAR), Privacy & Security.
 * Preferences and privacy choices are edited as one draft: changed rows are highlighted, a bar offers Save / Cancel,
 * appearance changes preview live, and leaving with unsaved changes asks first. Account forms save on their own.
 * Contract and what the server must enforce: docs/settings.md.
 */
export default function SettingP() {
  const settings = useSettings();
  const saved = settings.data;
  const [draft, setDraft] = useState(null);
  const current = draft ?? saved;

  const [tab, setTab] = useState(() => TAB_OF[fromHash()] ?? "account");
  const [scrollTo, setScrollTo] = useState(() => (TAB_OF[fromHash()] && !TABS.some((t) => t.id === fromHash()) ? fromHash() : null));
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [forms, setForms] = useState({}); // { profile|email|password: dirty }
  const [toast, setToast] = useState(() =>
    new URLSearchParams(window.location.search).get("saved") === "profile" ? { kind: "ok", text: "Profile saved.", at: 0 } : null
  );
  const allowReload = useRef(false);

  const notify = useCallback((kind, text) => setToast({ kind, text, at: Date.now() }), []);
  const onDirty = useCallback((key, dirty) => setForms((f) => (Boolean(f[key]) === dirty ? f : { ...f, [key]: dirty })), []);

  /* ── draft ── */
  const changedPaths = useMemo(() => (draft && saved ? diffPaths(saved, draft) : []), [draft, saved]);
  const dirty = changedPaths.length > 0;
  const changed = useCallback((path) => changedPaths.some((p) => p === path || p.startsWith(`${path}.`)), [changedPaths]);
  const set = useCallback(
    (path, value) => {
      setDraft((d) => setIn(d ?? saved, path, value));
      setServerErrors((e) => (e[path] ? { ...e, [path]: undefined } : e));
    },
    [saved]
  );
  const errors = useMemo(() => {
    if (!current) return {};
    const all = { ...validateSettings(current), ...Object.fromEntries(Object.entries(serverErrors).filter(([, v]) => v)) };
    // Show a problem once the field was changed, or everything after a failed save.
    return Object.fromEntries(Object.entries(all).filter(([path]) => showErrors || changedPaths.includes(path)));
  }, [current, serverErrors, showErrors, changedPaths]);

  const unsavedIn = (t) => {
    const fromDraft = changedPaths.filter((p) => t.draftKeys?.includes(p.split(".")[0])).length;
    const fromForms = Object.entries(forms).filter(([k, v]) => v && FORM_TAB[k] === t.id).length;
    return fromDraft + fromForms;
  };

  /* ── live appearance preview (reverted on Cancel or when leaving the page unsaved) ── */
  const appearance = current?.appearance;
  useEffect(() => {
    if (appearance) applyAppearance(appearance, { persist: false });
  }, [appearance]);
  useEffect(() => () => restoreDeviceAppearance(), []);

  /* ── navigation: #tab or #section ── */
  useEffect(() => {
    const onHash = () => {
      const target = fromHash();
      if (!TAB_OF[target]) return;
      setTab(TAB_OF[target]);
      setScrollTo(TABS.some((t) => t.id === target) ? null : target);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    if (!scrollTo) return;
    // Wait a frame so the newly shown tab has laid out.
    const frame = requestAnimationFrame(() => {
      const el = document.getElementById(scrollTo);
      if (!el) return; // still loading: retried when the settings arrive
      el.scrollIntoView({ block: "start" });
      setScrollTo(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [scrollTo, tab, settings.status]);

  const openTab = (id) => {
    setTab(id);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${id}`);
    window.scrollTo({ top: 0 });
  };

  /* ── profile saved → page reloaded with ?saved=profile (the toast is the initial state): tidy the URL ── */
  useEffect(() => {
    if (window.location.search) window.history.replaceState(null, "", `${window.location.pathname}${window.location.hash}`);
  }, []);

  /* ── toast timeout ── */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.kind === "ok" ? 3000 : 6000);
    return () => clearTimeout(t);
  }, [toast]);

  /* ── warn before leaving with unsaved changes ── */
  const anyFormDirty = Object.values(forms).some(Boolean);
  useEffect(() => {
    if (!dirty && !anyFormDirty) return;
    const guard = (e) => {
      if (!dirty && allowReload.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty, anyFormDirty]);

  /* ── save / cancel ── */
  const cancel = () => {
    setDraft(null);
    setShowErrors(false);
    setServerErrors({});
  };

  const save = async () => {
    const found = validateSettings(current);
    if (Object.keys(found).length) {
      setShowErrors(true);
      notify("error", "Some settings need your attention before saving.");
      const section = Object.keys(found)[0].split(".")[0] === "privacy" ? "visibility" : "learning";
      setTab(TAB_OF[section]);
      setScrollTo(section);
      return;
    }
    setSaving(true);
    try {
      await settings.save(current);
      setDraft(null);
      setShowErrors(false);
      setServerErrors({});
      notify("ok", "Your settings are saved.");
    } catch (err) {
      if (err?.details?.fields) {
        setServerErrors(err.details.fields);
        setShowErrors(true);
      }
      notify("error", err?.code === "NOT_CONFIGURED" ? "Settings can be saved once the server is connected." : err?.message || "Couldn’t save your settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const active = TABS.find((t) => t.id === tab);

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="font-serif text-[30px] font-bold leading-[38px] tracking-[-0.005em] text-fg">Settings</h1>
        <p className="text-sm text-fg-2">Manage your account, how TANAWAR works for you, and how your information is protected.</p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[250px_minmax(0,1fr)] xl:gap-8">
        {/* Category navigation: a scrollable tab row on small screens, a sticky side menu on large ones. */}
        <nav aria-label="Settings categories" className="lg:sticky lg:top-24">
          <ul role="tablist" aria-orientation="vertical" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
            {TABS.map((t) => {
              const on = t.id === tab;
              const count = unsavedIn(t);
              return (
                <li key={t.id} role="presentation" className="shrink-0 lg:shrink">
                  <button
                    type="button"
                    role="tab"
                    id={`tab-${t.id}`}
                    aria-selected={on}
                    aria-controls={`panel-${t.id}`}
                    onClick={() => openTab(t.id)}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 ${
                      on ? "border-primary bg-primary-soft" : "border-line bg-surface hover:bg-surface-2"
                    }`}
                  >
                    <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${on ? "bg-primary text-white" : "bg-surface-2 text-fg-2"}`} aria-hidden="true">
                      <Icon name={t.icon} size="sm" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className={`whitespace-nowrap text-sm font-extrabold ${on ? "text-primary-text" : "text-fg"}`}>{t.label}</span>
                      <span className="hidden text-xs text-fg-2 lg:block">{t.tagline}</span>
                    </span>
                    {count > 0 && (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-highlight px-1.5 text-[11px] font-extrabold text-ink" title={`${count} unsaved`}>
                        {count}
                        <span className="sr-only"> unsaved changes</span>
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <ul aria-label={`${active.label} sections`} className="mt-3 hidden flex-col border-l border-line pl-3 lg:flex">
            {active.sections.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className={`block rounded-lg px-2.5 py-1.5 text-[13px] font-semibold hover:bg-surface-2 hover:text-fg ${id === "danger-zone" ? "text-live" : "text-fg-2"}`}>
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex min-w-0 flex-col gap-6">
          {/* All tabs stay mounted (hidden) so half-filled forms survive switching tabs. */}
          <div role="tabpanel" id="panel-account" aria-labelledby="tab-account" hidden={tab !== "account"} className="flex flex-col gap-6">
            <AccountTab notify={notify} onDirty={onDirty} beforeReload={() => (allowReload.current = true)} />
          </div>

          <div role="tabpanel" id="panel-preferences" aria-labelledby="tab-preferences" hidden={tab !== "preferences"} className="flex flex-col gap-6">
            {current ? (
              <PreferencesTab value={current} set={set} changed={changed} errors={errors} />
            ) : (
              <section className="rounded-[20px] border border-line bg-surface p-5 sm:p-[22px]">
                <Remote state={settings} what="preferences" />
              </section>
            )}
          </div>

          <div role="tabpanel" id="panel-privacy" aria-labelledby="tab-privacy" hidden={tab !== "privacy"} className="flex flex-col gap-6">
            {current ? (
              <PrivacyTab value={current} set={set} changed={changed} notify={notify} onDirty={onDirty} />
            ) : (
              <section className="rounded-[20px] border border-line bg-surface p-5 sm:p-[22px]">
                <Remote state={settings} what="privacy settings" />
              </section>
            )}
          </div>

          {dirty && (
            <div className="sticky bottom-4 z-30">
              <div
                role="region"
                aria-label="Unsaved changes"
                className="flex flex-col gap-3 rounded-2xl border border-highlight/60 bg-surface px-4 py-3 shadow-pop sm:flex-row sm:items-center"
              >
                <p className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold text-fg">
                  <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-highlight" />
                  {changedPaths.length === 1 ? "You have 1 unsaved change." : `You have ${changedPaths.length} unsaved changes.`}
                </p>
                <div className="flex gap-2.5">
                  <Button size="s" variant="outline" onClick={cancel} disabled={saving} className="flex-1 sm:flex-none dark:bg-surface dark:text-fg">
                    Cancel
                  </Button>
                  <Button size="s" onClick={save} disabled={saving} className="flex-1 sm:flex-none">
                    {saving && <Icon name="loader" size="sm" className="animate-spin" />}
                    {saving ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Toast key={toast?.at} toast={toast} raised={dirty} />
    </>
  );
}
