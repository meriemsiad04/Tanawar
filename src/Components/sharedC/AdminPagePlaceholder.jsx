import Icon from "../uiC/Icon.jsx";

/** Header + "not built yet" card for admin pages whose content doesn't exist yet. Delete once every admin page is built. */
export default function AdminPagePlaceholder({ title, description, icon = "dashboard", planned = [] }) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="font-serif text-[30px] font-bold leading-[38px] tracking-[-0.005em] text-fg">{title}</h1>
        {description && <p className="text-[15px] leading-[23px] text-fg-2">{description}</p>}
      </div>
      <section className="flex flex-col items-center gap-3 rounded-[20px] border border-dashed border-line bg-surface px-6 py-14 text-center">
        <span className="flex size-14 items-center justify-center rounded-[18px] bg-accent-soft text-accent-ink">
          <Icon name={icon} size="lg" />
        </span>
        <h2 className="text-lg font-extrabold leading-6 text-fg">Coming soon</h2>
        {planned.length > 0 && (
          <ul className="flex max-w-md flex-col gap-1 text-sm leading-6 text-fg-2">
            {planned.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
