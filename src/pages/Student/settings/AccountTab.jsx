import { useCallback, useState } from "react";
import Button from "../../../Components/uiC/Button.jsx";
import Icon from "../../../Components/uiC/Icon.jsx";
import Input from "../../../Components/uiC/Input.jsx";
import ProfileForm from "../../../Components/sharedC/ProfileForm.jsx";
import VerificationStatusBadge from "../../../Components/sharedC/VerificationStatusBadge.jsx";
import { useAsync } from "../../../hooks/useAsync.js";
import { UNIVERSITY, changeEmail, hasPassword, validateEmailChange } from "../../../services/accountService.js";
import { getSession } from "../../../services/authService.js";
import { getProfile, saveProfile } from "../../../services/profileService.js";
import { documentTypeLabel, getMyVerification } from "../../../services/verificationService.js";
import { Detail, FormNote, PasswordInput, Remote, Section, UnsavedTag } from "./settingsUi.jsx";

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—");

/* ───────────── Email ───────────── */

function EmailForm({ currentEmail, onDone, onCancel, onDirtyChange }) {
  const [values, setValues] = useState({ email: "", currentPassword: "" });
  const [errors, setErrors] = useState({});
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  const change = (field) => (e) => {
    const next = { ...values, [field]: e.target.value };
    setValues(next);
    setErrors((er) => ({ ...er, [field]: undefined }));
    onDirtyChange(Boolean(next.email || next.currentPassword));
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");
    const found = validateEmailChange(values, currentEmail);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const user = await changeEmail(values);
      onDone(user?.email ?? values.email.trim());
    } catch (err) {
      if (err?.details?.field) setErrors({ [err.details.field]: err.message });
      else setFormError(err?.code === "NOT_CONFIGURED" ? "Email changes will work once the server is connected." : err?.message || "Couldn’t change your email.");
      setBusy(false);
    }
  };

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4 rounded-xl border border-line bg-surface-2 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="New email" icon="mail" type="email" autoComplete="email" value={values.email} onChange={change("email")} error={errors.email} disabled={busy} />
        <PasswordInput
          label="Current password"
          autoComplete="current-password"
          value={values.currentPassword}
          onChange={change("currentPassword")}
          error={errors.currentPassword}
          disabled={busy}
          shown={showPw}
          onToggle={() => setShowPw((s) => !s)}
        />
      </div>
      <FormNote kind="error">{formError}</FormNote>
      <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
        <Button size="s" variant="outline" onClick={onCancel} disabled={busy} className="dark:bg-surface dark:text-fg">
          Cancel
        </Button>
        <Button size="s" type="submit" disabled={busy}>
          {busy && <Icon name="loader" size="sm" className="animate-spin" />}
          {busy ? "Saving…" : "Update email"}
        </Button>
      </div>
    </form>
  );
}

function EmailSection({ user, notify, onDirtyChange }) {
  const [email, setEmail] = useState(user.email ?? "");
  const [editing, setEditing] = useState(false);
  const google = !hasPassword(user);

  const close = () => {
    setEditing(false);
    onDirtyChange(false);
  };

  return (
    <Section id="email" icon="mail" title="Email & sign-in" description="The address we use for sign-in, security alerts and the email updates you opt into.">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-xs font-bold uppercase tracking-wide text-fg-3">Email</span>
            <span className="text-sm font-semibold text-fg [overflow-wrap:anywhere]">{email || "No email on file"}</span>
            <span className="text-xs text-fg-2">{google ? "You sign in with Google." : "You sign in with your matricule or email and a password."}</span>
          </div>
          {!google && !editing && (
            <Button size="s" variant="outline" onClick={() => setEditing(true)} className="dark:bg-surface dark:text-fg">
              <Icon name="pencil" size="sm" /> Change email
            </Button>
          )}
        </div>

        {google && (
          <p className="text-xs leading-4 text-fg-3">Your email comes from your Google account, so it can’t be changed here.</p>
        )}

        {editing && (
          <EmailForm
            currentEmail={email}
            onDirtyChange={onDirtyChange}
            onCancel={close}
            onDone={(next) => {
              setEmail(next);
              close();
              notify("ok", "Email updated.");
            }}
          />
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-xs font-bold uppercase tracking-wide text-fg-3">Password</span>
            <span className="text-sm text-fg-2">{google ? "Managed by Google." : "Change it, and sign out other devices, in Privacy & Security."}</span>
          </div>
          {!google && (
            <a href="#password" className="text-[13px] font-bold text-primary-text hover:underline">
              Change password ›
            </a>
          )}
        </div>
      </div>
    </Section>
  );
}

/* ───────────── Student ID ───────────── */

function StudentIdSection({ user, profile }) {
  const verification = useAsync(getMyVerification);
  const v = verification.data;
  const major = profile.data?.major || user.field;
  const level = profile.data?.level || user.level;

  return (
    <Section
      id="student-id"
      icon="idCard"
      title="Student ID & studies"
      description="Checked by the TANAWAR administrators when you registered."
      action={<VerificationStatusBadge status={user.verificationStatus ?? v?.status ?? "approved"} />}
    >
      <dl className="grid gap-3 sm:grid-cols-2">
        <Detail label="University">
          {UNIVERSITY.name} ({UNIVERSITY.short})
        </Detail>
        <Detail label="Matricule">
          <span className="font-mono tracking-wide">{user.matricule ?? v?.matricule ?? "—"}</span>
        </Detail>
        <Detail label="Major">{major || "—"}</Detail>
        <Detail label="Academic level">{level || "—"}</Detail>
        {verification.status === "ready" && (
          <>
            <Detail label="Document checked">{v.documentType ? documentTypeLabel(v.documentType) : "—"}</Detail>
            <Detail label="Approved on">{fmtDate(v.reviewedAt)}</Detail>
          </>
        )}
      </dl>
      {verification.status === "error" && verification.error?.code !== "NOT_CONFIGURED" && (
        <p className="pt-3 text-xs text-fg-3">We couldn’t load your verification details right now.</p>
      )}
      <p className="flex items-start gap-2 pt-4 text-xs leading-4 text-fg-2">
        <Icon name="help" size="sm" className="!size-3.5 mt-px" />
        <span>
          Your major and level can be edited in Personal information. Your matricule and university are verified, so only the administrators can correct
          them: contact them from the <a href="/app/help" className="font-bold text-primary-text hover:underline">Help</a> page.
        </span>
      </p>
    </Section>
  );
}

/* ───────────── Tab ───────────── */

/**
 * Account — who I am: personal information (shared ProfileForm), email, student ID.
 * `onDirty(key, dirty)` reports unsaved edits to the page; `beforeReload()` lets the profile save reload without the leave warning.
 */
export default function AccountTab({ notify, onDirty, beforeReload }) {
  const user = getSession()?.user ?? {};
  const profile = useAsync(getProfile);
  const [formKey, setFormKey] = useState(0);
  const [profileDirty, setProfileDirty] = useState(false);

  const onProfileDirty = useCallback(
    (dirty) => {
      setProfileDirty(dirty);
      onDirty("profile", dirty);
    },
    [onDirty]
  );
  const onEmailDirty = useCallback((dirty) => onDirty("email", dirty), [onDirty]);

  const submitProfile = async (p) => {
    await saveProfile(p);
    // Reload so the sidebar and app bar show the new name and photo; the page then says "Saved".
    beforeReload();
    window.location.assign("/app/settings?saved=profile#profile");
  };

  return (
    <>
      <Section
        id="profile"
        icon="user"
        title="Personal information"
        description="How other students see you: your photo, name, studies and the modules you can help with."
        action={profileDirty ? <UnsavedTag /> : null}
      >
        <Remote state={profile} what="profile">
          {profile.data && (
            <div className={`rounded-xl transition-shadow ${profileDirty ? "shadow-[inset_3px_0_0_var(--color-highlight)] pl-3" : ""}`}>
              <ProfileForm
                key={formKey}
                initial={profile.data}
                submitLabel="Save changes"
                onSubmit={submitProfile}
                onDirtyChange={onProfileDirty}
                onCancel={profileDirty ? () => setFormKey((k) => k + 1) : undefined}
              />
            </div>
          )}
        </Remote>
      </Section>

      <EmailSection user={user} notify={notify} onDirtyChange={onEmailDirty} />
      <StudentIdSection user={user} profile={profile} />
    </>
  );
}
