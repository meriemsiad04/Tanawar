import { useId, useMemo, useRef, useState } from "react";
import Avatar from "../uiC/Avatar.jsx";
import Button from "../uiC/Button.jsx";
import Icon from "../uiC/Icon.jsx";
import Input from "../uiC/Input.jsx";
import Select, { Counter, FieldError, Req } from "../uiC/Select.jsx";
import { fieldShell } from "../uiC/fieldShell.js";
import { ALL_MODULES, AVATAR_ACCEPT, LEVELS, MAJORS, PROFILE_LIMITS as LIMITS } from "../../data/profileOptions.js";

const pad = (n) => String(n).padStart(2, "0");
const localDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const initialsOf = (name = "") => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

function validate(v) {
  const e = {};
  if (!v.fullName.trim()) e.fullName = "Enter your full name.";
  else if (v.fullName.trim().length > LIMITS.name) e.fullName = `At most ${LIMITS.name} characters.`;
  if (!v.major) e.major = "Choose your major.";
  if (!v.level) e.level = "Choose your study level.";
  if (v.birthdate) {
    const b = new Date(`${v.birthdate}T00:00:00`);
    const age = (Date.now() - b.getTime()) / (365.25 * 24 * 3600 * 1000);
    if (Number.isNaN(b.getTime()) || age < LIMITS.age.min || age > LIMITS.age.max) e.birthdate = "Enter a valid birthdate.";
  }
  return e;
}

/** Centre-crops the picked image to a small square JPEG data URL, so the upload stays light. */
function toAvatarDataUrl(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = LIMITS.avatarPx;
      canvas.getContext("2d").drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, LIMITS.avatarPx, LIMITS.avatarPx);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("bad image"));
    };
    img.src = url;
  });
}

/**
 * Student profile form, shared by first-login setup and profile editing.
 * Props: initial (profile fields), submitLabel, onSubmit(profile) → Promise (throw to show an error), onCancel? (edit mode).
 */
export default function ProfileForm({ initial, submitLabel, onSubmit, onCancel }) {
  const fileRef = useRef(null);
  const bioId = useId();
  const [values, setValues] = useState(() => ({
    fullName: initial.fullName ?? "",
    major: initial.major ?? "",
    level: initial.level ?? "",
    birthdate: initial.birthdate ?? "",
    bio: initial.bio ?? "",
    strongModules: initial.strongModules ?? [],
    avatarUrl: initial.avatarUrl ?? null,
  }));
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [moduleQuery, setModuleQuery] = useState("");
  const [today] = useState(() => localDate(new Date()));

  const errors = useMemo(() => validate(values), [values]);
  const show = (f) => (submitted || touched[f] ? errors[f] : undefined);
  const set = (f) => (e) => setValues((v) => ({ ...v, [f]: e.target.value }));
  const blur = (f) => () => setTouched((t) => ({ ...t, [f]: true }));

  const pickAvatar = async (file) => {
    if (!file) return;
    setAvatarError("");
    if (!AVATAR_ACCEPT.split(",").includes(file.type)) return setAvatarError("Use a PNG, JPG or WebP image.");
    if (file.size > LIMITS.avatarBytes) return setAvatarError("The image is larger than 5 MB.");
    try {
      const avatarUrl = await toAvatarDataUrl(file);
      setValues((v) => ({ ...v, avatarUrl }));
    } catch {
      setAvatarError("We couldn't read that image.");
    }
  };

  const toggleModule = (m) =>
    setValues((v) => {
      if (v.strongModules.includes(m)) return { ...v, strongModules: v.strongModules.filter((x) => x !== m) };
      if (v.strongModules.length >= LIMITS.strongModules) return v;
      return { ...v, strongModules: [...v.strongModules, m] };
    });

  const visibleModules = ALL_MODULES.filter((m) => m.toLowerCase().includes(moduleQuery.trim().toLowerCase()));
  const atModuleLimit = values.strongModules.length >= LIMITS.strongModules;

  const submit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setFormError("");
    if (Object.keys(errors).length) return;
    setSaving(true);
    try {
      await onSubmit({
        fullName: values.fullName.trim(),
        major: values.major,
        level: values.level,
        birthdate: values.birthdate || null,
        bio: values.bio.trim(),
        strongModules: values.strongModules,
        avatarUrl: values.avatarUrl,
      });
    } catch (err) {
      setFormError(err?.message || "We couldn't save your profile. Please try again.");
      setSaving(false);
    }
  };

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-6">
      {/* Photo */}
      <div className="flex flex-wrap items-center gap-4">
        <Avatar initials={initialsOf(values.fullName) || "?"} src={values.avatarUrl} size={88} />
        <div className="flex flex-col gap-1.5">
          <p className="text-[13px] font-bold leading-[18px] text-fg">Profile picture <span className="font-normal text-fg-3">(optional)</span></p>
          <div className="flex flex-wrap gap-2">
            <Button size="s" variant="outline" onClick={() => fileRef.current?.click()}>
              <Icon name="camera" size="sm" aria-hidden="true" /> {values.avatarUrl ? "Change photo" : "Upload photo"}
            </Button>
            {values.avatarUrl && (
              <Button size="s" variant="outline" onClick={() => setValues((v) => ({ ...v, avatarUrl: null }))}>
                <Icon name="trash" size="sm" /> Remove
              </Button>
            )}
          </div>
          <input ref={fileRef} type="file" accept={AVATAR_ACCEPT} hidden onChange={(e) => { pickAvatar(e.target.files?.[0]); e.target.value = ""; }} />
          <FieldError>{avatarError}</FieldError>
        </div>
      </div>

      <Input label={<>Full name<Req /></>} icon="user" autoComplete="name" maxLength={LIMITS.name + 20} value={values.fullName} onChange={set("fullName")} onBlur={blur("fullName")} error={show("fullName")} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Major" required icon="cap" value={values.major} onChange={set("major")} onBlur={blur("major")} options={MAJORS.includes(values.major) || !values.major ? MAJORS : [values.major, ...MAJORS]} placeholder="Select your major" error={show("major")} />
        <Select label="Study level" required icon="levels" value={values.level} onChange={set("level")} onBlur={blur("level")} options={LEVELS} placeholder="Select your level" error={show("level")} />
        <Input label={<>Birthdate <span className="font-normal text-fg-3">(optional)</span></>} icon="calendar" type="date" max={today} value={values.birthdate} onChange={set("birthdate")} onBlur={blur("birthdate")} error={show("birthdate")} />
      </div>

      <div className="flex flex-col">
        <label htmlFor={bioId} className="mb-1.5 flex items-center justify-between text-[13px] font-bold leading-[18px] text-fg">
          <span>Bio <span className="font-normal text-fg-3">(optional)</span></span>
          <Counter value={values.bio} max={LIMITS.bio} />
        </label>
        <div className={`${fieldShell(false)} items-start py-2.5`}>
          <textarea id={bioId} rows={3} maxLength={LIMITS.bio} value={values.bio} onChange={set("bio")} placeholder="Tell other students a bit about you" className="min-w-0 flex-1 resize-none bg-transparent text-sm text-fg outline-none placeholder:text-fg-3" />
        </div>
      </div>

      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-1.5 flex w-full items-center justify-between text-[13px] font-bold leading-[18px] text-fg">
          <span>Modules you're good at <span className="font-normal text-fg-3">(optional)</span></span>
          <span className="text-xs font-normal text-fg-3">{values.strongModules.length}/{LIMITS.strongModules}</span>
        </legend>
        <Input icon="search" type="search" aria-label="Search modules" placeholder="Search modules" value={moduleQuery} onChange={(e) => setModuleQuery(e.target.value)} />
        <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto rounded-xl border border-line bg-surface-2 p-3">
          {visibleModules.map((m) => {
            const on = values.strongModules.includes(m);
            return (
              <button
                key={m}
                type="button"
                aria-pressed={on}
                disabled={!on && atModuleLimit}
                onClick={() => toggleModule(m)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50 ${
                  on ? "border-primary bg-primary-soft text-primary-text" : "border-line-strong bg-surface text-fg hover:border-fg-3"
                }`}
              >
                {on && <Icon name="check" size="sm" className="!size-3.5" />}
                {m}
              </button>
            );
          })}
          {!visibleModules.length && <p className="text-sm text-fg-3">No module matches “{moduleQuery}”.</p>}
        </div>
        {atModuleLimit && <p className="text-xs text-fg-3">You can pick up to {LIMITS.strongModules} modules.</p>}
      </fieldset>

      {formError && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-soft px-3.5 py-3 text-sm font-semibold text-live">
          <Icon name="alert" size="sm" className="mt-px" />
          {formError}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button size="m" variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        )}
        <Button size="m" type="submit" disabled={saving}>
          {saving && <Icon name="loader" size="sm" className="animate-spin" />}
          {saving ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
