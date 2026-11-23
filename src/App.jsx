import PublicLayout from "./layouts/PublicLayout.jsx";
import StudentLayout from "./layouts/StudentLayout.jsx";
import LandingPage from "./pages/public/LandingPage.jsx";
import Dashboard from "./pages/Student/Dashboard.jsx";
import ProfileP from "./pages/Student/Profile/ProfileP.jsx";
import EditorProfileP from "./pages/Student/Profile/EditorProfileP.jsx";
import { clearSession, getSession } from "./services/authService.js";

const SETUP_PATH = "/app/profile/setup";

function handleLogout() {
  clearSession();
  window.location.assign("/");
}

const initialsOf = (name = "") =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

// No router installed yet: pick the screen from the path (student home is /app, see HOME_BY_ROLE).
// /app needs a session; otherwise the landing page is shown (sign in from there).
export default function App() {
  const session = getSession();
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (path.startsWith("/app") && session?.user) {
    // Mandatory first-login step: nothing else in /app is reachable until the profile is complete.
    const needsSetup = !session.user.profileCompleted;
    if (needsSetup && path !== SETUP_PATH) {
      window.location.replace(SETUP_PATH);
      return null;
    }
    if (needsSetup) return <EditorProfileP mode="setup" onLogout={handleLogout} />;
    if (path === SETUP_PATH) {
      window.location.replace("/app");
      return null;
    }

    const { fullName, field, level, avatarUrl } = session.user;
    const user = {
      fullName,
      name: fullName?.split(" ")[0] ?? "",
      initials: initialsOf(fullName),
      avatarUrl,
      meta: [field, level].filter(Boolean).join(" · "),
    };
    const page =
      path === "/app/profile" ? { key: "profile", node: <ProfileP /> }
      : path === "/app/profile/edit" ? { key: "profile", node: <EditorProfileP mode="edit" /> }
      : { key: "dashboard", node: <Dashboard user={user} /> };
    return (
      <StudentLayout active={page.key} user={user} notifications={2} onLogout={handleLogout}>
        {page.node}
      </StudentLayout>
    );
  }
  return (
    <PublicLayout>
      <LandingPage />
    </PublicLayout>
  );
}
