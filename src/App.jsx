import PublicLayout from "./layouts/PublicLayout.jsx";
import StudentLayout from "./layouts/StudentLayout.jsx";
import LandingPage from "./pages/public/LandingPage.jsx";
import Dashboard from "./pages/Student/Dashboard.jsx";
import { clearSession, getSession } from "./services/authService.js";

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
  if (window.location.pathname.startsWith("/app") && session?.user) {
    const { fullName, field, level } = session.user;
    const user = {
      fullName,
      name: fullName?.split(" ")[0] ?? "",
      initials: initialsOf(fullName),
      meta: [field, level].filter(Boolean).join(" · "),
    };
    return (
      <StudentLayout active="dashboard" user={user} notifications={2} onLogout={handleLogout}>
        <Dashboard user={user} />
      </StudentLayout>
    );
  }
  return (
    <PublicLayout>
      <LandingPage />
    </PublicLayout>
  );
}
