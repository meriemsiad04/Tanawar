import { useCallback, useMemo, useState } from "react";
import Avatar from "../../../Components/uiC/Avatar.jsx";
import Button from "../../../Components/uiC/Button.jsx";
import Icon from "../../../Components/uiC/Icon.jsx";
import ContributionHeatmap from "../../../Components/sharedC/ContributionHeatmap.jsx";
import RatingStars from "../../../Components/sharedC/RatingStars.jsx";
import SessionStatusBadge from "../../../Components/sharedC/SessionStatusBadge.jsx";
import VerificationStatusBadge from "../../../Components/sharedC/VerificationStatusBadge.jsx";
import { useAsync } from "../../../hooks/useAsync.js";
import { getSession } from "../../../services/authService.js";
import { getAttendance, getHostedSessions, getProfile, getRating } from "../../../services/profileService.js";
import { getFriends, getModules, studentPath } from "../../../services/studentsService.js";

const initialsOf = (name = "") => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
const fmtDate = (iso, opts) => (iso ? new Date(iso).toLocaleDateString("en-GB", opts) : "");
const pad = (n) => String(n).padStart(2, "0");
const SESSION_TONE = { live: "live", scheduled: "clay", upcoming: "clay", ended: "neutral", completed: "neutral", cancelled: "warn" };
const UPCOMING = new Set(["live", "scheduled", "upcoming"]);
const cap = (s = "") => s.charAt(0).toUpperCase() + s.slice(1);

const ageFrom = (iso) => {
  if (!iso) return null;
  const b = new Date(`${iso}T00:00:00`);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now < new Date(now.getFullYear(), b.getMonth(), b.getDate())) age -= 1;
  return age;
};

/* ───────────── Building blocks ───────────── */

function Panel({ title, action, children, className = "" }) {
  return (
    <section className={`flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-5 sm:p-[22px] ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3">
          {title && <h2 className="text-lg font-extrabold leading-6 text-fg">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const Eyebrow = ({ children }) => <p className="text-xs font-extrabold uppercase leading-4 tracking-[0.14em] text-fg-3">{children}</p>;

const Pill = ({ children, tone = "accent" }) => (
  <li
    className={`rounded-full px-3 py-1 text-xs font-bold leading-4 ${tone === "accent" ? "bg-accent-soft text-accent-ink" : "border border-line-strong text-fg-2"}`}
  >
    {children}
  </li>
);

/** Loading / error / empty states shared by every data panel. */
function Remote({ state, empty, emptyText, children }) {
  if (state.status === "loading") return <p role="status" className="py-4 text-sm text-fg-2">Loading…</p>;
  if (state.status === "error") {
    const e = state.error;
    return (
      <div role="alert" className="flex flex-col items-start gap-3 py-2 text-sm text-fg-2">
        <p>{e?.code === "NOT_CONFIGURED" ? "This will appear once the server is connected." : e?.message || "Something went wrong."}</p>
        <Button size="s" variant="outline" onClick={state.reload}>Try again</Button>
      </div>
    );
  }
  if (empty) return <p className="py-4 text-sm text-fg-2">{emptyText}</p>;
  return children;
}

/** One label / value line in the side cards. */
function Detail({ icon, label, children }) {
  return (
    <li className="flex items-start gap-3 py-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-fg-2">
        <Icon name={icon} size="sm" className="!size-4" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-xs leading-4 text-fg-3">{label}</span>
        <span className="break-words text-sm font-semibold leading-5 text-fg">{children || <span className="font-normal text-fg-3">Not set</span>}</span>
      </span>
    </li>
  );
}

function Stat({ icon, value, label, tone = "bg-primary-soft text-primary-text" }) {
  return (
    <div className="flex items-center gap-3 rounded-[18px] border border-line bg-surface p-4">
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${tone}`}>
        <Icon name={icon} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-xl font-extrabold leading-7 text-fg">{value}</span>
        <span className="truncate text-xs leading-4 text-fg-2">{label}</span>
      </span>
    </div>
  );
}

function HostedSessionRow({ s }) {
  const online = s.mode === "online";
  const status = String(s.status).toLowerCase();
  return (
    <li className="flex flex-col gap-2 rounded-[14px] border border-line p-3.5 transition-colors hover:bg-surface-2/50">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SessionStatusBadge tone={SESSION_TONE[status] ?? "neutral"}>{cap(status)}</SessionStatusBadge>
        <span className="rounded-lg bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent-ink">
          {s.module}
          {s.level ? ` · ${s.level}` : ""}
        </span>
      </div>
      <p className="text-sm font-bold leading-5 text-fg">{s.title}</p>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] leading-[19px] text-fg-2">
        <li className="inline-flex items-center gap-1.5"><Icon name="calendar" size="sm" className="!size-3.5" />{fmtDate(s.startsAt, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</li>
        {s.durationMin ? <li className="inline-flex items-center gap-1.5"><Icon name="clock" size="sm" className="!size-3.5" />{s.durationMin} min</li> : null}
        <li className="inline-flex items-center gap-1.5"><Icon name={online ? "video" : "pin"} size="sm" className="!size-3.5" />{online ? "Online" : s.location}</li>
        <li className="inline-flex items-center gap-1.5"><Icon name="users" size="sm" className="!size-3.5" />{s.booked ?? 0} / {s.seats} seats</li>
      </ul>
    </li>
  );
}

/** 5★ → 1★ bars. Uses rating.distribution from the API when present, else counts the listed reviews. */
function RatingBreakdown({ rating }) {
  const counts = rating.distribution ?? [5, 4, 3, 2, 1].reduce((acc, star) => ({ ...acc, [star]: (rating.reviews ?? []).filter((r) => r.rating === star).length }), {});
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="flex flex-col gap-4 rounded-[16px] bg-surface-2 p-4 sm:flex-row sm:items-center">
      <div className="flex flex-col items-center gap-1 sm:w-32">
        <span className="text-4xl font-extrabold leading-none text-fg">{rating.count > 0 ? Number(rating.average).toFixed(1) : "–"}</span>
        <RatingStars value={rating.average ?? 0} />
        <span className="text-xs text-fg-2">{rating.count} {rating.count === 1 ? "review" : "reviews"}</span>
      </div>
      <ul className="flex flex-1 flex-col gap-1.5">
        {[5, 4, 3, 2, 1].map((star) => (
          <li key={star} className="flex items-center gap-2 text-xs text-fg-2">
            <span className="w-6 text-right font-bold">{star}★</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
              <span className="block h-full rounded-full bg-highlight" style={{ width: `${((counts[star] ?? 0) / total) * 100}%` }} />
            </span>
            <span className="w-5 text-right">{counts[star] ?? 0}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ───────────── Page ───────────── */

/**
 * The signed-in student's own profile: identity, stats, about, attendance, hosted sessions, reviews,
 * plus profile completeness, personal details, private account details and connections.
 * Account details (email, matricule, sign-in method, verification) come from the session and are only shown to the owner.
 */
export default function ProfileP() {
  const profile = useAsync(getProfile);
  const rating = useAsync(getRating);
  const hosted = useAsync(getHostedSessions);
  const friends = useAsync(useCallback(() => getFriends().catch(() => []), []));
  const modules = useAsync(useCallback(() => getModules().catch(() => []), []));
  const [from] = useState(() => {
    const d = new Date();
    return `${d.getFullYear() - 1}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
  const attendance = useAsync(useCallback(() => getAttendance(from), [from]));
  const [hostedTab, setHostedTab] = useState("upcoming");

  const account = getSession()?.user ?? {};
  const p = profile.data;
  const r = rating.data;
  const hostedList = useMemo(() => hosted.data ?? [], [hosted.data]);
  const attended = useMemo(() => (attendance.data ?? []).reduce((n, d) => n + d.count, 0), [attendance.data]);
  const hoursTaught = useMemo(
    () => Math.round(hostedList.filter((s) => ["completed", "ended"].includes(String(s.status).toLowerCase())).reduce((m, s) => m + (s.durationMin ?? 0), 0) / 60),
    [hostedList]
  );
  const upcoming = hostedList.filter((s) => UPCOMING.has(String(s.status).toLowerCase()));
  const past = hostedList.filter((s) => !UPCOMING.has(String(s.status).toLowerCase()));
  const shownHosted = hostedTab === "upcoming" ? upcoming : past;
  const friendList = friends.data ?? [];
  const age = ageFrom(p?.birthdate);

  // Profile completeness: what the edit form lets the student fill in.
  const checklist = p
    ? [
        { label: "Profile photo", done: Boolean(p.avatarUrl) },
        { label: "Major and level", done: Boolean(p.major && p.level) },
        { label: "Short bio", done: Boolean(p.bio?.trim()) },
        { label: "Birthdate", done: Boolean(p.birthdate) },
        { label: "Modules you're good at", done: (p.strongModules?.length ?? 0) > 0 },
      ]
    : [];
  const percent = checklist.length ? Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100) : 0;

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
      {/* ── Identity banner ── */}
      <section className="overflow-hidden rounded-[22px] border border-line bg-surface">
        <div aria-hidden="true" className="relative h-28 overflow-hidden bg-ink sm:h-36">
          <span className="absolute -left-10 -top-16 size-56 rounded-full bg-accent/40 blur-3xl" />
          <span className="absolute -bottom-20 right-10 size-64 rounded-full bg-highlight/25 blur-3xl" />
          <span className="absolute right-1/3 top-4 size-28 rounded-full bg-primary/40 blur-2xl" />
        </div>

        <div className="px-5 pb-5 sm:px-7 sm:pb-6">
          <Remote state={profile}>
            {p && (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="-mt-14 shrink-0 rounded-full border-4 border-surface bg-surface sm:-mt-16">
                  <Avatar initials={initialsOf(p.fullName)} src={p.avatarUrl} size={112} />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:pb-1">
                  <h1 className="flex flex-wrap items-center gap-2 font-serif text-[clamp(24px,2.4vw,30px)] font-bold leading-tight text-fg">
                    <span className="min-w-0 break-words">{p.fullName}</span>
                    {account.verificationStatus !== "pending" && account.verificationStatus !== "rejected" && (
                      <Icon name="verified" label="Verified UMBB student" className="text-primary" />
                    )}
                  </h1>
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-5 text-fg-2">
                    <span className="inline-flex items-center gap-1.5"><Icon name="cap" size="sm" className="!size-4" />{[p.major, p.level].filter(Boolean).join(" · ") || "Major not set"}</span>
                    <span aria-hidden="true">·</span>
                    <span>{p.faculty || "UMBB, Boumerdès"}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <RatingStars value={r?.average ?? 0} />
                    <span className="text-sm font-bold text-fg">
                      {rating.status === "ready" && r.count > 0 ? `${Number(r.average).toFixed(1)} · ${r.count} ${r.count === 1 ? "review" : "reviews"}` : "No reviews yet"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:pb-1">
                  <a href="/app/profile/edit" className="contents">
                    <Button size="s" tabIndex={-1}><Icon name="pencil" size="sm" /> Edit profile</Button>
                  </a>
                  <a href="/app/settings" className="contents">
                    <Button size="s" variant="outline" tabIndex={-1}><Icon name="gear" size="sm" /> Settings</Button>
                  </a>
                </div>
              </div>
            )}
          </Remote>
        </div>
      </section>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Stat icon="star" tone="bg-highlight/15 text-warn" value={rating.status === "ready" && r.count > 0 ? Number(r.average).toFixed(1) : "–"} label="Average rating" />
        <Stat icon="cap" value={hosted.status === "ready" ? hostedList.length : "–"} label="Sessions hosted" />
        <Stat icon="clock" tone="bg-accent-soft text-accent-ink" value={hosted.status === "ready" ? `${hoursTaught} h` : "–"} label="Hours taught" />
        <Stat icon="calendar" tone="bg-warn-soft text-warn" value={attendance.status === "ready" ? attended : "–"} label="Attended this year" />
        <Stat icon="users" tone="bg-surface-2 text-fg-2" value={friends.status === "ready" ? friendList.length : "–"} label="Connections" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        {/* ── Main column ── */}
        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="About">
            <Remote state={profile}>
              {p && (
                <div className="flex flex-col gap-5">
                  {p.bio ? (
                    <p className="whitespace-pre-line text-sm leading-6 text-fg">{p.bio}</p>
                  ) : (
                    <p className="text-sm text-fg-3">
                      No bio yet. <a href="/app/profile/edit" className="font-bold text-primary-text hover:underline">Tell other students about yourself</a>
                    </p>
                  )}

                  <div className="flex flex-col gap-2">
                    <Eyebrow>Good at</Eyebrow>
                    {p.strongModules?.length ? (
                      <ul className="flex flex-wrap gap-2">{p.strongModules.map((m) => <Pill key={m}>{m}</Pill>)}</ul>
                    ) : (
                      <p className="text-sm text-fg-3">Add the modules you can help with, so students find your sessions.</p>
                    )}
                  </div>

                  {p.interests?.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <Eyebrow>Interests</Eyebrow>
                      <ul className="flex flex-wrap gap-2">{p.interests.map((m) => <Pill key={m} tone="outline">{m}</Pill>)}</ul>
                    </div>
                  )}

                  {(modules.data ?? []).length > 0 && (
                    <div className="flex flex-col gap-2">
                      <Eyebrow>Current modules</Eyebrow>
                      <ul className="flex flex-wrap gap-2">
                        {modules.data.map((m) => (
                          <li key={m.code}>
                            <a
                              href={`/app/sessions?module=${encodeURIComponent(m.name)}`}
                              className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-3 py-1 text-xs font-bold leading-4 text-fg-2 hover:border-primary hover:text-primary-text"
                            >
                              {m.name}
                              {m.code && <span className="font-normal text-fg-3">{m.code}</span>}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </Remote>
          </Panel>

          <Panel title="Attendance" action={attendance.status === "ready" && <span className="text-[13px] text-fg-2">Last 12 months</span>}>
            <Remote state={attendance}>
              <ContributionHeatmap data={attendance.data ?? []} />
            </Remote>
          </Panel>

          <Panel
            title="Hosted sessions"
            action={
              hosted.status === "ready" &&
              hostedList.length > 0 && (
                <div role="tablist" aria-label="Hosted sessions" className="flex gap-1 rounded-xl bg-surface-2 p-1">
                  {[
                    { value: "upcoming", label: "Upcoming", n: upcoming.length },
                    { value: "past", label: "Past", n: past.length },
                  ].map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      role="tab"
                      aria-selected={hostedTab === t.value}
                      onClick={() => setHostedTab(t.value)}
                      className={`cursor-pointer rounded-lg px-3 py-1.5 text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                        hostedTab === t.value ? "bg-surface text-fg shadow-sm" : "text-fg-2 hover:text-fg"
                      }`}
                    >
                      {t.label} <span className="text-fg-3">{t.n}</span>
                    </button>
                  ))}
                </div>
              )
            }
          >
            <Remote state={hosted} empty={hostedList.length === 0} emptyText="You haven't hosted any session yet.">
              {shownHosted.length ? (
                <ul className="grid grid-cols-1 gap-3 xl:grid-cols-2">{shownHosted.map((s) => <HostedSessionRow key={s.id} s={s} />)}</ul>
              ) : (
                <p className="py-4 text-sm text-fg-2">{hostedTab === "upcoming" ? "No upcoming session. Host one from the dashboard." : "No past session yet."}</p>
              )}
            </Remote>
          </Panel>

          <Panel title="Reviews">
            <Remote state={rating} empty={(r?.reviews ?? []).length === 0 && (r?.count ?? 0) === 0} emptyText="No student has reviewed you yet.">
              {r && (
                <div className="flex flex-col gap-4">
                  <RatingBreakdown rating={r} />
                  <ul className="flex flex-col gap-3">
                    {(r.reviews ?? []).map((rv) => (
                      <li key={rv.id} className="flex gap-3 rounded-[14px] border border-line p-3.5">
                        <Avatar initials={initialsOf(rv.author)} size={36} className="bg-accent" />
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-bold text-fg">{rv.author}</span>
                            <span className="text-xs text-fg-3">{fmtDate(rv.createdAt, { day: "numeric", month: "short", year: "numeric" })}</span>
                          </div>
                          <RatingStars value={rv.rating} />
                          {rv.comment ? <p className="text-sm leading-5 text-fg-2">{rv.comment}</p> : <p className="text-xs italic text-fg-3">No comment</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Remote>
          </Panel>
        </div>

        {/* ── Side column ── */}
        <aside className="flex min-w-0 flex-col gap-6">
          {p && (
            <Panel title="Profile completeness">
              <div className="flex items-center gap-3">
                <div
                  role="progressbar"
                  aria-valuenow={percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Profile completeness"
                  className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2"
                >
                  <span className={`block h-full rounded-full ${percent === 100 ? "bg-primary" : "bg-highlight"}`} style={{ width: `${percent}%` }} />
                </div>
                <span className="text-sm font-extrabold text-fg">{percent}%</span>
              </div>
              <ul className="flex flex-col gap-1.5">
                {checklist.map((c) => (
                  <li key={c.label} className="flex items-center gap-2 text-[13px]">
                    <Icon name={c.done ? "check" : "plusCircle"} size="sm" className={`!size-4 ${c.done ? "text-primary-text" : "text-fg-3"}`} />
                    {c.done ? (
                      <span className="text-fg-2">{c.label}</span>
                    ) : (
                      <a href="/app/profile/edit" className="font-bold text-fg hover:text-primary-text hover:underline">Add {c.label.charAt(0).toLowerCase() + c.label.slice(1)}</a>
                    )}
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel title="Personal details">
            <Remote state={profile}>
              {p && (
                <ul className="-my-1 divide-y divide-line">
                  <Detail icon="user" label="Full name">{p.fullName}</Detail>
                  <Detail icon="cap" label="Major">{p.major}</Detail>
                  <Detail icon="levels" label="Study level">{p.level}</Detail>
                  <Detail icon="books" label="University">{p.faculty || "Université M’Hamed Bougara, Boumerdès"}</Detail>
                  <Detail icon="calendar" label="Birthdate">
                    {p.birthdate && `${fmtDate(p.birthdate, { day: "numeric", month: "long", year: "numeric" })}${age ? ` (${age})` : ""}`}
                  </Detail>
                  <Detail icon="userCheck" label="Member since">{fmtDate(p.memberSince, { month: "long", year: "numeric" })}</Detail>
                </ul>
              )}
            </Remote>
          </Panel>

          <Panel title="Account" action={<span className="inline-flex items-center gap-1 text-xs font-semibold text-fg-3"><Icon name="lock" size="sm" className="!size-3.5" /> Only you</span>}>
            <ul className="-my-1 divide-y divide-line">
              <Detail icon="globe" label="Email">{account.email}</Detail>
              <Detail icon="idCard" label="Student ID (matricule)">{account.matricule}</Detail>
              <Detail icon="lock" label="Sign-in method">{account.authProvider === "google" ? "Google" : account.authProvider === "email" ? "Email and password" : account.matricule ? "Matricule and password" : null}</Detail>
              <li className="flex items-center gap-3 py-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-fg-2">
                  <Icon name="verified" size="sm" className="!size-4" />
                </span>
                <span className="flex-1 text-xs text-fg-3">Verification</span>
                <VerificationStatusBadge status={account.verificationStatus ?? "approved"} />
              </li>
            </ul>
            <a href="/app/settings#account" className="text-[13px] font-bold text-primary-text hover:underline">Manage account ›</a>
          </Panel>

          <Panel title="Connections" action={<a href="/app/connections" className="text-sm font-bold text-primary-text hover:underline">See all</a>}>
            <Remote state={friends} empty={friendList.length === 0} emptyText="No connections yet. Meet students in sessions and add them.">
              <ul className="flex flex-col gap-1">
                {friendList.slice(0, 5).map((f) => (
                  <li key={f.id}>
                    <a href={studentPath(f.id)} className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-surface-2">
                      <Avatar initials={initialsOf(f.fullName)} src={f.avatarUrl} size={36} />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-bold text-fg">{f.fullName}</span>
                        <span className="truncate text-xs text-fg-2">{[f.major, f.level].filter(Boolean).join(" · ")}</span>
                      </span>
                      {f.rating ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-fg-2">
                          <Icon name="star" size="sm" className="!size-3.5 text-highlight" /> {Number(f.rating).toFixed(1)}
                        </span>
                      ) : null}
                    </a>
                  </li>
                ))}
              </ul>
            </Remote>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
