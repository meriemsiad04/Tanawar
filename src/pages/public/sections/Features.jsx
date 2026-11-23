import SectionTitle from "../../../Components/uiC/SectionTitle.jsx";
import Reveal from "../../../Components/motion/Reveal.jsx";
import FeatureCard from "../../../Components/sharedC/FeatureCard.jsx";

const FEATURES = [
  {
    icon: "spark",
    variant: "accent",
    title: "Smart recommendations",
    text: "Sessions ranked by your modules, your field and level, your connections, the host’s rating and the timing. Each one shows why.",
    tags: ["L3 Informatique", "Bases de données", "Tomorrow · 16:00"],
  },
  {
    icon: "lock",
    title: "Public or private sessions",
    text: "Public sessions are open to everyone. For a private one, enter the password the host shared, then the host approves your request.",
  },
  {
    icon: "paperclip",
    title: "Resources from every session",
    text: "Hosts add PDFs, links, pictures and video links to their sessions. Everyone can explore them by module, and the resources of private sessions stay with their participants.",
  },
  {
    icon: "calendar",
    title: "Instant or scheduled",
    text: "Start a session right now, or plan one for next week once an admin approves it.",
  },
  {
    icon: "check",
    variant: "primary",
    title: "Verified hosts & ratings",
    text: "Every host is a verified UMBB student, with their rating and the sessions they hosted shown on their profile.",
    tags: ["★ 4.9", "34 sessions hosted", "Verified"],
  },
  {
    icon: "video",
    title: "Built-in classroom",
    text: "Online sessions open in the TANAWAR classroom. On-site sessions show the building and room.",
  },
];

export default function Features() {
  return (
    <section id="features" className="flex scroll-mt-4 flex-col gap-5 px-6 pt-24 lg:px-16">
      <Reveal className="pb-7">
        <SectionTitle eyebrow="Features">
          Everything a study group needs, nothing it doesn’t
        </SectionTitle>
      </Reveal>

      {/* Two rows of three on desktop (same visual order as the design) */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ text, ...card }, i) => (
          <Reveal key={card.title} scale delay={(i % 3) * 150} className="[&>*]:h-full">
            <FeatureCard {...card}>{text}</FeatureCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
