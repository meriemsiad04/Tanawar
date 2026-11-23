import { useState } from "react";
import Navbar from "../Components/layoutC/Navbar.jsx";
import Footer from "../Components/layoutC/Footer.jsx";
import Login from "../pages/auth/Login.jsx";
import { HOME_BY_ROLE } from "../services/authService.js";
import { SignInContext } from "../hooks/useSignIn.js";

/**
 * Public layout: landing navbar + footer around the page, plus the sign-in pop-up.
 * Takes `children` for now (no router installed yet); swap to <Outlet /> when react-router is added.
 */
export default function PublicLayout({ children }) {
  const [signInOpen, setSignInOpen] = useState(false);
  const openSignIn = () => setSignInOpen(true);

  // No router yet: a full navigation to the role's home. Replace with navigate() once routes exist.
  const handleSignedIn = (user) => {
    setSignInOpen(false);
    window.location.assign(HOME_BY_ROLE[user?.role] ?? HOME_BY_ROLE.student);
  };

  return (
    <div id="top" className="flex min-h-screen flex-col bg-bg">
      <Navbar onSignIn={openSignIn} />
      <SignInContext.Provider value={openSignIn}>
        <main className="flex-1">{children}</main>
      </SignInContext.Provider>
      <Footer onSignIn={openSignIn} />

      <Login
        open={signInOpen}
        onClose={() => setSignInOpen(false)}
        onSuccess={handleSignedIn}
      />
    </div>
  );
}
