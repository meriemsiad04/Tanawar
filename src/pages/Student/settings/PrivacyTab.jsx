import { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Button from "../../../Components/uiC/Button.jsx";
import Icon from "../../../Components/uiC/Icon.jsx";
import Input from "../../../Components/uiC/Input.jsx";
import ConfirmDialog from "../../../Components/sharedC/ConfirmDialog.jsx";
import { useAsync } from "../../../hooks/useAsync.js";
import { useDialog } from "../../../hooks/useDialog.js";
import { timeAgo } from "../../../hooks/useNotifications.js";
import {
  DELETE_CONFIRMATION,
  changePassword,
  deactivateAccount,
  deleteAccount,
  exportMyData,
  hasPassword,
  listDevices,
  revokeDevice,
  signOutEverywhere,
  validatePasswordChange,
} from "../../../services/accountService.js";
import { PASSWORD_MIN, getSession } from "../../../services/authService.js";
import { AUDIENCES, FRIEND_REQUEST_OPTIONS } from "../../../services/settingsService.js";
import { FormNote, PasswordInput, Remote, Section, SelectRow } from "./settingsUi.jsx";

const serverMessage = (err, fallback) =>
  err?.code === "NOT_CONFIGURED" ? "This will work once the server is connected." : err?.message || fallback;

/* ───────────── Password ───────────── */

const EMPTY_PW = { currentPassword: "", newPassword: "", confirm: "" };

function PasswordSection({ google, notify, onDirty }) {
  const [values, setValues] = useState(EMPTY_PW);
  const [errors, setErrors] = useState({});
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const dirty = Object.values(values).some(Boolean);

  const change = (field) => (e) => {
    const next = { ...values, [field]: e.target.value };
    setValues(next);
    setErrors((er) => ({ ...er, [field]: undefined }));
    onDirty("password", Object.values(next).some(Boolean));
  };
  const reset = () => {
    setValues(EMPTY_PW);
    setErrors({});
    setFormError("");
    onDirty("password", false);
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");
    const found = validatePasswordChange(values);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await changePassword(values);
      reset();
      notify("ok", "Password changed. Your other devices have been signed out.");
    } catch (err) {
      if (err?.details?.field) setErrors({ [err.details.field]: err.message });
      else setFormError(serverMessage(err, "Couldn’t change your password."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section id="password" icon="key" title="Password" description="Use a password you don’t use anywhere else. Changing it signs out your other devices.">
      {google ? (
        <p className="text-sm text-fg-2">You sign in with Google, so there is no TANAWAR password. Manage your security from your Google account.</p>
      ) : (
        <form noValidate onSubmit={submit} className="flex flex-col gap-4">
          <input type="text" name="username" autoComplete="username" value={getSession()?.user?.matricule ?? ""} readOnly hidden />
          <PasswordInput label="Current password" autoComplete="current-password" value={values.currentPassword} onChange={change("currentPassword")} error={errors.currentPassword} disabled={busy} shown={show} onToggle={() => setShow((s) => !s)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <PasswordInput label="New password" autoComplete="new-password" placeholder={`At least ${PASSWORD_MIN} characters`} value={values.newPassword} onChange={change("newPassword")} error={errors.newPassword} disabled={busy} shown={show} onToggle={() => setShow((s) => !s)} />
            <PasswordInput label="Confirm new password" autoComplete="new-password" value={values.confirm} onChange={change("confirm")} error={errors.confirm} disabled={busy} shown={show} onToggle={() => setShow((s) => !s)} />
          </div>
          <p className="text-xs text-fg-3">At least {PASSWORD_MIN} characters, with a letter and a number.</p>
          <FormNote kind="error">{formError}</FormNote>
          <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            {dirty && (
              <Button size="s" variant="outline" onClick={reset} disabled={busy} className="dark:bg-surface dark:text-fg">
                Cancel
              </Button>
            )}
            <Button size="s" type="submit" disabled={busy || !dirty}>
              {busy && <Icon name="loader" size="sm" className="animate-spin" />}
              {busy ? "Changing…" : "Change password"}
            </Button>
          </div>
        </form>
      )}
    </Section>
  );
}

/* ───────────── Devices ───────────── */

const DEVICE_ICON = { phone: "phone", tablet: "tablet", desktop: "monitor" };

function DevicesSection({ notify }) {
  const devices = useAsync(listDevices);
  const [busyId, setBusyId] = useState(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [allBusy, setAllBusy] = useState(false);

  const revoke = async (d) => {
    setBusyId(d.id);
    try {
      await revokeDevice(d.id);
      notify("ok", `Signed out ${d.browser} on ${d.os}.`);
      devices.reload();
    } catch (err) {
      notify("error", serverMessage(err, "Couldn’t sign that device out."));
    } finally {
      setBusyId(null);
    }
  };

  const everywhere = async () => {
    setAllBusy(true);
    try {
      await signOutEverywhere(); // navigates away on success
    } catch (err) {
      setAllBusy(false);
      setConfirmAll(false);
      notify("error", serverMessage(err, "Couldn’t sign out your devices."));
    }
  };

  return (
    <Section
      id="devices"
      icon="monitor"
      title="Devices & sessions"
      description="Where your account is signed in. Sign out anything you don’t recognise, then change your password."
    >
      <Remote state={devices} what="devices">
        <ul className="flex flex-col divide-y divide-line">
          {devices.data?.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-3 py-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-fg-2" aria-hidden="true">
                <Icon name={DEVICE_ICON[d.device] ?? "monitor"} size="sm" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-fg">
                  {d.browser} on {d.os}
                  {d.current && <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-bold text-primary-text">This device</span>}
                </span>
                <span className="text-xs text-fg-2">
                  {[d.location, d.current ? "Active now" : d.lastActiveAt ? `Active ${timeAgo(d.lastActiveAt)}` : null].filter(Boolean).join(" · ")}
                </span>
              </div>
              {!d.current && (
                <Button size="s" variant="outline" onClick={() => revoke(d)} disabled={busyId === d.id} className="dark:bg-surface dark:text-fg">
                  {busyId === d.id ? "Signing out…" : "Sign out"}
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Remote>
      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <p className="min-w-0 flex-1 text-xs leading-4 text-fg-2">Signs out every device, this one included. You’ll need to sign in again.</p>
        <Button size="s" variant="outline" onClick={() => setConfirmAll(true)} className="dark:bg-surface dark:text-fg">
          <Icon name="logout" size="sm" /> Sign out of all devices
        </Button>
      </div>
      {confirmAll && (
        <ConfirmDialog
          title="Sign out of all devices?"
          message="You’ll be signed out everywhere, including here. Anyone using your account on another device will lose access."
          confirmLabel="Sign out everywhere"
          busy={allBusy}
          onCancel={() => setConfirmAll(false)}
          onConfirm={everywhere}
        />
      )}
    </Section>
  );
}

/* ───────────── Data ───────────── */

function DataSection({ notify }) {
  const [busy, setBusy] = useState(false);
  const download = async () => {
    setBusy(true);
    try {
      await exportMyData();
      notify("ok", "Your data is downloading.");
    } catch (err) {
      notify("error", serverMessage(err, "Couldn’t prepare your data."));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Section id="your-data" icon="download" title="Your data" description="Download a copy of your profile, settings and activity on TANAWAR.">
      <div className="flex flex-wrap items-center gap-3">
        <p className="min-w-0 flex-1 text-sm text-fg-2">You’ll get a JSON file you can open in any text editor.</p>
        <Button size="s" variant="outline" onClick={download} disabled={busy} className="dark:bg-surface dark:text-fg">
          {busy ? <Icon name="loader" size="sm" className="animate-spin" /> : <Icon name="download" size="sm" />}
          {busy ? "Preparing…" : "Download my data"}
        </Button>
      </div>
    </Section>
  );
}

/* ───────────── Danger zone ───────────── */

/** Confirmation that asks for the password (and, to delete, a typed word). Mount only while open. */
function DangerDialog({ mode, google, onClose }) {
  const titleId = useId();
  const panelRef = useRef(null);
  const [values, setValues] = useState({ currentPassword: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const del = mode === "delete";
  const close = () => !busy && onClose();
  const onKeyDown = useDialog(panelRef, close);

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!google && !values.currentPassword) found.currentPassword = "Enter your password to confirm.";
    if (del && values.confirm !== DELETE_CONFIRMATION) found.confirm = `Type ${DELETE_CONFIRMATION} in capital letters.`;
    setErrors(found);
    setFormError("");
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await (del ? deleteAccount(values) : deactivateAccount(values)); // both navigate away on success
    } catch (err) {
      if (err?.details?.field) setErrors({ [err.details.field]: err.message });
      else setFormError(serverMessage(err, "Something went wrong. Please try again."));
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onKeyDown={onKeyDown}>
      <div aria-hidden="true" onClick={close} className="animate-overlay-in fixed inset-0 bg-ink/60 backdrop-blur-md dark:bg-black/60" />
      <form
        ref={panelRef}
        noValidate
        onSubmit={submit}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="animate-dialog-in relative flex w-full max-w-[460px] flex-col gap-5 rounded-[24px] border border-line bg-surface p-6 shadow-pop outline-none"
      >
        <div className="flex flex-col gap-2">
          <span className="grid size-10 place-items-center rounded-xl bg-danger-soft text-live" aria-hidden="true">
            <Icon name={del ? "trash" : "userX"} size="md" />
          </span>
          <h2 id={titleId} className="text-xl font-extrabold leading-7 text-fg">
            {del ? "Delete your account for good?" : "Deactivate your account?"}
          </h2>
          {del ? (
            <ul className="list-disc pl-5 text-sm leading-5 text-fg-2">
              <li>Your profile, connections, bookings, study time and settings are erased.</li>
              <li>Sessions you host are cancelled and their participants are told.</li>
              <li>This can’t be undone. Download your data first if you want a copy.</li>
            </ul>
          ) : (
            <p className="text-sm leading-5 text-fg-2">
              Your profile is hidden and you’re signed out everywhere. Nothing is deleted: sign in again any time to reactivate your account.
            </p>
          )}
        </div>

        {!google && (
          <PasswordInput label="Your password" autoComplete="current-password" value={values.currentPassword} onChange={(e) => setValues((v) => ({ ...v, currentPassword: e.target.value }))} error={errors.currentPassword} disabled={busy} shown={show} onToggle={() => setShow((s) => !s)} />
        )}
        {del && (
          <Input
            label={<>Type <span className="font-mono">{DELETE_CONFIRMATION}</span> to confirm</>}
            autoComplete="off"
            spellCheck={false}
            value={values.confirm}
            onChange={(e) => setValues((v) => ({ ...v, confirm: e.target.value }))}
            error={errors.confirm}
            disabled={busy}
          />
        )}
        <FormNote kind="error">{formError}</FormNote>

        <div className="flex justify-end gap-2.5">
          <Button variant="outline" size="s" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" size="s" type="submit" disabled={busy}>
            {busy && <Icon name="loader" size="sm" className="animate-spin" />}
            {del ? "Delete my account" : "Deactivate"}
          </Button>
        </div>
      </form>
    </div>,
    document.body
  );
}

function DangerZone({ google }) {
  const [open, setOpen] = useState(null); // "deactivate" | "delete"
  const items = [
    { mode: "deactivate", title: "Deactivate account", text: "Hide your profile and sign out. Sign in again to come back.", label: "Deactivate", variant: "outline" },
    { mode: "delete", title: "Delete account", text: "Permanently erase your account and everything in it.", label: "Delete account", variant: "danger" },
  ];
  return (
    <Section id="danger-zone" tone="danger" icon="warning" title="Danger zone" description="These actions affect your whole account. Read carefully before you continue.">
      <ul className="flex flex-col divide-y divide-line">
        {items.map((i) => (
          <li key={i.mode} className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-sm font-semibold text-fg">{i.title}</span>
              <span className="text-xs leading-4 text-fg-2">{i.text}</span>
            </div>
            <Button size="s" variant={i.variant} onClick={() => setOpen(i.mode)} className={i.variant === "outline" ? "!border-live !text-live dark:bg-surface" : ""}>
              {i.label}
            </Button>
          </li>
        ))}
      </ul>
      {open && <DangerDialog mode={open} google={google} onClose={() => setOpen(null)} />}
    </Section>
  );
}

/* ───────────── Tab ───────────── */

/**
 * Privacy & Security — how my information is protected.
 * Visibility settings edit the page's draft (`value`, `set`, `changed`); the rest are immediate actions.
 */
export default function PrivacyTab({ value, set, changed, notify, onDirty }) {
  const p = value.privacy;
  const google = !hasPassword(getSession()?.user);
  return (
    <>
      <Section id="visibility" icon="eye" title="Privacy" description="Decide who can see you and reach you. Applies everywhere on TANAWAR.">
        <div className="flex flex-col divide-y divide-line">
          <SelectRow
            label="Who can see my profile"
            hint="Your name and photo stay visible in sessions you join."
            icon="user"
            value={p.profileVisibility}
            options={AUDIENCES}
            onChange={(v) => set("privacy.profileVisibility", v)}
            changed={changed("privacy.profileVisibility")}
          />
          <SelectRow
            label="Who can send me friend requests"
            icon="users"
            value={p.friendRequests}
            options={FRIEND_REQUEST_OPTIONS}
            onChange={(v) => set("privacy.friendRequests", v)}
            changed={changed("privacy.friendRequests")}
          />
          <SelectRow
            label="Who can see my activity"
            hint="Your activity calendar, streaks and achievements."
            icon="activity"
            value={p.activityVisibility}
            options={AUDIENCES}
            onChange={(v) => set("privacy.activityVisibility", v)}
            changed={changed("privacy.activityVisibility")}
          />
          <SelectRow
            label="Who can see my learning statistics"
            hint="Hours studied, sessions attended and your rating."
            icon="levels"
            value={p.statsVisibility}
            options={AUDIENCES}
            onChange={(v) => set("privacy.statsVisibility", v)}
            changed={changed("privacy.statsVisibility")}
          />
        </div>
      </Section>

      <PasswordSection google={google} notify={notify} onDirty={onDirty} />
      <DevicesSection notify={notify} />
      <DataSection notify={notify} />
      <DangerZone google={google} />
    </>
  );
}
