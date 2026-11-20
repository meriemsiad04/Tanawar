import { useRef, useState } from "react";
import AuthLayout from "../../layouts/AuthLayout.jsx";
import Button from "../../Components/uiC/Button.jsx";
import Icon from "../../Components/uiC/Icon.jsx";
import Input from "../../Components/uiC/Input.jsx";
import { MATRICULE_PATTERN, signIn } from "../../services/authService.js";

function validate({ matricule, password }) {
  const errors = {};
  if (!matricule) errors.matricule = "Enter your matricule.";
  else if (!MATRICULE_PATTERN.test(matricule))
    errors.matricule = "A matricule contains only digits (e.g. 202131012345).";
  if (!password) errors.password = "Enter your password.";
  return errors;
}

/**
 * Sign-in pop-up (Figma "02 · Sign in"), Matricule + Password.
 * Props:
 *  - open / onClose      modal visibility
 *  - onSuccess(user)     called after the backend accepts the credentials (handles the redirect)
 *  - onCreateAccount / onForgotPassword   footer + inline links
 */
export default function Login({ open, onClose, onSuccess, onCreateAccount, onForgotPassword }) {
  const [values, setValues] = useState({ matricule: "", password: "", remember: true });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [formError, setFormError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const matriculeRef = useRef(null);
  const passwordRef = useRef(null);

  const reset = () => {
    setValues((v) => ({ matricule: "", password: "", remember: v.remember }));
    setErrors({});
    setTouched({});
    setFormError("");
    setShowPassword(false);
  };

  const close = () => {
    reset();
    onClose?.();
  };

  const update = (field) => (e) => {
    let value = field === "remember" ? e.target.checked : e.target.value;
    if (field === "matricule") value = value.replace(/\s+/g, "");
    const next = { ...values, [field]: value };
    setValues(next);
    setFormError("");
    // Re-validate live only once the field has been visited, so users aren't nagged while typing.
    if (touched[field]) setErrors(validate(next));
  };

  const blur = (field) => () => {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors(validate(values));
  };
   //handles errors whenn authentication fails 
   //incorrect psw / matricule not found / server error
  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const found = validate(values);
    setErrors(found);
    setTouched({ matricule: true, password: true });
    if (found.matricule) return matriculeRef.current?.focus();
    if (found.password) return passwordRef.current?.focus();

    setLoading(true);
    setFormError("");
    try {
      const user = await signIn(values);
      reset();
      onSuccess?.(user);
    } catch (err) {
      setFormError(err?.message || "Something went wrong. Please try again.");
      setValues((v) => ({ ...v, password: "" }));
      passwordRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      open={open}
      onClose={close}
      busy={loading}
      title="Welcome to TANAWAR"
      subtitle="Sign in with your UMBB student account."
    >
      <form noValidate onSubmit={submit} className="flex flex-col gap-4 px-5 pb-5 pt-5 sm:px-6">
        {formError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-[10px] border border-live/25 bg-danger-soft px-3 py-2.5 text-[13px] font-semibold leading-[18px] text-live"
          >
            <Icon name="alert" size="sm" className="mt-px" />
            <span>{formError}</span>
          </div>
        )}

        <Input
          ref={matriculeRef}
          label="Matricule"
          icon="idCard"
          name="matricule"
          inputMode="numeric"
          autoComplete="username"
          placeholder="e.g. 202131012345"
          maxLength={14}
          value={values.matricule}
          onChange={update("matricule")}
          onBlur={blur("matricule")}
          error={touched.matricule ? errors.matricule : undefined}
          disabled={loading}
          required
        />

        <Input
          ref={passwordRef}
          label="Password"
          icon="lock"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          placeholder="••••••••"
          value={values.password}
          onChange={update("password")}
          onBlur={blur("password")}
          error={touched.password ? errors.password : undefined}
          disabled={loading}
          required
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              disabled={loading}
              className="-mr-1 inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-fg-3 transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed"
            >
              <Icon name={showPassword ? "eyeOff" : "eye"} size="sm" />
            </button>
          }
        />

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] leading-[18px] text-fg-2">
            <input
              type="checkbox"
              checked={values.remember}
              onChange={update("remember")}
              disabled={loading}
              className="size-4 cursor-pointer rounded accent-primary"
            />
            Keep me signed in on this device
          </label>
          <button
            type="button"
            onClick={onForgotPassword}
            className="cursor-pointer text-[13px] font-bold leading-[18px] text-primary-text hover:underline focus-visible:underline focus-visible:outline-none"
          >
            Forgot password?
          </button>
        </div>

        <Button type="submit" size="m" disabled={loading} aria-busy={loading} className="w-full">
          {loading ? (
            <>
              <Icon name="loader" size="sm" className="animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>

        <p className="pt-1 text-center text-[13px] leading-[18px] text-fg-2">
          New to TANAWAR? {" "}
          <a href="/faq" className="font-bold text-primary-text hover:underline focus-visible:underline focus-visible:outline-none">
            read more
          </a>
        </p>
      </form>
    </AuthLayout>
  );
}
