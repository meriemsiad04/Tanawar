import Button from "../uiC/Button.jsx";
import Logo from "../uiC/Logo.jsx";
import LangSwitch from "./LangSwitch.jsx";
import ThemeToggle from "./ThemeToggle.jsx";

const LINKS = [
  { label: "How it works", href: "#how" },
  { label: "Features", href: "#features" },
  { label: "Languages", href: "#languages" },
];

/** Landing top navigation (dark band). */
export default function Navbar({ onSignIn, onSignUp }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-ink">
      <div className="mx-auto grid h-[76px] w-full max-w-[1440px] grid-cols-[1fr_auto] items-center gap-3 px-6 md:grid-cols-[1fr_auto_1fr] md:gap-4 lg:px-16">
      <a href="#top" aria-label="TANAWAR home" className="shrink-0 justify-self-start">
        <Logo variant="onDark" imgClassName="h-7 sm:h-9" />
      </a>

      <nav aria-label="Main" className="hidden gap-7 lg:gap-9 text-[15px] leading-[23px] text-on-dark-2 md:flex">
        {LINKS.map(({ label, href }) => (
          <a
            key={href}
            href={href}
            className="relative py-1 transition-colors duration-200 hover:text-white focus-visible:text-white after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-highlight after:transition-transform after:duration-200 after:ease-out hover:after:scale-x-100 focus-visible:outline-none focus-visible:after:scale-x-100"
          >
            {label}
          </a>
        ))}
      </nav>

      <div className="flex items-center gap-2 justify-self-end sm:gap-3">
        <ThemeToggle />
        <LangSwitch />
        {onSignUp && (
          <Button variant="ghostDark" size="s" onClick={onSignUp} aria-haspopup="dialog" className="hidden sm:inline-flex">
            Sign up
          </Button>
        )}
        <Button variant="amber" size="s" onClick={onSignIn} aria-haspopup="dialog">
          Sign in
        </Button>
      </div>
      </div>
    </header>
  );
}
