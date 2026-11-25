/** Language option card (code chip + name + tagline). `selected` adds the accent 2px border. */
export default function LangCard({ code, language, tagline, selected = false }) {
  return (
    <div
      className={`flex w-full items-center justify-between gap-4 rounded-[18px] bg-surface px-[22px] py-5 ${
        selected ? "border-2 border-accent" : "border border-line"
      }`}
    >
      <div className="flex flex-col gap-1">
        <p className="text-[17px] font-bold leading-6 text-fg">{language}</p>
        <p className="text-[15px] leading-[23px] text-fg-2">{tagline}</p>
      </div>
      <span className="flex size-[46px] shrink-0 items-center justify-center rounded-xl bg-ink text-sm dark:bg-ink-2 font-bold text-white">
        {code}
      </span>
    </div>
  );
}
