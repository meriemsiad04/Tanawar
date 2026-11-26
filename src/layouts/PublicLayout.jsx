import { useEffect, useState } from "react";
import Navbar from "../Components/layoutC/Navbar.jsx";
import Footer from "../Components/layoutC/Footer.jsx";
import Login from "../pages/auth/Login.jsx";
import Register from "../pages/auth/Register.jsx";
import Icon from "../Components/uiC/Icon.jsx";
import { HOME_BY_ROLE, clearAccountNotice, readAccountNotice } from "../services/authService.js";
import { SignInContext, SignUpContext } from "../hooks/useSignIn.js";

/**
 * Public layout: landing navbar + footer around the page, plus the sign-in and sign-up pop-ups.
 * Takes `children` for now (no router installed yet); swap to <Outlet /> when react-router is added.
 */
export default function PublicLayout({ children }) {
  // Only one auth pop-up at a time. `registerKey` gives each sign-up a fresh form.
  const [modal, setModal] = useState(null); // null | "signIn" | "signUp"
  const [registerKey, setRegisterKey] = useState(0);
  const [googleSignUp, setGoogleSignUp] = useState(null);
  // Set when an admin suspended / banned the account and the session was ended (authService).
  const [accountNotice, setAccountNotice] = useState(readAccountNotice);
  useEffect(clearAccountNotice, []); // shown once: a reload doesn't bring it back

  const openSignIn = () => setModal("signIn");
  const openSignUp = (google = null) => {
    setGoogleSignUp(google);
    setRegisterKey((k) => k + 1);
    setModal("signUp");
  };
  const close = () => setModal(null);

  // No router yet: a full navigation to the role's home. Replace with navigate() once routes exist.
  // Unverified students land on their status screen through the gate in App.jsx.
  const handleSignedIn = (user) => {
    setModal(null);
    window.location.assign(HOME_BY_ROLE[user?.role] ?? HOME_BY_ROLE.student);
  };

  return (
    <div id="top" className="flex min-h-screen flex-col bg-bg">
      <Navbar onSignIn={openSignIn} onSignUp={() => openSignUp()} />
      {accountNotice && (
        <div role="alert" className="mx-auto mt-4 flex w-[calc(100%-2rem)] max-w-3xl items-start gap-2 rounded-xl border border-live/25 bg-danger-soft px-4 py-3 text-sm font-semibold text-live">
          <Icon name="alert" size="sm" className="mt-px" />
          <span className="flex-1">You were signed out. {accountNotice}</span>
          <button type="button" onClick={() => setAccountNotice(null)} aria-label="Dismiss" className="cursor-pointer rounded opacity-70 hover:opacity-100">
            <Icon name="close" size="sm" />
          </button>
        </div>
      )}
      <SignInContext.Provider value={openSignIn}>
        <SignUpContext.Provider value={() => openSignUp()}>
          <main className="flex-1">{children}</main>
        </SignUpContext.Provider>
      </SignInContext.Provider>
      <Footer onSignIn={openSignIn} />

      <Login
        open={modal === "signIn"}
        onClose={close}
        onSuccess={handleSignedIn}
        onCreateAccount={() => openSignUp()}
        onGoogleRegistration={(google) => openSignUp(google)}
      />
      <Register
        key={registerKey}
        open={modal === "signUp"}
        google={googleSignUp}
        onClose={close}
        onSignIn={openSignIn}
        onSignedIn={handleSignedIn}
      />
    </div>
  );
}
