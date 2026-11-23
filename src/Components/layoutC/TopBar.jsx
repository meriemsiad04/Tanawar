import Icon from "../uiC/Icon.jsx";
import Avatar from "../uiC/Avatar.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import LangSwitch from "./LangSwitch.jsx";

/** Student app bar: search, language, notifications, user chip. */
export default function TopBar({ user, notifications = 0, onSearch }) {
  return (
    <header className="flex h-[72px] shrink-0 items-center gap-3 border-b border-line bg-surface px-8">
      <label className="flex h-11 w-full max-w-[520px] items-center gap-2.5 rounded-xl bg-surface-2 px-3.5 text-fg-3 focus-within:ring-2 focus-within:ring-primary/40">
        <Icon name="search" size="sm" />
        <input
          type="search"
          placeholder="Search sessions, modules, resources"
          onChange={(e) => onSearch?.(e.target.value)}
          className="w-full bg-transparent text-[15px] leading-[23px] text-fg outline-none placeholder:text-fg-3"
        />
      </label>

      <div className="flex-1" />

      {/* Controls reuse the landing pills, tinted for the light bar. */}
      <div className="flex items-center gap-2 [&_button]:border-line [&_button]:text-fg [&_button:hover]:bg-surface-2">
        <LangSwitch />
        <ThemeToggle />
      </div>

      <button
        type="button"
        aria-label={`Notifications (${notifications} unread)`}
        className="relative flex size-11 cursor-pointer items-center justify-center rounded-xl border border-line text-fg transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <Icon name="bell" />
        {notifications > 0 && (
          <span className="absolute left-[25px] top-0.5 rounded-full border-2 border-surface bg-live px-[5px] py-px text-xs font-bold leading-4 text-white">
            {notifications}
          </span>
        )}
      </button>

      <div className="flex items-center gap-2.5">
        <Avatar initials={user.initials} size={40} />
        <div className="flex flex-col">
          <span className="flex items-center gap-[5px] text-sm font-bold leading-5 text-fg">
            {user.name}
            <Icon name="check" size="sm" label="Verified" className="size-[15px] text-primary" />
          </span>
          <span className="text-[13px] leading-[19px] text-fg-2">{user.meta}</span>
        </div>
      </div>
    </header>
  );
}
