import Icon from "../uiC/Icon.jsx";

const VARIANTS = {
  default: {
    card: "bg-surface border border-line",
    tile: "bg-accent-soft",
    icon: "text-accent-ink",
    title: "text-fg",
    body: "text-fg-2",
    tag: "",
  },
  accent: {
    card: "bg-accent",
    tile: "bg-white/[.16]",
    icon: "text-white",
    title: "text-white",
    body: "text-white/[.92]",
    tag: "bg-white/[.18] text-white",
  },
  primary: {
    card: "bg-primary",
    tile: "bg-white/[.16]",
    icon: "text-white",
    title: "text-white",
    body: "text-white/[.92]",
    tag: "bg-white/[.18] text-white",
  },
};

/** Feature card. variant: "default" (white) | "accent" | "primary". Tags are styled for the coloured variants. */
export default function FeatureCard({ icon, title, children, tags = [], variant = "default" }) {
  const v = VARIANTS[variant] ?? VARIANTS.default;
  return (
    <article className={`flex flex-col items-start gap-2.5 rounded-3xl p-7 ${v.card}`}>
      <div className={`flex size-12 items-center justify-center rounded-[14px] ${v.tile}`}>
        <Icon name={icon} size="md" className={v.icon} />
      </div>
      <div className="h-3" aria-hidden="true" />
      <h3 className={`text-xl font-bold leading-6 ${v.title}`}>{title}</h3>
      <p className={`text-[15px] leading-[23px] ${v.body}`}>{children}</p>
      {tags.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <li
              key={tag}
              className={`rounded-full px-3 py-[5px] text-[13px] font-semibold leading-[18px] ${v.tag}`}
            >
              {tag}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
