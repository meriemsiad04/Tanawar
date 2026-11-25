import Reveal from "../../../Components/motion/Reveal.jsx";
import SessionFlipCard from "../../../Components/sharedC/SessionFlipCard.jsx";
import { useI18n } from "../../../hooks/useI18n.js";
import { useSignIn } from "../../../hooks/useSignIn.js";
import { TODAY_SESSIONS } from "../../../data/todaySessions.js";
import "./landing.css";

/** "Today on campus": three sample sessions as flip cards. Swap TODAY_SESSIONS for the sessions API. */
export default function TodayOnCampus({ sessions = TODAY_SESSIONS }) {
  const { t, lang, dir } = useI18n();
  const openSignIn = useSignIn();

  return (
    <section className="lp lp-campus" lang={lang} dir={dir} aria-labelledby="campus-title">
      <div className="lp-campus__inner">
        <Reveal className="lp-campus__head">
          <p className="lp-eyebrow">{t("landing.campus.eyebrow")}</p>
          <h2 id="campus-title" className="lp-campus__title">
            {t("landing.campus.title")}
          </h2>
        </Reveal>

        <ul className="lp-campus__grid">
          {sessions.map((s, i) => (
            <Reveal as="li" key={s.id} delay={i * 120}>
              <SessionFlipCard session={s} onJoin={openSignIn} />
            </Reveal>
          ))}
        </ul>

        <p className="lp-campus__caption">{t("landing.campus.caption")}</p>
      </div>
    </section>
  );
}
