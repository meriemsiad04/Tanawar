import StudentSidebar from "../Components/layoutC/StudentSidebar.jsx";
import TopBar from "../Components/layoutC/TopBar.jsx";
import { useNavCounts } from "../hooks/useNavCounts.js";

/**
 * Student shell: ink sidebar + app bar around the page.
 * Takes `children` for now (no router yet); swap to <Outlet /> when react-router is added.
 * Badge numbers (unread notifications, bookings) are loaded here with useNavCounts.
 */
export default function StudentLayout({ active, user, onLogout, children }) {
  const counts = useNavCounts();
  return (
    <div className="flex min-h-screen bg-bg">
      <StudentSidebar active={active} user={user} onLogout={onLogout} counts={counts} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar user={user} notifications={counts.notifications} />
        <main className="flex flex-col gap-6 px-8 pb-14 pt-8">{children}</main>
      </div>
    </div>
  );
}
