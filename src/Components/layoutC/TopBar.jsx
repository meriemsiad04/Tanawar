import Icon from "../uiC/Icon.jsx";
import Avatar from "../uiC/Avatar.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import LangSwitch from "./LangSwitch.jsx";

// Enter in the app-bar search opens the Sessions page filtered by the query.
const goSearch = (e) => {
  e.preventDefault();
  const q = new FormData(e.currentTarget).get("q")?.toString().trim();
  if (q) window.location.assign(`/app/sessions?q=${encodeURIComponent(q)}`);
};

/** Student app bar: search (→ Sessions), language, notifications, user chip. */
export default function TopBar({ user, notifications = 0, onSearch }) {
  return (
    <header className="sticky top-0 z-30 flex h-[72px] shrink-0 items-center gap-3 border-b border-line bg-surface px-6 short:h-16 xl:px-8">
      <form role="search" onSubmit={goSearch} className="w-full min-w-0 max-w-[520px]">
        <label className="flex h-11 items-center gap-2.5 rounded-xl bg-surface-2 px-3.5 text-fg-3 focus-within:ring-2 focus-within:ring-primary/40">
          <Icon name="search" size="sm" />
          <input
            type="search"
            name="q"
            aria-label="Search sessions"
            placeholder="Search sessions, modules, hosts"
            onChange={(e) => onSearch?.(e.target.value)}
            className="w-full bg-transparent text-[15px] leading-[23px] text-fg outline-none placeholder:text-fg-3"
          />
        </label>
      </form>

      <div className="flex-1" />

      {/* Controls reuse the landing pills, tinted for the light bar. */}
      <div className="flex items-center gap-2 [&_button]:border-line [&_button]:text-fg [&_button:hover]:bg-surface-2">
        <LangSwitch />
        <ThemeToggle />
      </div>

      <a
        href="/app/notifications"
        aria-label={`Notifications (${notifications} unread)`}
        className="relative flex size-11 cursor-pointer items-center justify-center rounded-xl border border-line text-fg transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <Icon name="bell" />
        {notifications > 0 && (
          <span className="absolute left-[25px] top-0.5 rounded-full border-2 border-surface bg-live px-[5px] py-px text-xs font-bold leading-4 text-white">
            {notifications}
          </span>
        )}
      </a>

      <a
        href="/app/profile"
        aria-label="Open your profile"
        className="flex shrink-0 items-center gap-2.5 rounded-xl p-1 transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <Avatar initials={user.initials} src={user.avatarUrl} size={40} />
        <div className="hidden flex-col xl:flex">
          <span className="flex items-center gap-[5px] whitespace-nowrap text-sm font-bold leading-5 text-fg">
            {user.name}
            <Icon name="check" size="sm" label="Verified" className="size-[15px] text-primary" />
          </span>
          <span className="whitespace-nowrap text-[13px] leading-[19px] text-fg-2">{user.meta}</span>
        </div>
      </a>
    </header>
  );
}
