import { useCallback, useEffect, useRef, useState } from "react";
import Logo from "../../Components/uiC/Logo.jsx";
import Button from "../../Components/uiC/Button.jsx";
import Icon from "../../Components/uiC/Icon.jsx";
import VerificationFields from "../../Components/sharedC/VerificationFields.jsx";
import {
  VERIFICATION_FIELDS,
  documentTypeLabel,
  getCachedVerification,
  getMyVerification,
  resubmitVerification,
  validateVerification,
} from "../../services/verificationService.js";

const POLL_MS = 30_000;
const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : null);

/**
 * Shown instead of the platform to students whose registration isn't approved (App.jsx gate at /app/verification).
 * Pending → explains the wait and re-checks the status every 30 s and when the tab regains focus.
 * Rejected → shows the admin's reason and the same verification form to resubmit.
 * Approved → leaves for /app (profile setup comes next).
 */
export default function VerificationStatusP({ onLogout }) {
  const [verification, setVerification] = useState(getCachedVerification);
  const [syncError, setSyncError] = useState(null);
  const [checking, setChecking] = useState(false);

  const sync = useCallback(async () => {
    try {
      const v = await getMyVerification();
      setVerification(v);
      setSyncError(null);
      if (v.status === "approved") window.location.replace("/app");
    } catch (err) {
      setSyncError(err);
    }
  }, []);

  const check = async () => {
    setChecking(true);
    await sync();
    setChecking(false);
  };

  useEffect(() => {
    sync();
    const timer = setInterval(() => document.visibilityState === "visible" && sync(), POLL_MS);
    const onFocus = () => sync();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [sync]);

  const rejected = verification.status === "rejected";

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="flex items-center justify-between px-5 py-4 sm:px-8">
        <Logo imgClassName="h-7" />
        <Button size="s" variant="outline" onClick={onLogout}>Sign out</Button>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pb-12 pt-4 sm:pt-8">
        <section className="flex w-full max-w-[640px] flex-col gap-6 rounded-[24px] border border-line bg-surface p-5 sm:p-8">
          <div className="flex items-start gap-4">
            <span className={`inline-flex size-12 shrink-0 items-center justify-center rounded-full ${rejected ? "bg-danger-soft text-live" : "bg-warn-soft text-warn"}`}>
              <Icon name={rejected ? "alert" : "clock"} size="lg" />
            </span>
            <div className="flex flex-col gap-1.5">
              <h1 className="text-2xl font-extrabold leading-8 text-fg">
                {rejected ? "Your registration needs changes" : "Your registration is awaiting approval"}
              </h1>
              <p className="text-sm leading-5 text-fg-2">
                {rejected
                  ? "An administrator couldn't verify your enrollment with the information you sent. Read the reason below, fix it and resubmit."
                  : "An administrator is checking your student ID and document. You'll get access to TANAWAR as soon as it's approved, usually within 1–2 working days. This page updates on its own."}
              </p>
            </div>
          </div>

          {rejected && (
            <div role="note" className="flex flex-col gap-1 rounded-xl border border-live/25 bg-danger-soft px-4 py-3">
              <p className="text-[13px] font-bold leading-[18px] text-live">Reason from the administrator</p>
              <p className="whitespace-pre-line text-sm leading-5 text-fg">{verification.rejectionReason || "No reason was given. Please check your details and document, then resubmit."}</p>
            </div>
          )}

          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-xl bg-surface-2 px-4 py-3.5 text-sm sm:grid-cols-2">
            <Detail label="Full name" value={verification.fullName} />
            <Detail label="Student ID" value={verification.matricule} />
            {verification.documentType && <Detail label="Document" value={documentTypeLabel(verification.documentType)} />}
            {verification.submittedAt && <Detail label="Submitted" value={fmt(verification.submittedAt)} />}
            {verification.reviewedAt && <Detail label="Reviewed" value={fmt(verification.reviewedAt)} />}
            <Detail label="Status" value={rejected ? "Changes requested" : "Pending review"} />
          </dl>

          {syncError && (
            <p role="status" className="flex items-start gap-2 text-[13px] leading-[18px] text-fg-2">
              <Icon name="alert" size="sm" className="mt-px text-warn" />
              {syncError.code === "NOT_CONFIGURED"
                ? "The server isn't connected yet, so this shows the last status we know."
                : `We couldn't refresh your status: ${syncError.message}`}
            </p>
          )}

          {rejected ? (
            <ResubmitForm initial={verification} onDone={setVerification} />
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <Button size="s" variant="outline" onClick={check} disabled={checking} aria-busy={checking}>
                <Icon name={checking ? "loader" : "flip"} size="sm" className={checking ? "animate-spin" : ""} />
                {checking ? "Checking…" : "Check again"}
              </Button>
              <p className="text-[13px] text-fg-3">Questions? Contact the TANAWAR administrators at your faculty.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs font-semibold text-fg-3">{label}</dt>
      <dd className="font-semibold text-fg">{value || "—"}</dd>
    </div>
  );
}

function ResubmitForm({ initial, onDone }) {
  const [values, setValues] = useState({ fullName: initial.fullName ?? "", matricule: initial.matricule ?? "", documentType: initial.documentType ?? "student_card", document: null });
  const [touched, setTouched] = useState({});
  const [serverErrors, setServerErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const nameRef = useRef(null);

  const errors = { ...validateVerification(values), ...serverErrors };
  const shown = Object.fromEntries(Object.entries(errors).filter(([k]) => touched[k] || serverErrors[k]));

  const change = (field, value) => {
    setValues((v) => ({ ...v, [field]: value }));
    setServerErrors(({ [field]: _drop, ...rest }) => rest);
    setFormError("");
  };

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setTouched(Object.fromEntries(VERIFICATION_FIELDS.map((f) => [f, true])));
    const first = VERIFICATION_FIELDS.find((f) => errors[f]);
    if (first) return first === "fullName" ? nameRef.current?.focus() : document.getElementsByName(first)[0]?.focus();

    setLoading(true);
    try {
      onDone(await resubmitVerification({ ...values, fullName: values.fullName.trim().replace(/\s+/g, " ") }));
    } catch (err) {
      if (err?.details?.field) setServerErrors({ [err.details.field]: err.message });
      else if (err?.details?.fields) setServerErrors(err.details.fields);
      else setFormError(err?.code === "NOT_CONFIGURED" ? "Resubmitting will be possible once the server is connected." : err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4 border-t border-line pt-6">
      <h2 className="text-lg font-extrabold text-fg">Resubmit your verification</h2>
      {formError && (
        <div role="alert" className="flex items-start gap-2 rounded-[10px] border border-live/25 bg-danger-soft px-3 py-2.5 text-[13px] font-semibold leading-[18px] text-live">
          <Icon name="alert" size="sm" className="mt-px" />
          <span>{formError}</span>
        </div>
      )}
      <VerificationFields ref={nameRef} values={values} errors={shown} onChange={change} onBlur={(f) => setTouched((t) => ({ ...t, [f]: true }))} disabled={loading} />
      <Button type="submit" size="m" disabled={loading} aria-busy={loading} className="w-full sm:w-auto sm:self-end">
        {loading ? (
          <>
            <Icon name="loader" size="sm" className="animate-spin" />
            Submitting…
          </>
        ) : (
          "Resubmit for review"
        )}
      </Button>
    </form>
  );
}
