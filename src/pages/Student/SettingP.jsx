import { useEffect, useState } from "react";
import Button from "../../Components/uiC/Button.jsx";
import Icon from "../../Components/uiC/Icon.jsx";
import ProfileForm from "../../Components/sharedC/ProfileForm.jsx";
import { useAsync } from "../../hooks/useAsync.js";
import { getProfile, saveProfile } from "../../services/profileService.js";
import { LANGUAGES, NOTIFICATION_OPTIONS, getSettings, saveSettings } from "../../services/settingsService.js";

function Panel({ title, children, className = "" }) {
  return (
    <section className={`rounded-[20px] border border-line bg-surface p-5 sm:p-[22px] ${className}`}>
      <h2 className="pb-4 text-lg font-extrabold leading-6 text-fg">{title}</h2>
      {children}
    </section>
  );
}

/** Loading / error states shared by the panels. */
function Remote({ state, what, children }) {
  if (state.status === "loading") return <p role="status" className="py-6 text-sm text-fg-2">Loading…</p>;
  if (state.status === "error")
    return (
      <div role="alert" className="flex flex-col items-start gap-3 py-2 text-sm text-fg-2">
        <p>{state.error?.code === "NOT_CONFIGURED" ? `Your ${what} will appear once the server is connected.` : `We couldn’t load your ${what}.`}</p>
        <Button size="s" variant="outline" onClick={state.reload}>
          Try again
        </Button>
      </div>
    );
  return children;
}

/** Shows "Saved" for a moment after a preference is stored. */
function SavedHint({ status }) {
  if (!status) return null;
  return (
    <p role="status" className={`flex items-center gap-1.5 pt-3 text-xs font-bold ${status === "error" ? "text-live" : "text-primary-text"}`}>
      {status === "error" ? "Couldn’t save. Please try again." : (<><Icon name="check" size="sm" className="!size-3.5" /> Saved</>)}
    </p>
  );
}

/** Settings: profile (shared ProfileForm), interface language and notification preferences. */
export default function SettingP() {
  const profile = useAsync(getProfile);
  const settings = useAsync(getSettings);
  const [prefs, setPrefs] = useState(null); // local copy once loaded
  const [saved, setSaved] = useState({}); // panel → "ok" | "error"
  // After saving the profile the page reloads (so the app bar and sidebar show the new name), then says "Saved".
  const [profileSaved] = useState(() => new URLSearchParams(window.location.search).get("saved") === "profile");

  const current = prefs ?? settings.data;

  useEffect(() => {
    if (!Object.keys(saved).length) return;
    const t = setTimeout(() => setSaved({}), 2000);
    return () => clearTimeout(t);
  }, [saved]);

  const update = async (panel, next) => {
    setPrefs(next);
    try {
      await saveSettings(next);
      setSaved({ [panel]: "ok" });
    } catch {
      setSaved({ [panel]: "error" });
    }
  };

  const submitProfile = async (p) => {
    await saveProfile(p);
    window.location.assign("/app/settings?saved=profile");
  };

  return (
    <>
      <h1 className="font-serif text-[30px] font-bold leading-[38px] tracking-[-0.005em] text-fg">Settings</h1>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Panel title="Profile">
          <Remote state={profile} what="profile">
            {profile.data && <ProfileForm initial={profile.data} submitLabel="Save changes" onSubmit={submitProfile} />}
            {profileSaved && <SavedHint status="ok" />}
          </Remote>
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel title="Language">
            <Remote state={settings} what="settings">
              {current && (
                <>
                  <div role="radiogroup" aria-label="Interface language" className="grid grid-cols-3 gap-2.5">
                    {LANGUAGES.map((l) => {
                      const on = current.language === l.value;
                      return (
                        <button
                          key={l.value}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          lang={l.value}
                          onClick={() => update("language", { ...current, language: l.value })}
                          className={`h-11 cursor-pointer rounded-xl border text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 ${
                            on ? "border-primary bg-primary-soft text-primary-text" : "border-line-strong bg-surface text-fg hover:bg-surface-2"
                          }`}
                        >
                          {l.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="pt-3 text-xs leading-4 text-fg-3">Translations are on the way: the interface is in English for now.</p>
                  <SavedHint status={saved.language} />
                </>
              )}
            </Remote>
          </Panel>

          <Panel title="Notifications">
            <Remote state={settings} what="settings">
              {current && (
                <>
                  <ul className="flex flex-col divide-y divide-line">
                    {NOTIFICATION_OPTIONS.map((o) => (
                      <li key={o.key}>
                        <label className="flex cursor-pointer items-center gap-3 py-3">
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="text-sm font-semibold text-fg">{o.label}</span>
                            <span className="text-xs leading-4 text-fg-2">{o.hint}</span>
                          </span>
                          <input
                            type="checkbox"
                            checked={Boolean(current.notifications[o.key])}
                            onChange={(e) =>
                              update("notifications", { ...current, notifications: { ...current.notifications, [o.key]: e.target.checked } })
                            }
                            className="size-4 cursor-pointer accent-primary"
                          />
                        </label>
                      </li>
                    ))}
                  </ul>
                  <SavedHint status={saved.notifications} />
                </>
              )}
            </Remote>
          </Panel>
        </div>
      </div>
    </>
  );
}
