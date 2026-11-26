import { DEMO_MODE } from "../../services/demoMode.js";
import { useEffect, useRef, useState } from "react";
import googleMark from "../../assets/brand/google-g.svg";

/**
 * "Continue with Google" for sign-in and sign-up.
 *
 * - VITE_GOOGLE_CLIENT_ID set → Google Identity Services renders Google's official button; on success
 *   `onCredential(idToken)` receives the ID token, which the backend verifies (POST /auth/google).
 * - Not set, dev build → a look-alike button that simulates a Google account (`demo-google:<email>`),
 *   handled by the dev demo registry. Not set, production → disabled, with an explanation.
 */
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";
const GIS_SRC = "https://accounts.google.com/gsi/client";

let gisPromise;
function loadGis() {
  gisPromise ??= new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve(window.google);
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => {
      gisPromise = undefined;
      reject(new Error("Couldn't load Google sign-in. Check your connection and try again."));
    };
    document.head.appendChild(script);
  });
  return gisPromise;
}

// GIS keeps one global callback; route it to whichever button is mounted.
let activeHandler = null;
let initialized = false;

export default function GoogleAuthButton({ onCredential, onError, disabled = false, text = "continue" }) {
  const slotRef = useRef(null);
  const [failed, setFailed] = useState("");
  const label = text === "signup" ? "Sign up with Google" : "Continue with Google";

  useEffect(() => {
    activeHandler = { onCredential, onError };
  });

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;
    loadGis()
      .then((google) => {
        if (cancelled || !slotRef.current) return;
        if (!initialized) {
          google.accounts.id.initialize({
            client_id: CLIENT_ID,
            ux_mode: "popup",
            callback: (res) => (res?.credential ? activeHandler?.onCredential(res.credential) : activeHandler?.onError?.(new Error("Google sign-in was cancelled."))),
          });
          initialized = true;
        }
        const dark = document.documentElement.classList.contains("dark");
        const width = Math.max(220, Math.min(400, Math.round(slotRef.current.offsetWidth || 400)));
        slotRef.current.replaceChildren();
        google.accounts.id.renderButton(slotRef.current, {
          type: "standard",
          theme: dark ? "filled_black" : "outline",
          size: "large",
          shape: "rectangular",
          text: text === "signup" ? "signup_with" : "continue_with",
          logo_alignment: "center",
          width,
        });
      })
      .catch((err) => !cancelled && setFailed(err.message));
    return () => {
      cancelled = true;
    };
  }, [text]);

  if (CLIENT_ID && !failed) {
    return (
      <div className={`flex min-h-11 justify-center ${disabled ? "pointer-events-none opacity-50" : ""}`} aria-busy={disabled || undefined}>
        <div ref={slotRef} className="w-full" />
      </div>
    );
  }

  const devDemo = Boolean(DEMO_MODE) && !CLIENT_ID;
  const simulate = () => {
    const email = window.prompt("Dev demo: which Google account? (no real Google sign-in happens)", "student.demo@gmail.com");
    if (email?.trim()) onCredential(`demo-google:${email.trim().toLowerCase()}`);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={devDemo ? simulate : undefined}
        disabled={disabled || !devDemo}
        className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2.5 rounded-[10px] border border-line-strong bg-surface px-4 text-sm font-bold text-fg transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <img src={googleMark} alt="" aria-hidden="true" className="size-[18px]" />
        {label}
        {devDemo && <span className="font-normal text-fg-3">(dev demo)</span>}
      </button>
      {(failed || !devDemo) && (
        <p className="text-center text-xs leading-4 text-fg-3">{failed || "Google sign-in isn't available yet. Use your email instead."}</p>
      )}
    </div>
  );
}
