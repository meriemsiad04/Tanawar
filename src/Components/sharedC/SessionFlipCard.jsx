import { useRef, useState } from "react";
import Icon from "../uiC/Icon.jsx";
import { useI18n } from "../../hooks/useI18n.js";
import "./SessionFlipCard.css";

/**
 * Square session card that flips in 3D to show what's inside.
 * - Mouse (hover-capable): flips on hover (CSS only).
 * - Touch / pen: tap toggles `.is-flipped`.
 * - Keyboard: focusing the card shows the back; Enter/Space toggles between back and front.
 * @param {{ session: import("../../data/todaySessions.js").TodaySession, onJoin?: () => void }} props
 */
export default function SessionFlipCard({ session, onJoin }) {
  const { t } = useI18n();
  const [flipped, setFlipped] = useState(false); // tap toggle
  const [front, setFront] = useState(false); // keyboard: forced back to the front while focused
  const pointerType = useRef("");

  const { time, durationMin, course, title, live, mode, place, tutor, seatsLeft, capacity, cover, shared } = session;
  const seats = t("landing.campus.seatsLeft", { n: seatsLeft });
  const taken = Math.min(1, Math.max(0, (capacity - seatsLeft) / capacity));

  const onClick = (e) => {
    if (e.target.closest(".back a, .back button")) return; // the join button never toggles the card
    if (pointerType.current === "mouse") return; // mouse users flip on hover
    if (e.detail === 0) return; // keyboard-synthesized click: handled in onKeyDown
    setFlipped((f) => !f);
  };

  const onKeyDown = (e) => {
    if (e.target !== e.currentTarget) return;
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    const showingBack = flipped || !front;
    setFlipped(false);
    setFront(showingBack);
  };

  const onBlur = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setFront(false);
  };

  const className = ["flip", live && "is-live", flipped && "is-flipped", front && "is-front"]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
      role="group"
      tabIndex={0}
      aria-label={t("landing.campus.cardLabel", { title, time })}
      onPointerDown={(e) => (pointerType.current = e.pointerType)}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
    >
      <div className="flip-inner">
        {/* Front */}
        <div className="face front">
          {live ? (
            <span className="fc-pill fc-pill--live">
              <span className="fc-dot" aria-hidden="true" />
              {t("landing.campus.live")}
            </span>
          ) : (
            <span className="fc-pill">{t(`landing.campus.${mode}`)}</span>
          )}

          <p className="fc-course" lang="fr">{course}</p>

          <p className="fc-time">
            <time dateTime={time}>{time}</time>
            <span>{t("landing.campus.minutes", { n: durationMin })}</span>
          </p>

          <h3 className="fc-title" lang="fr">{title}</h3>

          {tutor ? (
            <div className="fc-who">
              <span className="fc-avatar" aria-hidden="true">{tutor.initials}</span>
              <span className="fc-who__text">
                <span className="fc-who__name">
                  {tutor.name}
                  <Icon name="verified" size="sm" label={t("landing.campus.verified")} />
                </span>
                <span className="fc-who__meta">
                  <bdi>{tutor.meta} · ★ {tutor.rating} ({tutor.ratings})</bdi>
                </span>
              </span>
            </div>
          ) : (
            <div className="fc-who">
              <span className="fc-where-icon">
                <Icon name={mode === "onsite" ? "pin" : "video"} size="sm" />
              </span>
              <span className="fc-who__name">
                {mode === "onsite" ? place : t("landing.campus.onlineClassroom")}
              </span>
            </div>
          )}

          <div className="fc-foot">
            <strong>{seats}</strong>
            <span className="fc-hint" aria-hidden="true">
              <Icon name="flip" size="sm" />
              {t("landing.campus.flip")}
            </span>
          </div>
        </div>

        {/* Back */}
        <div className="face back">
          <div>
            <p className="fc-label">{t("landing.campus.cover")}</p>
            <ul className="fc-list" lang="fr">
              {cover.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>

          <div>
            <p className="fc-label">{t("landing.campus.shared")}</p>
            <ul className="fc-chips">
              {shared.map((kind) => (
                <li key={kind}>{t(`landing.campus.${kind}`)}</li>
              ))}
            </ul>
          </div>

          <div className="fc-bottom">
            <div className="fc-meter">
              <span className="fc-meter__track" aria-hidden="true">
                <span className="fc-meter__fill" style={{ width: `${taken * 100}%` }} />
              </span>
              <strong>{seats}</strong>
            </div>
            <button type="button" className="fc-join" onClick={onJoin} aria-haspopup="dialog">
              {t("landing.campus.join")} <span className="lp-arrow" aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
