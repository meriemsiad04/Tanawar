import AdminSidebar from "../Components/layoutC/AdminSidebar.jsx";
import Avatar from "../Components/uiC/Avatar.jsx";
import ThemeToggle from "../Components/layoutC/ThemeToggle.jsx";
import LangSwitch from "../Components/layoutC/LangSwitch.jsx";
import { DEMO_MODE } from "../config/demo.js";
import { useAsync } from "../hooks/useAsync.js";
import { getAdminCounts } from "../services/adminDashboardService.js";

const initialsOf = (name = "") =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

/**
 * Admin shell: collapsible sidebar + sticky app bar, same structure as StudentLayout.
 * Takes `children` for now (no router yet); swap to <Outlet /> when react-router is added.
 * Sidebar badges (pending work) load here; if the counts can't be loaded the badges are simply not shown.
 */
export default function AdminLayout({ active, user, onLogout, children }) {
  const { data } = useAsync(getAdminCounts);
  const counts = {
    students: data?.pendingVerifications,
    sessions: data?.pendingSessionApprovals,
    reports: data?.unresolvedReports,
  };
  return (
    <div className="flex min-h-screen bg-bg">
      <AdminSidebar active={active} user={user} onLogout={onLogout} counts={counts} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-[72px] shrink-0 items-center gap-3 border-b border-line bg-surface px-6 short:h-16 xl:px-8">
          {DEMO_MODE && (
            <span className="rounded-full bg-highlight px-2.5 py-1 text-xs font-bold text-[#2a2000]" title="No backend yet: data is simulated in this browser.">
              Demo data
            </span>
          )}
          <div className="flex-1" />
          <div className="flex items-center gap-2 [&_button]:border-line [&_button]:text-fg [&_button:hover]:bg-surface-2">
            <LangSwitch />
            <ThemeToggle />
          </div>
          <div className="flex shrink-0 items-center gap-2.5 p-1">
            <Avatar initials={initialsOf(user?.fullName)} size={40} />
            <div className="hidden flex-col xl:flex">
              <span className="whitespace-nowrap text-sm font-bold leading-5 text-fg">{user?.fullName}</span>
              <span className="whitespace-nowrap text-[13px] leading-[19px] text-fg-2">Administrator</span>
            </div>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-6 pb-14 pt-6 short:gap-5 short:pt-5 xl:px-8 xl:pt-8 short:xl:pt-5">{children}</main>
      </div>
    </div>
  );
}
