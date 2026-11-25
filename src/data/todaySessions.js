/**
 * "Today on campus" sample sessions for the landing page.
 * Replace with the sessions API once it exists (same shape).
 * Titles / cover lines are real course content and stay in French in every UI language.
 *
 * @typedef {Object} SessionTutor
 * @property {string} initials
 * @property {string} name
 * @property {string} meta      e.g. "Informatique · ING4"
 * @property {number} rating
 * @property {number} ratings   number of ratings
 *
 * @typedef {Object} TodaySession
 * @property {string} id
 * @property {string} time            "HH:MM", local campus time
 * @property {number} durationMin
 * @property {string} course          e.g. "Bases de données · L3"
 * @property {string} title
 * @property {boolean} live
 * @property {"online" | "onsite"} mode
 * @property {string} [place]         on-site location (mode "onsite")
 * @property {SessionTutor} [tutor]   shown on the live card
 * @property {number} seatsLeft
 * @property {number} capacity
 * @property {string[]} cover         what the session covers (3 lines)
 * @property {("pdf" | "video" | "link")[]} shared  resource kinds shared in the session
 */

/** @type {TodaySession[]} */
export const TODAY_SESSIONS = [
  {
    id: "s-sql",
    time: "12:30",
    durationMin: 60,
    course: "Bases de données · L3",
    title: "Jointures SQL et normalisation (1NF → BCNF)",
    live: true,
    mode: "online",
    tutor: { initials: "HA", name: "HAMZI Abdelhak", meta: "Informatique · ING4", rating: 4.9, ratings: 87 },
    seatsLeft: 3,
    capacity: 12,
    cover: ["INNER, LEFT et RIGHT JOIN", "1NF, 2NF et 3NF pas à pas", "BCNF avec des exemples"],
    shared: ["pdf", "video", "link"],
  },
  {
    id: "s-analyse",
    time: "14:00",
    durationMin: 60,
    course: "Analyse 2 · L1",
    title: "Intégrales généralisées",
    live: false,
    mode: "onsite",
    place: "Bloc 5 · Salle 12",
    seatsLeft: 6,
    capacity: 12,
    cover: ["Intégrales de Riemann généralisées", "Critères de convergence", "Exercices corrigés"],
    shared: ["pdf", "video", "link"],
  },
  {
    id: "s-reseaux",
    time: "15:30",
    durationMin: 60,
    course: "Réseaux · L3",
    title: "Modèle OSI et adressage IP",
    live: false,
    mode: "online",
    seatsLeft: 8,
    capacity: 12,
    cover: ["Les 7 couches du modèle OSI", "Adresses IPv4 et masques", "Découpage en sous-réseaux"],
    shared: ["pdf", "video", "link"],
  },
];
