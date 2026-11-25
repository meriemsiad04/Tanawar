import Button from "../../../Components/uiC/Button.jsx";
import { useSignIn } from "../../../hooks/useSignIn.js";
import ctaGlow from "../../../assets/landing/cta-glow.svg";

export default function CTA() {
  const openSignIn = useSignIn();
  return (
    <section className="px-6 pt-24 lg:px-16">
      <div className="relative flex flex-col items-center gap-[18px] overflow-hidden rounded-[32px] bg-ink px-6 py-[72px] text-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-[61%] top-[260px] hidden h-[320px] w-[700px] lg:block"
        >
          <img
            src={ctaGlow}
            alt=""
            className="absolute inset-[-43.75%_-20%] block max-w-none"
            style={{ width: "140%", height: "187.5%" }}
          />
        </div>

        <h2 className="relative max-w-[760px] font-serif text-[32px] font-bold leading-10 tracking-[-0.01em] text-white md:text-[42px] md:leading-[50px]">
          Your next exam is closer than it feels. Join a session today.
        </h2>
        <p className="relative max-w-[560px] text-lg leading-[29px] text-on-dark-2">
          Free for every UMBB student. Check your matricule in under a minute.
        </p>
        <div className="relative pt-3.5">
          <Button variant="amber" size="m" onClick={openSignIn}>
            Join our community →
          </Button>
        </div>
      </div>
    </section>
  );
}
