import { useEffect, useRef, useState } from "react";
import AuthLayout from "../../layouts/AuthLayout.jsx";
import Button from "../../Components/uiC/Button.jsx";
import Icon from "../../Components/uiC/Icon.jsx";
import Input from "../../Components/uiC/Input.jsx";
import GoogleAuthButton from "../../Components/sharedC/GoogleAuthButton.jsx";
import VerificationFields from "../../Components/sharedC/VerificationFields.jsx";
import { EMAIL_PATTERN, PASSWORD_MIN, VERIFY_PATH, signInWithGoogle, signUp } from "../../services/authService.js";
import { VERIFICATION_FIELDS, validateVerification } from "../../services/verificationService.js";

const ACCOUNT_FIELDS = ["email", "password", "confirm"];

function validateAccount({ email, password, confirm }) {
  const errors = {};
  if (!email.trim()) errors.email = "Enter your email address.";
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = "Enter a valid email address (e.g. name@example.com).";
  if (!password) errors.password = "Choose a password.";
  else if (password.length < PASSWORD_MIN) errors.password = `Use at least ${PASSWORD_MIN} characters.`;
  else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) errors.password = "Use at least one letter and one number.";
  if (!confirm) errors.confirm = "Repeat your password.";
  else if (confirm !== password) errors.confirm = "The passwords don't match.";
  return errors;
}

const TITLES = {
  account: { title: "Create your account", subtitle: "Step 1 of 2 · Choose how you'll sign in." },
  verify: { title: "Verify you're a UMBB student", subtitle: "Step 2 of 2 · An administrator reviews every registration." },
  done: { title: "Registration submitted", subtitle: "One last step on our side." },
};

/**
 * Sign-up pop-up. Two ways in (email + password, or Google), one verification step for both:
 * full name, matricule and a student card / enrollment certificate. The account is created as
 * "pending" and the student can't use the platform until an admin approves it.
 *
 * Props:
 *  - open / onClose
 *  - google          optional { registrationToken, profile: { email, fullName } } when sign-in with Google found
 *                    no account (opens straight on the verification step)
 *  - onSignIn        switch to the sign-in pop-up
 *  - onSignedIn(user) an existing Google account signed in from here
 * Mount with a fresh `key` per opening so each sign-up starts clean.
 */
export default function Register({ open, onClose, google: googleProp, onSignIn, onSignedIn }) {
  const [google, setGoogle] = useState(googleProp ?? null);
  const [step, setStep] = useState(googleProp ? "verify" : "account");
  const [values, setValues] = useState({
    email: "",
    password: "",
    confirm: "",
    fullName: googleProp?.profile?.fullName ?? "",
    matricule: "",
    documentType: "student_card",
    document: null,
    consent: false,
  });
  const [touched, setTouched] = useState({});
  const [serverErrors, setServerErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const firstFieldRef = useRef(null);
  const nameRef = useRef(null);
  const doneRef = useRef(null);

  // Move focus to the start of each step (AuthLayout only focuses on open).
  useEffect(() => {
    if (!open) return;
    (step === "account" ? firstFieldRef : step === "verify" ? nameRef : doneRef).current?.focus();
  }, [step, open]);

  const errors = {
    ...(step === "account" && !google ? validateAccount(values) : {}),
    ...(step === "verify" ? validateVerification(values) : {}),
    ...(step === "verify" && !values.consent ? { consent: "Please confirm before submitting." } : {}),
    ...serverErrors,
  };
  const shown = Object.fromEntries(Object.entries(errors).filter(([k]) => touched[k] || serverErrors[k]));

  const change = (field, value) => {
    setValues((v) => ({ ...v, [field]: value }));
    setServerErrors(({ [field]: _drop, ...rest }) => rest);
    setFormError("");
  };
  const blur = (field) => setTouched((t) => ({ ...t, [field]: true }));

  const onGoogle = async (credential) => {
    setLoading(true);
    setFormError("");
    try {
      const res = await signInWithGoogle(credential);
      if (res.user) return onSignedIn?.(res.user); // already registered: just sign in
      setGoogle({ registrationToken: res.registrationToken, profile: res.profile });
      setValues((v) => ({ ...v, fullName: v.fullName || res.profile?.fullName || "" }));
      setTouched({});
      setStep("verify");
    } catch (err) {
      setFormError(err?.message || "Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const continueWithEmail = (e) => {
    e.preventDefault();
    setTouched((t) => ({ ...t, ...Object.fromEntries(ACCOUNT_FIELDS.map((f) => [f, true])) }));
    const found = validateAccount(values);
    const first = ACCOUNT_FIELDS.find((f) => found[f] || serverErrors[f]);
    if (first) return document.getElementsByName(first)[0]?.focus();
    setStep("verify");
  };

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setTouched((t) => ({ ...t, ...Object.fromEntries([...VERIFICATION_FIELDS, "consent"].map((f) => [f, true])) }));
    const first = [...VERIFICATION_FIELDS, "consent"].find((f) => errors[f]);
    if (first) {
      if (first === "fullName") nameRef.current?.focus();
      else document.getElementsByName(first)[0]?.focus();
      return;
    }

    setLoading(true);
    setFormError("");
    try {
      await signUp({
        method: google ? "google" : "email",
        email: google ? undefined : values.email.trim(),
        password: google ? undefined : values.password,
        registrationToken: google?.registrationToken,
        fullName: values.fullName.trim().replace(/\s+/g, " "),
        matricule: values.matricule,
        documentType: values.documentType,
        document: values.document,
      });
      setStep("done");
    } catch (err) {
      const field = err?.details?.field;
      const fields = err?.details?.fields;
      if (fields && Object.keys(fields).length) {
        setServerErrors(fields);
        if (Object.keys(fields).some((f) => ACCOUNT_FIELDS.includes(f)) && !google) setStep("account");
      } else if (field) {
        setServerErrors({ [field]: err.message });
        if (ACCOUNT_FIELDS.includes(field) && !google) setStep("account");
      } else {
        setFormError(err?.message || "Something went wrong. Please try again.");
      }
      if (err?.code === "REGISTRATION_TOKEN_EXPIRED") {
        setGoogle(null);
        setStep("account");
      }
    } finally {
      setLoading(false);
    }
  };

  const alert = formError && (
    <div role="alert" className="flex items-start gap-2 rounded-[10px] border border-live/25 bg-danger-soft px-3 py-2.5 text-[13px] font-semibold leading-[18px] text-live">
      <Icon name="alert" size="sm" className="mt-px" />
      <span>{formError}</span>
    </div>
  );

  const signInLink = (
    <p className="pt-1 text-center text-[13px] leading-[18px] text-fg-2">
      Already have an account?{" "}
      <button type="button" onClick={onSignIn} disabled={loading} className="cursor-pointer font-bold text-primary-text hover:underline focus-visible:underline focus-visible:outline-none">
        Sign in
      </button>
    </p>
  );

  return (
    <AuthLayout open={open} onClose={onClose} busy={loading} {...TITLES[step]}>
      {step === "account" && (
        <form noValidate onSubmit={continueWithEmail} className="flex flex-col gap-4 px-5 pb-5 pt-5 sm:px-6">
          {alert}
          <GoogleAuthButton text="signup" onCredential={onGoogle} onError={(err) => setFormError(err.message)} disabled={loading} />

          <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-fg-3" aria-hidden="true">
            <span className="h-px flex-1 bg-line" /> or with email <span className="h-px flex-1 bg-line" />
          </div>

          <Input
            ref={firstFieldRef}
            label="Email"
            icon="globe"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            value={values.email}
            onChange={(e) => change("email", e.target.value)}
            onBlur={() => blur("email")}
            error={shown.email}
            disabled={loading}
            required
          />
          <Input
            label="Password"
            icon="lock"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder={`At least ${PASSWORD_MIN} characters`}
            value={values.password}
            onChange={(e) => change("password", e.target.value)}
            onBlur={() => blur("password")}
            error={shown.password}
            disabled={loading}
            required
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="-mr-1 inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-fg-3 transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <Icon name={showPassword ? "eyeOff" : "eye"} size="sm" />
              </button>
            }
          />
          <Input
            label="Confirm password"
            icon="lock"
            name="confirm"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Repeat your password"
            value={values.confirm}
            onChange={(e) => change("confirm", e.target.value)}
            onBlur={() => blur("confirm")}
            error={shown.confirm}
            disabled={loading}
            required
          />

          <Button type="submit" size="m" disabled={loading} className="w-full">
            Continue
          </Button>
          {signInLink}
        </form>
      )}

      {step === "verify" && (
        <form noValidate onSubmit={submit} className="flex flex-col gap-4 px-5 pb-5 pt-5 sm:px-6">
          {alert}
          {google && (
            <p className="flex items-center gap-2 rounded-[10px] bg-surface-2 px-3 py-2 text-[13px] leading-[18px] text-fg-2">
              <Icon name="userCheck" size="sm" className="text-primary-text" />
              <span className="min-w-0 truncate">
                Google account: <b className="text-fg">{google.profile?.email}</b>
              </span>
            </p>
          )}

          <VerificationFields ref={nameRef} values={values} errors={shown} onChange={change} onBlur={blur} disabled={loading} />

          <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-[18px] text-fg-2">
            <input
              type="checkbox"
              name="consent"
              checked={values.consent}
              onChange={(e) => {
                change("consent", e.target.checked);
                blur("consent");
              }}
              disabled={loading}
              aria-invalid={shown.consent ? true : undefined}
              className="mt-0.5 size-4 shrink-0 cursor-pointer rounded accent-primary"
            />
            <span>
              I confirm this information is accurate and agree that TANAWAR administrators review my document to verify my enrollment.
              {shown.consent && <span className="mt-1 block text-xs font-semibold text-live">{shown.consent}</span>}
            </span>
          </label>

          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {!google && (
              <Button variant="outline" size="m" onClick={() => setStep("account")} disabled={loading} className="sm:w-auto">
                Back
              </Button>
            )}
            <Button type="submit" size="m" disabled={loading} aria-busy={loading} className="flex-1">
              {loading ? (
                <>
                  <Icon name="loader" size="sm" className="animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit for review"
              )}
            </Button>
          </div>
          {signInLink}
        </form>
      )}

      {step === "done" && (
        <div className="flex flex-col items-center gap-4 px-5 pb-6 pt-6 text-center sm:px-6">
          <span className="inline-flex size-14 items-center justify-center rounded-full bg-warn-soft text-warn">
            <Icon name="clock" size="lg" />
          </span>
          <div className="flex flex-col gap-1.5">
            <p className="text-base font-extrabold text-fg">Your registration is awaiting admin approval</p>
            <p className="text-sm leading-5 text-fg-2">
              An administrator will check your student ID and document, usually within 1–2 working days. You can sign in at any time
              to see where things stand; if something needs fixing, you'll see why and can resubmit.
            </p>
          </div>
          <Button ref={doneRef} size="m" className="w-full" onClick={() => window.location.assign(VERIFY_PATH)}>
            See my registration status
          </Button>
        </div>
      )}
    </AuthLayout>
  );
}
