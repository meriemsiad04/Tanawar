import Logo from "../uiC/Logo.jsx";
import Icon from "../uiC/Icon.jsx";

const GROUPS = [
  {
    label: "Learn",
    items: [
      { key: "dashboard", label: "Dashboard", icon: "home", href: "/app" },
      { key: "explore", label: "Sessions", icon: "compass", href: "/app/sessions" },
      { key: "recommendations", label: "For you", icon: "spark", href: "/app/recommendations" },
      { key: "bookings", label: "My bookings", icon: "calendar", href: "/app/bookings", count: 2 },
    ],
  },
  {
    label: "Connect",
    items: [
      { key: "resources", label: "Resources", icon: "books", href: "/app/resources" },
      { key: "connections", label: "Connections", icon: "users", href: "/app/connections" },
      {key:"classrooms", label:"Classrooms", icon:"video", href:"/app/classrooms"},
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

/** Student navigation rail (ink background). `active` is the item key. */
export default function StudentSidebar({ active = "dashboard", user, onLogout }) {
  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col justify-between overflow-y-auto bg-ink px-4 py-5">
      <nav aria-label="Student navigation" className="flex flex-col gap-1">
        <a href="/app" className="pb-5 pl-2 pt-1">
          <Logo variant="onDark" imgClassName="h-7" />
        </a>

        {GROUPS.map((group) => (
          <div key={group.label} className="flex flex-col gap-1">
            <p className="pb-1.5 pl-2.5 pt-3.5 text-xs font-extrabold uppercase leading-4 tracking-[0.14em] text-[#a9a3f0]">
              {group.label}
            </p>
            {group.items.map(({ key, label, icon, href, count }) => {
              const isActive = key === active;
              return (
                <a
                  key={key}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold leading-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
                    isActive
                      ? "bg-accent text-white"
                      : "text-[#dcdafb] hover:bg-white/10"
                  }`}
                >
                  <Icon name={icon} />
                  <span className="min-w-0 flex-1">{label}</span>
                  {count ? (
                    <span className="rounded-full bg-highlight px-[7px] py-0.5 text-xs font-bold leading-4 text-[#2a2000]">
                      {count}
                    </span>
                  ) : null}
                </a>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3">
        <div className="min-w-0 flex-1">
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
