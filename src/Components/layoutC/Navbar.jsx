import Button from "../uiC/Button.jsx";
import Logo from "../uiC/Logo.jsx";
import LangSwitch from "./LangSwitch.jsx";

const LINKS = [
  { label: "How it works", href: "#how" },
  { label: "Features", href: "#features" },
  { label: "Languages", href: "#languages" },
];

/** Landing top navigation (dark band). */
export default function Navbar({ onSignIn, onCreateAccount }) {
  return (
    <header className="sticky top-0 z-50 flex h-[76px] w-full items-center justify-between gap-4 border-b border-white/10 bg-ink px-6 lg:px-16">
      <a href="#top" aria-label="TANAWAR home" className="shrink-0">
        <Logo variant="onDark" />
      </a>

      <nav aria-label="Main" className="hidden gap-9 text-[15px] leading-[23px] text-on-dark-2 md:flex">
        {LINKS.map(({ label, href }) => (
          <a
            key={href}
            href={href}
            className="transition-colors hover:text-white focus-visible:text-white focus-visible:outline-none"
          >
            {label}
          </a>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        <LangSwitch />
        {/* Hide on a wrapper: Button sets its own display, so `hidden` on it would lose. */}
        <div className="hidden sm:block">
          <Button variant="ghostDark" size="s" onClick={onSignIn}>
            Sign in
          </Button>
        </div>
        <Button variant="amber" size="s" onClick={onCreateAccount}>
          Create account
        </Button>
      </div>
    </header>
  );
}
