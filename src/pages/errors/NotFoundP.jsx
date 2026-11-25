import Icon from "../../Components/uiC/Icon.jsx";

/** 404: shown inside the current layout for an address that doesn't exist. `home` is where "Back" goes. */
export default function NotFoundP({ home = "/app" }) {
  return (
    <section className="mx-auto flex w-full max-w-[520px] flex-col items-center gap-4 py-16 text-center">
      <span className="flex size-16 items-center justify-center rounded-[20px] bg-accent-soft text-accent-ink">
        <Icon name="compass" size="lg" />
      </span>
      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-fg-3">Error 404</p>
      <h1 className="font-serif text-[30px] font-bold leading-[38px] text-fg">This page doesn’t exist</h1>
      <p className="text-[15px] leading-[23px] text-fg-2">The link may be broken, or the page may have moved. Check the address or go back to your dashboard.</p>
      <a
        href={home}
        className="mt-2 inline-flex h-[46px] items-center justify-center gap-2 rounded-xl bg-primary px-[22px] text-[15px] font-bold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
      >
        Back to dashboard
      </a>
    </section>
  );
}
