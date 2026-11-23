import useTilt from "../../../hooks/useTilt.js";
import Icon from "../../../Components/uiC/Icon.jsx";
import SessionCard from "../../../Components/sharedC/SessionCard.jsx";

const EXAMPLE_META = [
  { icon: "calendar", iconClassName: "text-accent", label: "Today" },
  { icon: "clock", iconClassName: "text-accent", label: "12:30 · 60 min" },
  { icon: "video", iconClassName: "text-primary", label: "Online classroom" },
  { icon: "users", iconClassName: "text-primary", label: "3 seats left" },
];

export default function HeroSessionPreview() {
  const { containerRef, targetRef } = useTilt({ max: 6 });

  return (
    <div ref={containerRef} className="w-full max-w-[520px] shrink-0">
      <div
        ref={targetRef}
        className="relative pb-10 will-change-transform lg:pb-0"
        style={{ transformStyle: "preserve-3d" }}
      >
      <div
        className="rounded-[28px] border border-white/[.12] bg-white/[.06] p-4"
        style={{
          boxShadow:
            "var(--tilt-sx, 0px) var(--tilt-sy, 12px) 40px -8px rgba(0,0,0,.35)",
          transition: "box-shadow 200ms ease-out",
        }}
      >
        <SessionCard
          module="Bases de données · L3"
          title="Jointures SQL et normalisation (1NF → BCNF)"
          host={{
            initials: "HA",
            name: "HAMZI Abdelhak",
            meta: "Informatique · ING4 · ★ 4.9 (87 ratings)",
          }}
          meta={EXAMPLE_META}
          seatsPercent={75}
          ctaLabel="Sign up to join"
        />
      </div>

      <div className="absolute bottom-0 left-4 flex items-center gap-3 rounded-2xl bg-surface px-4 py-3.5 shadow-pop sm:-left-[18px]">
        <Icon name="pin" size="lg" className="text-primary" />
        <div className="flex flex-col gap-0.5 whitespace-nowrap">
          <p className="text-sm font-bold leading-5 text-fg">Bloc 5 · Salle 12</p>
          <p className="text-[13px] leading-[19px] text-fg-2">
            On-site at 14:00 · 6 seats left
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
