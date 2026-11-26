import { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Button from "../../Components/uiC/Button.jsx";
import Icon from "../../Components/uiC/Icon.jsx";
import Input from "../../Components/uiC/Input.jsx";
import Avatar from "../../Components/uiC/Avatar.jsx";
import { useAsync } from "../../hooks/useAsync.js";
import { useDialog } from "../../hooks/useDialog.js";
import {
  OPERATOR_ROLES,
  OPERATOR_STATUS,
  PERMISSIONS,
  REASON_MIN,
  can,
  changeOperatorRole,
  inviteOperator,
  listOperators,
  operatorAction,
  systemErrorText,
} from "../../services/adminSystemService.js";
import { adminErrorText, fmtDateTime, fmtDay, initialsOf } from "./students/format.js";
import { ErrorLine } from "./sessions/SessionActionDialog.jsx";
import { textareaCls } from "./sessions/sessionFormat.js";

const errorText = (err, fallback) => systemErrorText(err) ?? adminErrorText(err, fallback);

/** Confirmation copy per action. `reason`: required | optional | none. */
const ACTIONS = {
  suspend: {
    title: (n) => `Suspend ${n}?`,
    message: "They're signed out at once and lose access to the admin area until reactivated. Everything they did stays in the change log.",
    confirm: "Suspend operator",
    tone: "warning",
    reason: "required",
    done: (n) => `${n} was suspended.`,
  },
  reactivate: {
    title: (n) => `Reactivate ${n}?`,
    message: "They can sign in to the admin area again with their current role.",
    confirm: "Reactivate",
    tone: "primary",
    reason: "none",
    done: (n) => `${n} is active again.`,
  },
  remove: {
    title: (n) => `Remove ${n}?`,
    message: "They lose admin access for good. Their past actions stay in the change log. To give access back, invite them again.",
    confirm: "Remove operator",
    tone: "danger",
    reason: "optional",
    done: (n) => `${n} no longer has admin access.`,
  },
  revoke: {
    title: (n) => `Revoke ${n}'s invitation?`,
    message: "The invitation link stops working. You can invite them again later.",
    confirm: "Revoke invitation",
    tone: "danger",
    reason: "none",
    done: (n) => `${n}'s invitation was revoked.`,
  },
};

/**
 * Admin: operators (/admin/operators): who can use the admin area, with which role, and what each role may do.
 * Only super admins can invite, change roles, suspend or remove; the server enforces it (docs/system-admin.md).
 */
export default function OperatorsP() {
  const { status, data, error, reload } = useAsync(listOperators);
  const [dialog, setDialog] = useState(null); // { kind: "invite" | "role" | action, op }
  const [notice, setNotice] = useState(null); // { tone, text }
  const [busyId, setBusyId] = useState(null);

  const items = data?.items ?? [];
  const me = items.find((o) => o.id === data?.me) ?? null;
  const manage = can(me?.role, "operators");
  const sorted = [...items].sort((a, b) => (a.id === data?.me ? -1 : b.id === data?.me ? 1 : 0) || roleRank(a) - roleRank(b) || a.fullName.localeCompare(b.fullName));
  const countBy = (s) => items.filter((o) => o.status === s).length;

  const done = (text) => {
    setDialog(null);
    setNotice({ tone: "ok", text });
    reload();
  };
  const resend = async (op) => {
    setBusyId(op.id);
    try {
      await operatorAction(op.id, "resend");
      setNotice({ tone: "ok", text: `A new invitation was sent to ${op.email}.` });
      reload();
    } catch (err) {
      setNotice({ tone: "error", text: errorText(err, "The invitation couldn't be sent.") });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-extrabold leading-8 text-fg">Operators</h1>
          <p className="text-sm leading-5 text-fg-2">The people who run TANAWAR: invite them, choose their role, and suspend or remove access.</p>
        </div>
        {manage && (
          <Button size="m" onClick={() => setDialog({ kind: "invite" })} aria-haspopup="dialog">
            <Icon name="userPlus" size="sm" /> Invite operator
          </Button>
        )}
      </header>

      {notice && (
        <div
          role={notice.tone === "error" ? "alert" : "status"}
          className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${
            notice.tone === "error" ? "border-live/25 bg-danger-soft text-live" : "border-primary/25 bg-primary-soft text-primary-text"
          }`}
        >
          <Icon name={notice.tone === "error" ? "alert" : "check"} size="sm" className="mt-px" />
          <span className="flex-1">{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="cursor-pointer rounded opacity-70 hover:opacity-100">
            <Icon name="close" size="sm" />
          </button>
        </div>
      )}

      {status === "ready" && me && !manage && (
        <p className="flex items-start gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-fg-2">
          <Icon name="lock" size="sm" className="mt-px text-fg-3" />
          You're signed in as {OPERATOR_ROLES[me.role].label.toLowerCase()}. Only super admins can invite or manage operators.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat icon="userCog" tone="bg-primary-soft text-primary-text" label="Active operators" value={status === "ready" ? countBy("active") : null} />
        <Stat icon="mail" tone="bg-accent-soft text-accent-ink" label="Pending invitations" value={status === "ready" ? countBy("invited") : null} />
        <Stat icon="clock" tone="bg-warn-soft text-warn" label="Suspended" value={status === "ready" ? countBy("suspended") : null} />
      </div>

      <section aria-busy={status === "loading"} className="overflow-hidden rounded-[20px] border border-line bg-surface">
        <h2 className="border-b border-line px-5 py-4 text-base font-extrabold text-fg">Team</h2>
        {status === "loading" ? (
          <div role="status" aria-label="Loading operators" className="flex flex-col divide-y divide-line">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <span className="size-10 animate-pulse rounded-full bg-surface-2" />
                <span className="h-3.5 w-48 animate-pulse rounded bg-surface-2" />
              </div>
            ))}
          </div>
        ) : status === "error" ? (
          <div role="alert" className="flex flex-col items-center gap-3 px-5 py-14 text-center text-sm text-fg-2">
            <Icon name="warning" size="lg" className="text-warn" />
            <p>{errorText(error, "We couldn't load the operators.")}</p>
            <Button size="s" variant="outline" onClick={reload}>Try again</Button>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {sorted.map((op) => {
              const self = op.id === data.me;
              const role = OPERATOR_ROLES[op.role];
              const st = OPERATOR_STATUS[op.status];
              return (
                <li key={op.id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:gap-4">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar initials={initialsOf(op.fullName)} size={40} className={op.status === "active" ? "" : "opacity-60"} />
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-bold text-fg">{op.fullName}</span>
                        {self && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-fg-2">You</span>}
                      </span>
                      <span className="truncate text-[13px] text-fg-3">{op.email ?? "—"}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 lg:w-[300px]">
                    <Pill className={role.className} icon={role.icon}>{role.label}</Pill>
                    <Pill className={st.className} icon={st.icon}>{st.label}</Pill>
                  </div>

                  <div className="text-[13px] leading-5 text-fg-3 lg:w-[190px]">
                    {op.status === "invited" ? (
                      <>Invited {fmtDay(op.createdAt)}{op.invitedBy ? ` by ${op.invitedBy}` : ""}</>
                    ) : op.lastActiveAt ? (
                      <span title={fmtDateTime(op.lastActiveAt)}>Last active {fmtDay(op.lastActiveAt)}</span>
                    ) : (
                      "Never signed in"
                    )}
                    {op.status === "suspended" && op.statusReason && <p className="line-clamp-2 text-warn" title={op.statusReason}>“{op.statusReason}”</p>}
                  </div>

                  {manage && !self ? (
                    <div className="flex flex-wrap items-center gap-1.5 lg:w-[176px] lg:justify-end">
                      {op.status !== "invited" && (
                        <RowAction icon="shield" label={`Change ${op.fullName}'s role`} onClick={() => setDialog({ kind: "role", op })} />
                      )}
                      {op.status === "invited" && (
                        <RowAction icon={busyId === op.id ? "loader" : "mail"} label={`Resend the invitation to ${op.fullName}`} onClick={() => resend(op)} disabled={busyId === op.id} spin={busyId === op.id} />
                      )}
                      {op.status === "active" && <RowAction icon="clock" label={`Suspend ${op.fullName}`} onClick={() => setDialog({ kind: "suspend", op })} />}
                      {op.status === "suspended" && <RowAction icon="flip" label={`Reactivate ${op.fullName}`} onClick={() => setDialog({ kind: "reactivate", op })} />}
                      <RowAction
                        icon="trash"
                        danger
                        label={op.status === "invited" ? `Revoke ${op.fullName}'s invitation` : `Remove ${op.fullName}`}
                        onClick={() => setDialog({ kind: op.status === "invited" ? "revoke" : "remove", op })}
                      />
                    </div>
                  ) : (
                    <div className="hidden lg:block lg:w-[176px]" />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <RolesMatrix />

      {dialog?.kind === "invite" && <InviteDialog onCancel={() => setDialog(null)} onDone={(op) => done(`Invitation sent to ${op.email}.`)} />}
      {dialog?.kind === "role" && <RoleDialog op={dialog.op} onCancel={() => setDialog(null)} onDone={(role) => done(`${dialog.op.fullName} is now ${OPERATOR_ROLES[role].label.toLowerCase()}.`)} />}
      {ACTIONS[dialog?.kind] && (
        <ConfirmActionDialog
          action={dialog.kind}
          op={dialog.op}
          onCancel={() => setDialog(null)}
          onDone={() => done(ACTIONS[dialog.kind].done(dialog.op.fullName))}
        />
      )}
    </>
  );
}

const roleRank = (o) => Object.keys(OPERATOR_ROLES).indexOf(o.role);

function Stat({ icon, tone, label, value }) {
  return (
    <div className="flex items-center gap-3.5 rounded-[20px] border border-line bg-surface p-5">
      <span className={`flex size-11 items-center justify-center rounded-xl ${tone}`}>
        <Icon name={icon} />
      </span>
      <div className="flex flex-col">
        <span className="text-[13px] font-semibold text-fg-2">{label}</span>
        {value == null ? <span className="mt-1 h-6 w-8 animate-pulse rounded bg-surface-2" /> : <span className="text-2xl font-extrabold leading-8 text-fg">{value}</span>}
      </div>
    </div>
  );
}

function Pill({ className, icon, children }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold leading-none ${className}`}>
      <Icon name={icon} size="sm" className="!size-3.5" />
      {children}
    </span>
  );
}

function RowAction({ icon, label, onClick, danger = false, disabled = false, spin = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border border-line text-fg-2 transition-colors disabled:cursor-wait focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        danger ? "hover:border-live/40 hover:bg-danger-soft hover:text-live" : "hover:bg-surface-2 hover:text-fg"
      }`}
    >
      <Icon name={icon} size="sm" className={spin ? "animate-spin" : ""} />
    </button>
  );
}

/** What each role can do: the same table the server enforces. */
function RolesMatrix() {
  const roles = Object.entries(OPERATOR_ROLES);
  return (
    <section className="overflow-hidden rounded-[20px] border border-line bg-surface">
      <div className="flex flex-col gap-1 border-b border-line px-5 py-4">
        <h2 className="text-base font-extrabold text-fg">Roles & permissions</h2>
        <p className="text-[13px] text-fg-2">Give each operator the smallest role that lets them do their job.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="px-5 py-3.5 text-[13px] font-bold text-fg-2">Permission</th>
              {roles.map(([key, r]) => (
                <th key={key} scope="col" className="px-3 py-3.5 text-center">
                  <span className="flex flex-col items-center gap-1">
                    <Pill className={r.className} icon={r.icon}>{r.label}</Pill>
                    <span className="max-w-[200px] text-[11px] font-normal leading-4 text-fg-3">{r.description}</span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {PERMISSIONS.map((p) => (
              <tr key={p.key}>
                <th scope="row" className="px-5 py-3 font-semibold text-fg">{p.label}</th>
                {roles.map(([key, r]) => {
                  const yes = p.roles.includes(key);
                  return (
                    <td key={key} className="px-3 py-3 text-center">
                      {yes ? (
                        <Icon name="check" size="sm" className="mx-auto text-success" label={`${r.label}: allowed`} />
                      ) : (
                        <span className="text-fg-3" aria-label={`${r.label}: not allowed`}>—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ───────────── dialogs ───────────── */

function Modal({ title, description, onCancel, busy, onSubmit, children, footer, alert = false }) {
  const panelRef = useRef(null);
  const titleId = useId();
  const onKeyDown = useDialog(panelRef, () => !busy && onCancel());
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onKeyDown={onKeyDown}>
      <div aria-hidden="true" onClick={() => !busy && onCancel()} className="animate-overlay-in fixed inset-0 bg-ink/50 dark:bg-black/60" />
      <form
        ref={panelRef}
        role={alert ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onSubmit={onSubmit}
        className="animate-dialog-in relative flex max-h-[calc(100vh-2rem)] w-full max-w-[520px] flex-col gap-5 overflow-y-auto rounded-[24px] border border-line bg-surface p-6 shadow-pop outline-none"
      >
        <div className="flex flex-col gap-1.5">
          <h2 id={titleId} className="break-words text-xl font-extrabold leading-7 text-fg">{title}</h2>
          {description && <p className="text-sm leading-5 text-fg-2">{description}</p>}
        </div>
        {children}
        <div className="flex justify-end gap-2.5">{footer}</div>
      </form>
    </div>,
    document.body
  );
}

function RolePicker({ value, onChange }) {
  const name = useId();
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-[13px] font-bold text-fg">Role</legend>
      {Object.entries(OPERATOR_ROLES).map(([key, r]) => (
        <label
          key={key}
          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
            value === key ? "border-primary bg-primary-soft/60" : "border-line hover:bg-surface-2"
          }`}
        >
          <input type="radio" name={name} value={key} checked={value === key} onChange={() => onChange(key)} className="mt-1 size-4 accent-[var(--color-primary)]" />
          <span className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1.5 text-sm font-bold text-fg">
              <Icon name={r.icon} size="sm" className="!size-4 text-fg-2" /> {r.label}
            </span>
            <span className="text-[13px] leading-5 text-fg-2">{r.description}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

function InviteDialog({ onCancel, onDone }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("moderator");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      onDone(await inviteOperator({ fullName, email, role }));
    } catch (err) {
      setError(errorText(err, "The invitation couldn't be sent."));
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Invite an operator"
      description="They get an email with a link to set their password and access the admin area."
      onCancel={onCancel}
      busy={busy}
      onSubmit={submit}
      footer={
        <>
          <Button variant="outline" size="s" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button type="submit" size="s" disabled={busy || !fullName.trim() || !email.trim()} aria-busy={busy}>
            {busy ? <Icon name="loader" size="sm" className="animate-spin" /> : <Icon name="mail" size="sm" />}
            Send invitation
          </Button>
        </>
      }
    >
      <Input label="Full name" icon="user" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={80} required autoComplete="off" />
      <Input label="Email" icon="mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@univ-boumerdes.dz" required autoComplete="off" />
      <RolePicker value={role} onChange={setRole} />
      {error && <ErrorLine>{error}</ErrorLine>}
    </Modal>
  );
}

function RoleDialog({ op, onCancel, onDone }) {
  const [role, setRole] = useState(op.role);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (role === op.role) return onCancel();
    setBusy(true);
    setError("");
    try {
      await changeOperatorRole(op.id, role);
      onDone(role);
    } catch (err) {
      setError(errorText(err, "The role couldn't be changed."));
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`Change ${op.fullName}'s role`}
      description="Takes effect on their next action. The change is recorded in the change log."
      onCancel={onCancel}
      busy={busy}
      onSubmit={submit}
      footer={
        <>
          <Button variant="outline" size="s" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button type="submit" size="s" disabled={busy || role === op.role} aria-busy={busy}>
            {busy && <Icon name="loader" size="sm" className="animate-spin" />}
            Save role
          </Button>
        </>
      }
    >
      <RolePicker value={role} onChange={setRole} />
      {error && <ErrorLine>{error}</ErrorLine>}
    </Modal>
  );
}

function ConfirmActionDialog({ action, op, onCancel, onDone }) {
  const def = ACTIONS[action];
  const reasonId = useId();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const required = def.reason === "required";
  const ok = !required || reason.trim().length >= REASON_MIN;

  const submit = async (e) => {
    e.preventDefault();
    if (!ok) return;
    setBusy(true);
    setError("");
    try {
      await operatorAction(op.id, action === "revoke" ? "remove" : action, reason);
      onDone();
    } catch (err) {
      setError(errorText(err, "That didn't work. Please try again."));
      setBusy(false);
    }
  };

  return (
    <Modal
      alert
      title={def.title(op.fullName)}
      description={def.message}
      onCancel={onCancel}
      busy={busy}
      onSubmit={submit}
      footer={
        <>
          <Button variant="outline" size="s" onClick={onCancel} disabled={busy}>Keep as is</Button>
          <Button type="submit" variant={def.tone} size="s" disabled={busy || !ok} aria-busy={busy}>
            {busy && <Icon name="loader" size="sm" className="animate-spin" />}
            {def.confirm}
          </Button>
        </>
      }
    >
      {def.reason !== "none" && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={reasonId} className="text-[13px] font-bold text-fg">
            Reason {required ? <span aria-hidden="true">*</span> : <span className="font-normal text-fg-3">(optional)</span>}
          </label>
          <textarea
            id={reasonId}
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required={required}
            placeholder="Recorded in the change log."
            className={textareaCls}
          />
          {required && !ok && <p className="text-xs text-fg-3">At least {REASON_MIN} characters.</p>}
        </div>
      )}
      {error && <ErrorLine>{error}</ErrorLine>}
    </Modal>
  );
}
