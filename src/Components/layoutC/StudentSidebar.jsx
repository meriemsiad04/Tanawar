import Logo from "../uiC/Logo.jsx";
import Icon from "../uiC/Icon.jsx";

const GROUPS = [
  {
    label: "Learn",
    items: [
      { key: "dashboard", label: "Dashboard", icon: "home", href: "/app" },
      { key: "explore", label: "Sessions", icon: "compass", href: "/app/sessions" },
      { key: "recommendations", label: "For you", icon: "spark", href: "/app/recommendations" },
      { key: "bookings", label: "My bookings", icon: "calendar", href: "/app/bookings" },
    ],
  },
  {
    label: "Connect",
    items: [
      { key: "resources", label: "Resources", icon: "books", href: "/app/resources" },
      { key: "connections", label: "Connections", icon: "users", href: "/app/connections" },
      {key:"classrooms", label:"Classrooms", icon:"video", href:"/app/classrooms"},
      // Unread count shares the bell's store (useNavCounts → useNotifications), so both update together. Red like the bell.
      { key: "notifications", label: "Notifications", icon: "bell", href: "/app/notifications", alert: true },
      { key: "profile", label: "Profile", icon: "user", href: "/app/profile" },
    ],
  },
  {
    label: "Support",
    items: [
      { key: "help", label: "Help", icon: "flame", href: "/app/help" },
      { key: "settings", label: "Settings", icon: "gear", href: "/app/settings" },
    ],  
  },
];

/**
 * Student navigation rail (ink background). `active` is the item key; `counts` maps item keys to badge numbers.
 * One fixed width (240px) on every laptop/desktop so the main column always gets the rest;
 * only below lg (tablets) it collapses to an icon rail, with labels kept as tooltips and for screen readers.
 * The links scroll on their own so the account card (log out) stays visible on short screens.
 */
export default function StudentSidebar({ active = "dashboard", user, onLogout, counts = {} }) {
  return (
    <aside className="sticky top-0 flex h-screen w-[76px] shrink-0 flex-col gap-4 bg-ink px-3 py-5 short:gap-3 short:py-4 lg:w-60 lg:px-4">
      <a href="/app" aria-label="TANAWAR home" className="flex shrink-0 justify-center pt-1 lg:justify-start lg:pl-2">
        {/* Icon rail: crop the lockup to its mark (first 51 of 293 units). */}
        <span className="block w-[23px] overflow-hidden lg:w-auto">
          <Logo variant="onDark" imgClassName="h-7 max-w-none" />
        </span>
      </a>

      <nav aria-label="Student navigation" className="-mx-1 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-1 [scrollbar-color:rgb(255_255_255/0.2)_transparent] [scrollbar-width:thin]">
        {GROUPS.map((group) => (
          <div key={group.label} className="flex flex-col gap-1">
            <div aria-hidden="true" className="mx-2 mb-1 mt-3 border-t border-white/10 lg:hidden" />
            <p className="hidden pb-1.5 pl-2.5 pt-3.5 text-xs font-extrabold uppercase leading-4 tracking-[0.14em] text-[#a9a3f0] short:pb-1 short:pt-2 lg:block">
              {group.label}
            </p>
            {group.items.map(({ key, label, icon, href, alert }) => {
              const count = counts[key];
              const isActive = key === active;
              return (
                <a
                  key={key}
                  href={href}
                  title={label}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative flex h-11 shrink-0 items-center justify-center gap-3 rounded-xl px-3 text-sm font-bold leading-5 transition-colors short:h-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 lg:justify-start ${
                    isActive
                      ? "bg-accent text-white"
                      : "text-[#dcdafb] hover:bg-white/10"
                  }`}
                >
                  <Icon name={icon} />
                  <span className="sr-only lg:not-sr-only lg:min-w-0 lg:flex-1 lg:truncate">{label}</span>
                  {count ? (
                    <span
                      className={`absolute right-1 top-1 rounded-full px-[5px] text-[10px] font-bold leading-4 lg:static lg:px-[7px] lg:py-0.5 lg:text-xs ${
                        alert ? "bg-live text-white" : "bg-highlight text-[#2a2000]"
                      }`}
                    >
                      {alert && count > 9 ? "9+" : count}
                      {alert && <span className="sr-only"> unread</span>}
                    </span>
                  ) : null}
                </a>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="flex shrink-0 items-center justify-center gap-3 rounded-2xl bg-white/10 p-1.5 lg:justify-start lg:px-4 lg:py-3 short:lg:py-2">
        <div className="hidden min-w-0 flex-1 lg:block">
          <p className="truncate text-sm font-bold leading-5 text-white">
            {user?.fullName ?? "Guest"}
          </p>
          {user?.meta ? (
            <p className="truncate text-sm leading-5 text-[#a9a3f0]">{user.meta}</p>
          ) : null}
        </div>
        {user ? (
          <button
            type="button"
            onClick={onLogout}
            aria-label="Log out"
            title="Log out"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#dcdafb] transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            <Icon name="logout" />
          </button>
        ) : (
          <a
            href="/"
            className="rounded-lg px-3 py-1.5 text-sm font-bold text-white hover:bg-white/10"
          >
            Log in
          </a>
        )}
      </div>
    </aside>
  );
}
