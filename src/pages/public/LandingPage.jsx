import Hero from "./sections/Hero.jsx";
import TodayOnCampus from "./sections/TodayOnCampus.jsx";
import Stats from "./sections/Stats.jsx";
import How from "./sections/How.jsx";
import Features from "./sections/Features.jsx";
import Languages from "./sections/Languages.jsx";
import CTA from "./sections/CTA.jsx";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <TodayOnCampus />
      <Stats />
      <How />
      <Features />
      <Languages />
      <CTA />
    </>
  );
}
