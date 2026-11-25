import StudentSidebar from "../Components/layoutC/StudentSidebar.jsx";
import TopBar from "../Components/layoutC/TopBar.jsx";
import { useNavCounts } from "../hooks/useNavCounts.js";

/**
 * Student shell: fixed-width ink sidebar + sticky app bar; the content column takes the remaining width.
 * Takes `children` for now (no router yet); swap to <Outlet /> when react-router is added.
 * Badge numbers (unread notifications, bookings) are loaded here with useNavCounts.
 */
export default function StudentLayout({ active, user, onLogout, children }) {
  const counts = useNavCounts();
  return (
    <div className="flex min-h-screen bg-bg">
      <StudentSidebar active={active} user={user} onLogout={onLogout} counts={counts} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar user={user} />
        {/* Capped and centred so wide monitors (1920px+) don't stretch rows edge to edge. */}
        <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-6 pb-14 pt-6 short:gap-5 short:pt-5 xl:px-8 xl:pt-8 short:xl:pt-5">{children}</main>
      </div>
    </div>
  );
}
