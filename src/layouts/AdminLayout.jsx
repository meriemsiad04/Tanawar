import Logo from "../Components/uiC/Logo.jsx";
import Button from "../Components/uiC/Button.jsx";

/**
 * Admin shell. TEMPORARY minimal version (logo + sign out) so the registration review queue is usable now.
 * The admin dashboard will replace this with AdminSidebar + its pages; keep the `children` contract
 * (or swap to <Outlet /> when react-router is added).
 */
export default function AdminLayout({ user, onLogout, children }) {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-40 border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-3 px-5 py-3 sm:px-8">
          <div className="flex items-center gap-3">
            <Logo imgClassName="h-7" />
            <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent-ink">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            {user?.fullName && <span className="hidden text-sm font-semibold text-fg-2 sm:inline">{user.fullName}</span>}
            <Button size="s" variant="outline" onClick={onLogout}>Sign out</Button>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-5 pb-14 pt-6 sm:px-8">{children}</main>
    </div>
  );
}
