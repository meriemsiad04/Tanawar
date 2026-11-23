import Icon from "../uiC/Icon.jsx";

/** "How it works" step: icon tile (`icon` = Icon name), faded step number, title, description. */
export default function StepCard({ icon, number, title, children }) {
  return (
    <article className="flex flex-col gap-3 rounded-[22px] border border-line bg-surface p-[26px]">
      <div className="flex items-start justify-between">
        <div className="flex size-12 items-center justify-center rounded-[14px] bg-accent-soft">
          <Icon name={icon} size="md" className="text-accent-ink" />
        </div>
        <span
          aria-hidden="true"
          className="text-[50px] font-extrabold leading-[50px] tracking-[-0.01em] text-surface-2"
        >
          {number}
        </span>
      </div>
      <h3 className="text-[17px] font-bold leading-6 text-fg">{title}</h3>
      <p className="text-[15px] leading-[23px] text-fg-2">{children}</p>
    </article>
  );
}
