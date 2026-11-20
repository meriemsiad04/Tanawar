import Button from "../../../Components/uiC/Button.jsx";
import Avatar from "../../../Components/uiC/Avatar.jsx";
import Icon from "../../../Components/uiC/Icon.jsx";
import Reveal from "../../../Components/motion/Reveal.jsx";
import HeroSessionPreview from "./HeroSessionPreview.jsx";
import amberGlow from "../../../assets/landing/amber-glow.svg";

const AVATARS = [
  { initials: "YH", tone: "bg-primary" },
  { initials: "SB", tone: "bg-accent" },
  { initials: "AM", tone: "bg-warn" },
  { initials: "NK", tone: "bg-ink-2" },
];

const scrollToHow = () =>
  document.getElementById("how")?.scrollIntoView({ behavior: "smooth" });

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-ink">
      {/* Amber glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[760px] top-[444px] hidden h-[520px] w-[900px] lg:block"
      >
        <img
          src={amberGlow}
          alt=""
          className="absolute inset-[-30.77%_-17.78%] block size-auto max-w-none"
          style={{ width: "135.56%", height: "161.54%" }}
        />
      </div>

      <div className="relative flex flex-col items-center gap-16 px-6 pb-[168px] pt-14 lg:flex-row lg:px-16 lg:pt-[84px]">
        {/* Pitch */}
        <div className="flex min-w-0 flex-1 flex-col items-start gap-6">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[.14] bg-white/[.08] px-3.5 py-[7px]">
              <Icon name="spark" size="sm" className="text-highlight" />
              <span className="text-[13px] font-semibold leading-[18px] text-white">
                Built for the University of Boumerdès (UMBB)
              </span>
            </div>
          </Reveal>

          <Reveal delay={150}>
          <h1 className="max-w-[640px] font-serif text-[44px] font-bold leading-[50px] tracking-[-0.01em] text-white md:text-[64px] md:leading-[70px]">
            Learn together.
            <span className="block text-highlight">Share what you know.</span>
          </h1>
          </Reveal>

          <Reveal delay={300}>
          <p className="max-w-[580px] text-lg leading-[29px] text-on-dark-2">
            TANAWAR connects verified UMBB students for peer-led study sessions.
            Publish a session in two minutes, join one in two clicks, and keep
            every PDF, video and link in one place.
          </p>
          </Reveal>

          <Reveal delay={450} className="flex flex-wrap gap-3">
            <Button variant="amber" size="m">
              Start learning →
            </Button>
            <Button variant="ghostDark" size="m" onClick={scrollToHow}>
              See how it works
            </Button>
          </Reveal>

          <Reveal delay={600} className="flex items-center gap-3.5">
            <div className="flex">
              {AVATARS.map(({ initials, tone }, i) => (
                <Avatar
                  key={initials}
                  initials={initials}
                  className={`${tone} ${i < AVATARS.length - 1 ? "-mr-2.5" : ""}`}
                  ringed
                />
              ))}
            </div>
            <p className="text-[15px] leading-[23px] text-on-dark-2">
              <strong className="font-bold text-white">2,480</strong> UMBB
              students already learning together
            </p>
          </Reveal>
        </div>

        {/* Example session */}
        <Reveal delay={450} scale className="w-full max-w-[520px] shrink-0">
          <HeroSessionPreview />
        </Reveal>
      </div>
    </section>
  );
}
