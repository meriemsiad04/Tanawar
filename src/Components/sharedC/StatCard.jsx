/** One KPI of the landing stats band: tinted icon tile + big number + label. */
import Icon from "../uiC/Icon.jsx";
import CountUp from "../motion/CountUp.jsx";

/** `icon` is an Icon name; `tone` the tile background; `iconClassName` the icon colour. */
export default function StatCard({
  icon,
  tone = "bg-accent-soft",
  iconClassName = "text-accent-ink",
  value,
  label,
}) {
  return (
    <div className="flex min-w-0 items-center gap-4">
      <div
        className={`flex size-[50px] shrink-0 items-center justify-center rounded-[14px] ${tone}`}
      >
        <Icon name={icon} size="md" className={iconClassName} />
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-[28px] font-extrabold leading-8 tracking-[-0.01em] text-fg">
          <CountUp value={value} />
        </p>
        <p className="text-[13px] leading-[19px] text-fg-2">{label}</p>
      </div>
    </div>
  );
}
