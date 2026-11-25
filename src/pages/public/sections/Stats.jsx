import Reveal from "../../../Components/motion/Reveal.jsx";
import StatCard from "../../../Components/sharedC/StatCard.jsx";

const STATS = [
  { icon: "cap", tone: "bg-accent-soft", iconClassName: "text-accent-ink", value: "2,480", label: "Verified UMBB students" },
  { icon: "books", tone: "bg-primary-soft", iconClassName: "text-primary-text", value: "312", label: "Modules covered" },
  { icon: "clock", tone: "bg-warn-soft", iconClassName: "text-warn", value: "1,260", label: "Sessions held" },
  { icon: "star", tone: "bg-accent-soft", iconClassName: "text-accent-ink", value: "4.8 / 5", label: "Average session rating" },
];

/** Floating stats card — overlaps the bottom of the hero by 84px. */
export default function Stats() {
  return (
    <section className="relative z-10 -mt-[84px] px-6 lg:px-16">
      <Reveal className="grid gap-6 rounded-3xl bg-surface px-9 py-[30px] shadow-raised sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </Reveal>
    </section>
  );
}
