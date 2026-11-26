import PublicLayout from "./layouts/PublicLayout.jsx";
import StudentLayout from "./layouts/StudentLayout.jsx";
import LandingPage from "./pages/public/LandingPage.jsx";
import Dashboard from "./pages/Student/Dashboard.jsx";
import ClassroomP from "./pages/Student/ClassroomP.jsx";
import ExploreSP from "./pages/Student/sessions/ExploreSP.jsx";
import MySessionsP from "./pages/Student/sessions/MySessionsP.jsx";
import RecommendationsP from "./pages/Student/RecommendationsP.jsx";
import ResourcesP from "./pages/Student/ResourcesP.jsx";
import ConnectionsP from "./pages/Student/ConnectionsP.jsx";
import SettingP from "./pages/Student/SettingP.jsx";
import NotfP from "./pages/Student/NotfP.jsx";
import ActivityP from "./pages/Student/ActivityP.jsx";
import StudyRoomsP from "./pages/Student/study/StudyRoomsP.jsx";
import StudyRoomP from "./pages/Student/study/StudyRoomP.jsx";
import HelpP from "./pages/Student/HelpP.jsx";
import ModulesP from "./pages/Student/ModulesP.jsx";
import ClassroomsP from "./pages/Student/ClassroomsP.jsx";
import ProfileP from "./pages/Student/Profile/ProfileP.jsx";
import EditorProfileP from "./pages/Student/Profile/EditorProfileP.jsx";
import StudentProfileP from "./pages/Student/Profile/StudentProfileP.jsx";
import VerificationStatusP from "./pages/Student/VerificationStatusP.jsx";
import NotFoundP from "./pages/errors/NotFoundP.jsx";
import AdminLayout from "./layouts/AdminLayout.jsx";
import RegistrationsP from "./pages/admin/RegistrationsP.jsx";
import AdminDashboardP from "./pages/admin/DashboardP.jsx";
import ApprovalSP from "./pages/admin/ApprovalSP.jsx";
import ManagementSP from "./pages/admin/ManagementSP.jsx";
import UserManagementP from "./pages/admin/UserManagementP.jsx";
import ResourcesModerationP from "./pages/admin/ResourcesModerationP.jsx";
import AdminModulesP from "./pages/admin/ModulesP.jsx";
import ReportsP from "./pages/admin/ReportsP.jsx";
import AdminSettingP from "./pages/admin/AdminSettingP.jsx";
import StudyWithMeAdminP from "./pages/admin/StudyWithMeAdminP.jsx";
import AnnouncementsP from "./pages/admin/AnnouncementsP.jsx";
import AnalyticsP from "./pages/admin/AnalyticsP.jsx";
import AdminManagementP from "./pages/admin/AdminManagementP.jsx";
import { HOME_BY_ROLE, VERIFY_PATH, clearSession, enforceAccountAccess, getSession, isVerified } from "./services/authService.js";

const SETUP_PATH = "/app/profile/setup";

// Admin area: path → [sidebar key (ADMIN_NAV in AdminSidebar), page]. Admin home is /admin (HOME_BY_ROLE.admin).
const ADMIN_ROUTES = {
  "/admin": ["dashboard", AdminDashboardP],
  "/admin/registrations": ["students", RegistrationsP],
  "/admin/users": ["directory", UserManagementP],
  "/admin/sessions": ["sessions", ManagementSP],
  "/admin/sessions/approvals": ["sessions", ApprovalSP],
  "/admin/study": ["study", StudyWithMeAdminP],
  "/admin/resources": ["resources", ResourcesModerationP],
  "/admin/reports": ["reports", ReportsP],
  "/admin/modules": ["academic", AdminModulesP],
  "/admin/announcements": ["announcements", AnnouncementsP],
  "/admin/analytics": ["analytics", AnalyticsP],
  "/admin/settings": ["settings", AdminSettingP],
  "/admin/admins": ["admins", AdminManagementP],
};

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
  const role = session?.user?.role;

  // Admin area. The role check here is UX only: the server must reject non-admins on every /admin/* endpoint.
  if (path.startsWith("/admin") && session?.user) {
    if (role !== "admin") {
      window.location.replace(HOME_BY_ROLE.student);
      return null;
    }
    const [active, Page] = ADMIN_ROUTES[path] ?? ["", null];
    return (
      <AdminLayout active={active} user={session.user} onLogout={handleLogout}>
        {Page ? <Page /> : <NotFoundP home="/admin" />}
      </AdminLayout>
    );
  }

  if (path.startsWith("/app") && session?.user) {
    // Suspended / banned accounts are signed out (the server refuses them too; this covers the dev stand-in).
    if (enforceAccountAccess()) return null;
    if (role === "admin") {
      window.location.replace(HOME_BY_ROLE.admin);
      return null;
    }
    // Verification gate: until an admin approves the registration, the student only sees its status.
    if (!isVerified(session.user)) {
      if (path !== VERIFY_PATH) {
        window.location.replace(VERIFY_PATH);
        return null;
      }
      return <VerificationStatusP onLogout={handleLogout} />;
    }
    if (path === VERIFY_PATH) {
      window.location.replace("/app");
      return null;
    }

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
      level,
      name: fullName?.split(" ")[0] ?? "",
      initials: initialsOf(fullName),
      avatarUrl,
      meta: [field, level].filter(Boolean).join(" · "),
    };
    const page =
      path === "/app/profile" ? { key: "profile", node: <ProfileP /> }
      : path === "/app/profile/edit" ? { key: "profile", node: <EditorProfileP mode="edit" /> }
      : path === "/app/sessions" ? { key: "explore", node: <ExploreSP user={user} /> }
      : path === "/app/bookings" ? { key: "bookings", node: <MySessionsP /> }
      : path === "/app/recommendations" ? { key: "recommendations", node: <RecommendationsP /> }
      : path === "/app/resources" ? { key: "resources", node: <ResourcesP /> }
      : path === "/app/connections" || path === "/app/students" ? { key: "connections", node: <ConnectionsP /> }
      : path.startsWith("/app/students/") ? { key: "connections", node: <StudentProfileP key={path} studentId={decodeURIComponent(path.slice("/app/students/".length))} /> }
      : path === "/app/settings" ? { key: "settings", node: <SettingP /> }
      : path === "/app/activity" ? { key: "activity", node: <ActivityP /> }
      : path === "/app/study" ? { key: "study", node: <StudyRoomsP user={user} /> }
      : path.startsWith("/app/study/") ? { key: "study", node: <StudyRoomP key={path} roomId={decodeURIComponent(path.slice("/app/study/".length))} /> }
      : path === "/app/notifications" ? { key: "notifications", node: <NotfP /> }
      : path === "/app/help" ? { key: "help", node: <HelpP /> }
      : path === "/app/modules" ? { key: "", node: <ModulesP /> }
      : path === "/app/classrooms" ? { key: "classrooms", node: <ClassroomsP /> }
      : path.startsWith("/app/classroom/") ? { key: "dashboard", node: <ClassroomP key={path} sessionId={decodeURIComponent(path.slice("/app/classroom/".length))} /> }
      : path === "/app" ? { key: "dashboard", node: <Dashboard user={user} /> }
      : { key: "", node: <NotFoundP /> };
    return (
      <StudentLayout active={page.key} user={user} onLogout={handleLogout}>
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
