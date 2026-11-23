import StudentSidebar from "../Components/layoutC/StudentSidebar.jsx";
import TopBar from "../Components/layoutC/TopBar.jsx";

/**
 * Student shell: ink sidebar + app bar around the page.
 * Takes `children` for now (no router yet); swap to <Outlet /> when react-router is added.
 */
export default function StudentLayout({ active, user, notifications, onLogout, children }) {
  return (
    <div className="flex min-h-screen bg-bg">
      <StudentSidebar active={active} user={user} onLogout={onLogout} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar user={user} notifications={notifications} />
        <main className="flex flex-col gap-6 px-8 pb-14 pt-8">{children}</main>
      </div>
    </div>
  );
}
