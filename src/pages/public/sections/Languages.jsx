import SectionTitle from "../../../Components/uiC/SectionTitle.jsx";
import LangCard from "../../../Components/sharedC/LangCard.jsx";
import Icon from "../../../Components/uiC/Icon.jsx";

export default function Languages() {
  return (
    <section
      id="languages"
      className="flex scroll-mt-4 flex-col gap-12 px-6 pt-24 lg:flex-row lg:items-center lg:px-16"
    >
      <div className="flex min-w-0 flex-1 flex-col items-start gap-3.5">
        <SectionTitle eyebrow="Languages" maxWidth="max-w-[600px]" className="gap-3.5">
          Study in French or in English
        </SectionTitle>
        <p className="max-w-[560px] text-lg leading-[29px] text-fg-2">
          Every page, message and error exists in both languages. Switch at any
          time, even in the middle of a session.
        </p>
        <div className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3.5 py-2">
          <Icon name="lang" size="sm" className="text-accent-ink" />
          <span className="text-sm font-bold leading-5 text-accent-ink">
            Arabic planned for a later release
          </span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3.5">
        <LangCard
          code="FR"
          language="Français"
          tagline="Apprenons ensemble. Partagez ce que vous savez."
        />
        <LangCard
          code="EN"
          language="English"
          tagline="Learn together. Share what you know."
          selected
        />
      </div>
    </section>
  );
}
