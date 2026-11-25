import SectionTitle from "../../../Components/uiC/SectionTitle.jsx";
import Reveal from "../../../Components/motion/Reveal.jsx";
import StepCard from "../../../Components/sharedC/StepCard.jsx";

const STEPS = [
  {
    icon: "userCheck",
    title: "Verify your UMBB identity",
    text: "Sign up with your matricule. TANAWAR checks it against the list of enrolled UMBB students imported by the administrators.",
  },
  {
    icon: "search",
    title: "Find a session for your module",
    text: "Filter by module, level, online or on-site, and see exactly how many seats are left.",
  },
  {
    icon: "plusCircle",
    title: "Or teach what you know",
    text: "Publish an instant session, or a scheduled one that an admin approves before it goes public.",
  },
  {
    icon: "star",
    title: "Rate, learn, repeat",
    text: "After each session, rate its host from 1 to 5 stars. Hosts build their reputation from these ratings.",
  },
];

export default function How() {
  return (
    <section id="how" className="mx-auto w-full max-w-[1440px] flex scroll-mt-4 flex-col gap-12 px-6 pt-24 lg:px-16">
      <Reveal>
        <SectionTitle eyebrow="How it works">
          From “I don’t get it” to “I got it” in one session
        </SectionTitle>
      </Reveal>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {STEPS.map(({ icon, title, text }, i) => (
          <Reveal key={title} delay={150 + i * 150} className="[&>*]:h-full">
            <StepCard icon={icon} number={String(i + 1).padStart(2, "0")} title={title}>
              {text}
            </StepCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
