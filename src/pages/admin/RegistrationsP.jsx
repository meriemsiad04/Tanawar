import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Button from "../../Components/uiC/Button.jsx";
import Icon from "../../Components/uiC/Icon.jsx";
import Input from "../../Components/uiC/Input.jsx";
import VerificationStatusBadge from "../../Components/sharedC/VerificationStatusBadge.jsx";
import { useDialog } from "../../hooks/useDialog.js";
import {
  REJECTION_PRESETS,
  REJECTION_REASON_MIN,
  approveRegistration,
  documentTypeLabel,
  getRegistration,
  getRegistrationDocument,
  listRegistrations,
  rejectRegistration,
} from "../../services/verificationService.js";

const TABS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

const SAFE_PREVIEW_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const errorText = (err, fallback) => (err?.code === "NOT_CONFIGURED" ? "The server isn't connected yet." : err?.message || fallback);

/**
 * Admin: student registration review queue (/admin/registrations).
 * Content only, so the future admin dashboard can render it inside its own layout / route.
 * Access is enforced by the server (admin role on every /admin/registrations call); the App.jsx role check is UX only.
 */
export default function RegistrationsP() {
  const [status, setStatus] = useState("pending");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState({ key: null, items: [], total: 0, error: null });
  const [openId, setOpenId] = useState(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // The list for the current filters + reload tick; "loading" until a result for this exact key arrives.
  const key = `${status}|${debounced}|${tick}`;
  useEffect(() => {
    let active = true;
    listRegistrations({ status, q: debounced }).then(
      (res) => active && setResult({ key, items: res?.items ?? [], total: res?.total ?? res?.items?.length ?? 0, error: null }),
      (error) => active && setResult({ key, items: [], total: 0, error })
    );
    return () => {
      active = false;
    };
  }, [key, status, debounced]);
  const state = { ...result, loading: result.key !== key };
  const load = () => setTick((t) => t + 1);

  const onDecided = (reg) => {
    setOpenId(null);
    setNotice(`${reg.fullName}'s registration was ${reg.status === "approved" ? "approved: they now have access" : "rejected: they can see your reason and resubmit"}.`);
    load();
  };

  return (
    <>
      <header className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-extrabold leading-8 text-fg">Student registrations</h1>
        <p className="text-sm leading-5 text-fg-2">Check each student's ID against their document, then approve or reject. Students can't use TANAWAR until approved.</p>
      </header>

      {notice && (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-primary/25 bg-primary-soft px-4 py-3 text-sm font-semibold text-primary-text">
          <Icon name="check" size="sm" className="mt-px" />
          <span className="flex-1">{notice}</span>
          <button type="button" onClick={() => setNotice("")} aria-label="Dismiss" className="cursor-pointer rounded text-primary-text/70 hover:text-primary-text">
            <Icon name="close" size="sm" />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div role="tablist" aria-label="Filter by status" className="flex gap-1 overflow-x-auto rounded-xl bg-surface-2 p-1">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={status === t.value}
              onClick={() => setStatus(t.value)}
              className={`cursor-pointer whitespace-nowrap rounded-lg px-3.5 py-2 text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                status === t.value ? "bg-surface text-fg shadow-sm" : "text-fg-2 hover:text-fg"
              }`}
            >
              {t.label}
              {status === t.value && !state.loading && !state.error && <span className="ml-1.5 text-fg-3">{state.total}</span>}
            </button>
          ))}
        </div>
        <Input
          className="sm:w-80"
          icon="search"
          type="search"
          placeholder="Search name, matricule or email"
          aria-label="Search registrations"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <section className="overflow-hidden rounded-[20px] border border-line bg-surface">
        {state.loading ? (
          <p role="status" className="px-5 py-12 text-center text-sm text-fg-2">Loading registrations…</p>
        ) : state.error ? (
          <div role="alert" className="flex flex-col items-center gap-3 px-5 py-12 text-center text-sm text-fg-2">
            <p>{errorText(state.error, "We couldn't load the registrations.")}</p>
            <Button size="s" variant="outline" onClick={load}>Try again</Button>
          </div>
        ) : state.items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
            <Icon name="userCheck" size="lg" className="text-fg-3" />
            <p className="text-sm font-semibold text-fg">{debounced ? "No registration matches your search." : status === "pending" ? "No registrations waiting for review." : "Nothing here yet."}</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {state.items.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(r.id)}
                  aria-haspopup="dialog"
                  className="grid w-full cursor-pointer grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-3.5 text-left transition-colors hover:bg-surface-2/60 focus-visible:bg-surface-2 focus-visible:outline-none md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto_auto]"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-bold text-fg">{r.fullName}</span>
                    <span className="truncate text-xs text-fg-3">{r.email}</span>
                  </span>
                  <span className="hidden font-mono text-[13px] text-fg-2 md:block">{r.matricule}</span>
                  <span className="hidden min-w-0 truncate text-[13px] text-fg-2 md:block">
                    {documentTypeLabel(r.documentType)}
                    {r.attempts > 1 && <span className="text-fg-3"> · attempt {r.attempts}</span>}
                  </span>
                  <span className="hidden whitespace-nowrap text-xs text-fg-3 md:block">{fmtDate(r.submittedAt)}</span>
                  <VerificationStatusBadge status={r.status} />
                  <span className="col-span-2 text-xs text-fg-3 md:hidden">
                    {r.matricule} · {documentTypeLabel(r.documentType)} · {fmtDate(r.submittedAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {openId && <ReviewDialog id={openId} onClose={() => setOpenId(null)} onDecided={onDecided} />}
    </>
  );
}

function ReviewDialog({ id, onClose, onDecided }) {
  const panelRef = useRef(null);
  const titleId = useId();
  const reasonId = useId();
  const [reg, setReg] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [doc, setDoc] = useState({ url: null, error: null, loading: true });
  const [mode, setMode] = useState("view"); // view | reject
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const onKeyDown = useDialog(panelRef, () => !busy && onClose());

  useEffect(() => {
    let active = true;
    let url = null;
    getRegistration(id).then(
      (r) => active && setReg(r),
      (e) => active && setLoadError(e)
    );
    getRegistrationDocument(id).then(
      (blob) => {
        if (!active) return;
        url = URL.createObjectURL(blob);
        setDoc({ url, type: blob.type, error: null, loading: false });
      },
      (error) => active && setDoc({ url: null, error, loading: false })
    );
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);

  const decide = async (fn) => {
    setBusy(true);
    setActionError("");
    try {
      onDecided(await fn());
    } catch (err) {
      setActionError(errorText(err, "That didn't work. Please try again."));
      setBusy(false);
    }
  };

  // Blob URLs run with this app's origin: only ever render the allowed document types (never HTML/SVG).
  const docType = doc.type || reg?.document?.mimeType || "";
  const previewable = SAFE_PREVIEW_TYPES.includes(docType);
  const reasonOk = reason.trim().length >= REJECTION_REASON_MIN;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto p-4 sm:items-center" onKeyDown={onKeyDown}>
      <div aria-hidden="true" onClick={() => !busy && onClose()} className="animate-overlay-in fixed inset-0 bg-ink/60 backdrop-blur-md dark:bg-black/60" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="animate-dialog-in relative my-auto flex w-full max-w-[960px] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-pop outline-none"
      >
        <header className="flex items-start gap-3 border-b border-line px-5 py-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="truncate text-lg font-extrabold leading-6 text-fg">{reg?.fullName ?? "Registration"}</h2>
            <p className="text-[13px] text-fg-2">Review the student's details against their document.</p>
          </div>
          {reg && <VerificationStatusBadge status={reg.status} />}
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="-mr-1.5 inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-fg-3 hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
          >
            <Icon name="close" size="sm" />
          </button>
        </header>

        {loadError ? (
          <p role="alert" className="px-6 py-10 text-center text-sm text-fg-2">{errorText(loadError, "We couldn't load this registration.")}</p>
        ) : !reg ? (
          <p role="status" className="px-6 py-10 text-center text-sm text-fg-2">Loading…</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            {/* Document */}
            <div className="flex min-h-[320px] flex-col gap-2 border-b border-line bg-surface-2/60 p-4 lg:border-b-0 lg:border-r">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[13px] font-bold text-fg">
                  {documentTypeLabel(reg.documentType)}
                  {reg.document?.name && <span className="font-normal text-fg-3"> · {reg.document.name}</span>}
                </p>
                {doc.url && previewable && (
                  <a href={doc.url} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-[13px] font-bold text-primary-text hover:underline">
                    Open <Icon name="external" size="sm" className="!size-3.5" />
                  </a>
                )}
              </div>
              <div className="flex flex-1 items-center justify-center overflow-hidden rounded-xl border border-line bg-surface">
                {doc.loading ? (
                  <p role="status" className="text-sm text-fg-2">Loading document…</p>
                ) : doc.error ? (
                  <p className="px-4 text-center text-sm text-fg-2">{errorText(doc.error, "The document couldn't be loaded.")}</p>
                ) : !previewable ? (
                  <p className="px-4 text-center text-sm text-fg-2">This file type ({docType || "unknown"}) can't be previewed safely. Ask the student to resubmit a JPG, PNG, WEBP or PDF.</p>
                ) : docType === "application/pdf" ? (
                  <iframe src={doc.url} title={`Document of ${reg.fullName}`} className="h-[60vh] w-full" />
                ) : (
                  <img src={doc.url} alt={`${documentTypeLabel(reg.documentType)} of ${reg.fullName}`} className="max-h-[60vh] w-full object-contain" />
                )}
              </div>
            </div>

            {/* Details + decision */}
            <div className="flex flex-col gap-5 p-5 sm:p-6">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <Field label="Full name" value={reg.fullName} wide />
                <Field label="Student ID" value={<span className="font-mono">{reg.matricule}</span>} />
                <Field label="Signed up with" value={reg.method === "google" ? "Google" : "Email"} />
                <Field label="Email" value={reg.email} wide />
                <Field label="Submitted" value={fmtDate(reg.submittedAt)} />
                <Field label="Attempt" value={reg.attempts ?? 1} />
                {reg.reviewedAt && <Field label="Reviewed" value={`${fmtDate(reg.reviewedAt)}${reg.reviewedBy ? ` by ${reg.reviewedBy}` : ""}`} wide />}
                {reg.rejectionReason && <Field label="Reason given" value={reg.rejectionReason} wide />}
              </dl>

              {actionError && (
                <p role="alert" className="flex items-start gap-2 rounded-[10px] border border-live/25 bg-danger-soft px-3 py-2.5 text-[13px] font-semibold text-live">
                  <Icon name="alert" size="sm" className="mt-px" />
                  {actionError}
                </p>
              )}

              {reg.status !== "pending" ? (
                <p className="mt-auto text-[13px] text-fg-3">This registration has been reviewed. A resubmission by the student will put it back in the pending queue.</p>
              ) : mode === "view" ? (
                <div className="mt-auto flex flex-col gap-2 sm:flex-row">
                  <Button size="m" className="flex-1" disabled={busy} aria-busy={busy} onClick={() => decide(() => approveRegistration(reg.id))}>
                    <Icon name={busy ? "loader" : "verified"} size="sm" className={busy ? "animate-spin" : ""} />
                    Approve
                  </Button>
                  <Button size="m" variant="outline" className="flex-1" disabled={busy} onClick={() => setMode("reject")}>
                    Reject…
                  </Button>
                </div>
              ) : (
                <div className="mt-auto flex flex-col gap-3">
                  <label htmlFor={reasonId} className="text-[13px] font-bold text-fg">
                    Reason for the student <span className="font-normal text-fg-3">(they'll see this and can resubmit)</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {REJECTION_PRESETS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setReason(p)}
                        className="cursor-pointer rounded-full border border-line-strong px-2.5 py-1 text-left text-xs text-fg-2 hover:border-primary hover:text-fg"
                      >
                        {p.split(".")[0]}
                      </button>
                    ))}
                  </div>
                  <textarea
                    id={reasonId}
                    rows={4}
                    maxLength={500}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Explain what's wrong and what to send instead."
                    className="w-full resize-none rounded-[10px] border border-line-strong bg-surface px-3 py-2.5 text-sm text-fg outline-none placeholder:text-fg-3 focus:border-primary focus:ring-4 focus:ring-primary/15"
                  />
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button size="m" variant="outline" className="flex-1" disabled={busy} onClick={() => setMode("view")}>
                      Cancel
                    </Button>
                    <Button
                      size="m"
                      variant="danger"
                      className="flex-1"
                      disabled={busy || !reasonOk}
                      aria-busy={busy}
                      onClick={() => decide(() => rejectRegistration(reg.id, reason))}
                    >
                      {busy && <Icon name="loader" size="sm" className="animate-spin" />}
                      Reject registration
                    </Button>
                  </div>
                  {!reasonOk && <p className="text-xs text-fg-3">At least {REJECTION_REASON_MIN} characters.</p>}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

function Field({ label, value, wide = false }) {
  return (
    <div className={`flex min-w-0 flex-col ${wide ? "col-span-2" : ""}`}>
      <dt className="text-xs font-semibold text-fg-3">{label}</dt>
      <dd className="break-words font-semibold text-fg">{value || "—"}</dd>
    </div>
  );
}
