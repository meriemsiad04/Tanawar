import { useState } from "react";
import logoMark from "../../assets/logo/logo.svg";
import Icon from "../uiC/Icon.jsx";

/** Admin navigation. Keys match the sidebar key App.jsx gives each /admin route (see ADMIN_ROUTES there). */
const ADMIN_NAV = [
  {
    label: "Overview",
    items: [{ key: "dashboard", label: "Overview", icon: "dashboard", href: "/admin" }],
  },
  {
    label: "Community",
    items: [
      { key: "students", label: "Students & Verification", icon: "userCheck", href: "/admin/registrations" },
      { key: "sessions", label: "Sessions", icon: "calendar", href: "/admin/sessions" },
      { key: "study", label: "Study With Me", icon: "lamp", href: "/admin/study" },
      { key: "resources", label: "Resources", icon: "books", href: "/admin/resources" },
      { key: "reports", label: "Reports & Moderation", icon: "flag", href: "/admin/reports" },
    ],
  },
  {
    label: "Platform",
    items: [
      { key: "academic", label: "Academic Management", icon: "cap", href: "/admin/modules" },
      { key: "announcements", label: "Announcements & Feedback", icon: "megaphone", href: "/admin/announcements" },
      { key: "analytics", label: "Analytics", icon: "chartLine", href: "/admin/analytics" },
    ],
  },
  {
    label: "Administration",
    items: [
      { key: "settings", label: "Settings", icon: "gear", href: "/admin/settings" },
      { key: "admins", label: "Admin Management & Activity Logs", icon: "logs", href: "/admin/admins" },
    ],
  },
];

const COLLAPSED_KEY = "tanawar.adminSidebarCollapsed";
const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
};

/**
 * Admin navigation rail: light surface, grouped links, solid blue pill for the active item.
 * From lg it is 288px wide and can be collapsed to a 76px icon rail (remembered in this browser);
 * below lg it is always the icon rail. `active` is the item key; `counts` maps item keys to badge numbers.
 */
export default function AdminSidebar({ active = "dashboard", user, onLogout, counts = {} }) {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const wide = !collapsed;
  /** Classes that apply only while the sidebar is expanded on lg+ screens. */
  const lg = (cls) => (wide ? cls : "");

  const toggle = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, c ? "0" : "1");
      } catch {
        /* private mode: the choice just isn't remembered */
      }
      return !c;
    });
  };

  return (
    <aside className={`sticky top-0 flex h-screen w-[76px] shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 motion-reduce:transition-none ${lg("lg:w-[288px]")}`}>
      <a
        href="/admin"
        aria-label="TANAWAR admin home"
        className={`flex h-[72px] shrink-0 items-center justify-center gap-2.5 border-b border-line px-3 short:h-16 ${lg("lg:justify-start lg:px-6")}`}
      >
        <img src={logoMark} alt="" className="h-8 w-auto" />
        <span className={`hidden whitespace-nowrap text-xl font-extrabold tracking-wide text-fg ${lg("lg:inline")}`}>
          TANAWAR<span className="text-success">·admin</span>
        </span>
      </a>

      <nav aria-label="Admin navigation" className={`flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-4 [scrollbar-width:thin] short:py-3 ${lg("lg:px-4")}`}>
        {ADMIN_NAV.map((group, i) => (
          <div key={group.label} className="flex flex-col gap-1">
            {i > 0 && <div aria-hidden="true" className={`mx-2 my-2 border-t border-line ${lg("lg:hidden")}`} />}
            {i > 0 && (
              <p className={`hidden px-3 pb-1 pt-3 text-xs font-bold uppercase tracking-[0.14em] text-fg-3 short:pt-2 ${lg("lg:block")}`}>{group.label}</p>
            )}
            {group.items.map(({ key, label, icon, href }) => {
              const count = counts[key];
              const isActive = key === active;
              return (
                <a
                  key={key}
                  href={href}
                  title={label}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative flex min-h-11 shrink-0 items-center justify-center gap-3 rounded-full px-3 text-[15px] font-semibold leading-5 transition-colors short:min-h-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${lg("lg:justify-start lg:rounded-2xl lg:px-4 lg:py-2")} ${
                    isActive ? "bg-primary text-white shadow-sm" : "text-fg hover:bg-success-soft hover:text-success-ink"
                  }`}
                >
                  <Icon name={icon} />
                  <span className={`sr-only ${lg("lg:not-sr-only lg:min-w-0 lg:flex-1")}`}>{label}</span>
                  {count ? (
                    <span
                      aria-label={`${count} pending`}
                      className={`absolute right-1 top-1 rounded-full px-[5px] text-[10px] font-bold leading-4 ${lg("lg:static lg:px-[7px] lg:py-0.5 lg:text-xs")} ${
                        isActive ? "bg-white text-primary" : "bg-success text-white"
                      }`}
                    >
                      {count > 99 ? "99+" : count}
                    </span>
                  ) : null}
                </a>
              );
            })}
          </div>
        ))}
      </nav>

      <div className={`flex shrink-0 flex-col items-center justify-center gap-1 border-t border-line p-3 ${lg("lg:flex-row lg:justify-start lg:gap-1 lg:py-4 lg:pl-5 lg:pr-3 short:lg:py-2.5")}`}>
        <div className={`hidden min-w-0 flex-1 ${lg("lg:block")}`}>
          <p className="truncate text-sm font-bold leading-5 text-fg">{user?.fullName ?? "Admin"}</p>
          <p className="truncate text-sm leading-5 text-fg-2">Administrator</p>
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={wide}
          aria-label={wide ? "Collapse sidebar" : "Expand sidebar"}
          title={wide ? "Collapse sidebar" : "Expand sidebar"}
          className="hidden h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 lg:flex"
        >
          <Icon name={wide ? "panelClose" : "panelOpen"} />
        </button>
        <button
          type="button"
          onClick={onLogout}
          aria-label="Log out"
          title="Log out"
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <Icon name="logout" />
        </button>
      </div>
    </aside>
  );
}
