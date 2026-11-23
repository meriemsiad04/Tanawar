import Icon from "../uiC/Icon.jsx";

/** Dashboard KPI: soft icon tile, big number, label. */
export default function KpiCard({ icon, value, label }) {
  return (
    <div className="flex flex-1 flex-col gap-1 rounded-[18px] border border-line bg-surface p-[18px]">
      <div className="mb-1.5 flex size-10 items-center justify-center rounded-xl bg-accent-soft">
        <Icon name={icon} className="text-accent-ink" />
      </div>
      <p className="text-2xl font-extrabold leading-[30px] tracking-[-0.01em] text-fg">{value}</p>
      <p className="text-[13px] leading-[19px] text-fg-2">{label}</p>
    </div>
  );
}
