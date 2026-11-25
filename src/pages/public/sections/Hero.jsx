import Avatar from "../../../Components/uiC/Avatar.jsx";
import Reveal from "../../../Components/motion/Reveal.jsx";
import { useSignIn } from "../../../hooks/useSignIn.js";
import { useI18n } from "../../../hooks/useI18n.js";
import "./landing.css";

const AVATARS = [
  { initials: "YH", tone: "lp-av-1" },
  { initials: "SB", tone: "lp-av-2" },
  { initials: "AM", tone: "lp-av-3" },
  { initials: "NK", tone: "lp-av-4" },
];
const STUDENT_COUNT = "2,480";

/** Centered landing hero: badge → headline → lead → one CTA → social proof. */
export default function Hero() {
  const openSignIn = useSignIn();
  const { t, lang, dir } = useI18n();
  const [proofBefore, proofAfter = ""] = t("landing.hero.proof").split("{count}");

  return (
    <section className="lp lp-hero" lang={lang} dir={dir}>
      <div className="lp-hero__inner">
        <div className="lp-hero__glow" aria-hidden="true" />

        <Reveal>
          <p className="lp-badge">{t("landing.hero.badge")}</p>
        </Reveal>

        <Reveal delay={120}>
          <h1 className="lp-hero__title">
            {t("landing.hero.line1")}{" "}
            <span className="lp-hero__l2">
              <span className="lp-hero__ul">{t("landing.hero.line2")}</span>
            </span>
          </h1>
        </Reveal>

        <Reveal delay={240}>
          <p className="lp-hero__lead">{t("landing.hero.lead")}</p>
        </Reveal>

        <Reveal delay={360}>
          <button type="button" className="lp-cta" onClick={openSignIn} aria-haspopup="dialog">
            {t("landing.hero.cta")} <span className="lp-arrow" aria-hidden="true">→</span>
          </button>
        </Reveal>

        <Reveal delay={480} className="lp-proof">
          <span className="lp-proof__avatars" aria-hidden="true">
            {AVATARS.map(({ initials, tone }) => (
              <Avatar key={initials} initials={initials} className={tone} ringed />
            ))}
          </span>
          <p className="m-0">
            {proofBefore}
            <strong>{STUDENT_COUNT}</strong>
            {proofAfter}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
