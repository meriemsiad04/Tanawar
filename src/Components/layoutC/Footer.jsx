import logoV from "../../assets/logo/logoV.svg";

const COLUMNS = [
  {
    title: "Platform",
    links: [
      { label: "How it works", href: "#how" },
      { label: "Features", href: "#features" },
      { label: "Languages", href: "#languages" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Create account", href: "#" },
      { label: "Sign in", action: "signIn" },
      { label: "Forgot password", href: "#" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help center", href: "#" },
      { label: "Report a problem", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
];

export default function Footer({ onSignIn }) {
  const actions = { signIn: onSignIn };

  return (
    <footer className="flex flex-col pt-[88px]">
      <div className="flex flex-col justify-between gap-10 border-t border-line px-6 py-10 md:flex-row lg:px-16">
        <div className="flex flex-col items-start gap-3">
          <img src={logoV} alt="TANAWAR" className="h-9 w-auto" />
          <p className="max-w-[300px] text-[13px] leading-[19px] text-fg-2">
            Peer-to-peer learning platform for the students of the University of
            Boumerdès.
          </p>
        </div>

        <div className="flex flex-wrap gap-x-16 gap-y-8">
          {COLUMNS.map(({ title, links }) => (
            <div key={title} className="flex flex-col items-start gap-2.5">
              <p className="text-sm font-bold leading-5 text-fg">{title}</p>
              {links.map(({ label, href, action }) =>
                action ? (
                  <button
                    key={label}
                    type="button"
                    onClick={actions[action]}
                    aria-haspopup="dialog"
                    className="cursor-pointer text-[13px] leading-[19px] text-fg-2 transition-colors hover:text-primary-text"
                  >
                    {label}
                  </button>
                ) : (
                  <a
                    key={label}
                    href={href}
                    className="text-[13px] leading-[19px] text-fg-2 transition-colors hover:text-primary-text"
                  >
                    {label}
                  </a>
                )
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col justify-between gap-2 px-6 pb-8 text-fg-3 sm:flex-row lg:px-16">
        <p className="text-[13px] leading-[19px]">© 2026 TANAWAR · UMBB</p>
        <p className="text-xs font-bold leading-4">developed by: TANAWAR Team</p>
      </div>
    </footer>
  );
}
