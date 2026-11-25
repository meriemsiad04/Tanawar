import { useCallback, useMemo, useState } from "react";
import Avatar from "../../../Components/uiC/Avatar.jsx";
import Button from "../../../Components/uiC/Button.jsx";
import Icon from "../../../Components/uiC/Icon.jsx";
import Label from "../../../Components/uiC/Label.jsx";
import ContributionHeatmap from "../../../Components/sharedC/ContributionHeatmap.jsx";
import KpiCard from "../../../Components/sharedC/KpiCard.jsx";
import RatingStars from "../../../Components/sharedC/RatingStars.jsx";
import SessionStatusBadge from "../../../Components/sharedC/SessionStatusBadge.jsx";
import { useAsync } from "../../../hooks/useAsync.js";
import { getAttendance, getHostedSessions, getProfile, getRating } from "../../../services/profileService.js";

const initialsOf = (name = "") => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
const fmtDate = (iso, opts) => (iso ? new Date(iso).toLocaleDateString("en-GB", opts) : "");
const SESSION_TONE = { live: "live", scheduled: "clay", upcoming: "clay", ended: "neutral", completed: "neutral", cancelled: "warn" };
const pad = (n) => String(n).padStart(2, "0");

function Panel({ title, children, className = "" }) {
  return (
    <section className={`rounded-[20px] border border-line bg-surface p-5 sm:p-[22px] ${className}`}>
      <h2 className="pb-3 text-lg font-extrabold leading-6 text-fg">{title}</h2>
      {children}
    </section>
  );
}

/** Loading / error / empty states shared by every data panel. */
function Remote({ state, empty, emptyText, children }) {
  if (state.status === "loading") return <p role="status" className="py-6 text-sm text-fg-2">Loading…</p>;
  if (state.status === "error") {
    const e = state.error;
    return (
      <div role="alert" className="flex flex-col items-start gap-3 py-2 text-sm text-fg-2">
        <p>{e?.code === "NOT_CONFIGURED" ? "This will appear once the server is connected." : e?.message || "Something went wrong."}</p>
        <Button size="s" variant="outline" onClick={state.reload}>Try again</Button>
      </div>
    );
  }
  if (empty) return <p className="py-6 text-sm text-fg-2">{emptyText}</p>;
  return children;
}

function HostedSessionRow({ s }) {
  const online = s.mode === "online";
  const tone = SESSION_TONE[String(s.status).toLowerCase()] ?? "neutral";
  return (
    <li className="flex flex-col gap-2 rounded-[14px] border border-line p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SessionStatusBadge tone={tone}>{String(s.status).charAt(0).toUpperCase() + String(s.status).slice(1)}</SessionStatusBadge>
        <Label variant="secondary">{s.module}{s.level ? ` · ${s.level}` : ""}</Label>
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

/** The signed-in student's profile: details, rating & reviews, hosted sessions, attendance heatmap. */
export default function ProfileP() {
  const profile = useAsync(getProfile);
  const rating = useAsync(getRating);
  const hosted = useAsync(getHostedSessions);
  const [from] = useState(() => {
    const d = new Date();
    return `${d.getFullYear() - 1}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
  const attendance = useAsync(useCallback(() => getAttendance(from), [from]));

  const attended = useMemo(() => (attendance.data ?? []).reduce((n, d) => n + d.count, 0), [attendance.data]);
  const hostedList = hosted.data ?? [];
  const reviews = rating.data?.reviews ?? [];
  const p = profile.data;

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6">
      {/* Identity */}
      <section className="rounded-[20px] border border-line bg-surface p-5 sm:p-[22px]">
        <Remote state={profile}>
          {p && (
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <Avatar initials={initialsOf(p.fullName)} src={p.avatarUrl} size={96} />
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h1 className="flex items-center gap-2 text-2xl font-extrabold leading-8 text-fg">
                      <span className="truncate">{p.fullName}</span>
                      <Icon name="check" size="sm" label="Verified" className="text-primary" />
                    </h1>
                    <p className="text-sm leading-5 text-fg-2">
                      {[p.major, p.level].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <a href="/app/profile/edit" className="contents">
                    <Button size="s" variant="outline" tabIndex={-1}><Icon name="pencil" size="sm" /> Edit profile</Button>
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  <RatingStars value={rating.data?.average ?? 0} />
                  <span className="text-sm font-bold text-fg">
                    {rating.status === "ready" && rating.data.count > 0 ? `${Number(rating.data.average).toFixed(1)} (${rating.data.count})` : "No reviews yet"}
                  </span>
                </div>

                {p.bio && <p className="whitespace-pre-line text-sm leading-6 text-fg">{p.bio}</p>}

                <ul className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] leading-[19px] text-fg-2">
                  {p.birthdate && <li className="inline-flex items-center gap-1.5"><Icon name="calendar" size="sm" className="!size-3.5" />Born {fmtDate(p.birthdate, { day: "numeric", month: "long", year: "numeric" })}</li>}
                  {p.memberSince && <li className="inline-flex items-center gap-1.5"><Icon name="userCheck" size="sm" className="!size-3.5" />Member since {fmtDate(p.memberSince, { month: "long", year: "numeric" })}</li>}
                </ul>

                {p.strongModules?.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-fg-3">Good at</p>
                    <ul className="flex flex-wrap gap-2">
                      {p.strongModules.map((m) => <li key={m}><Label variant="secondary">{m}</Label></li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </Remote>
      </section>

      {/* Numbers */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard icon="star" value={rating.status === "ready" && rating.data.count > 0 ? Number(rating.data.average).toFixed(1) : "–"} label={rating.status === "ready" ? `Average rating · ${rating.data.count} ${rating.data.count === 1 ? "review" : "reviews"}` : "Average rating"} />
        <KpiCard icon="cap" value={hosted.status === "ready" ? hostedList.length : "–"} label="Sessions hosted" />
        <KpiCard icon="calendar" value={attendance.status === "ready" ? attended : "–"} label="Sessions attended this year" />
      </div>

      {/* Attendance */}
      <Panel title="Attendance">
        <Remote state={attendance}>
          <ContributionHeatmap data={attendance.data ?? []} />
        </Remote>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Hosted sessions">
          <Remote state={hosted} empty={hostedList.length === 0} emptyText="You haven't hosted any session yet.">
            <ul className="flex flex-col gap-3">{hostedList.map((s) => <HostedSessionRow key={s.id} s={s} />)}</ul>
          </Remote>
        </Panel>

        <Panel title="Reviews">
          <Remote state={rating} empty={reviews.length === 0} emptyText="No student has reviewed you yet.">
            <ul className="flex flex-col gap-3">
              {reviews.map((r) => (
                <li key={r.id} className="flex flex-col gap-1.5 rounded-[14px] border border-line p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-bold text-fg">{r.author}</span>
                    <RatingStars value={r.rating} />
                  </div>
                  {r.comment && <p className="text-sm leading-5 text-fg-2">{r.comment}</p>}
                  <p className="text-xs text-fg-3">{fmtDate(r.createdAt, { day: "numeric", month: "short", year: "numeric" })}</p>
                </li>
              ))}
            </ul>
          </Remote>
        </Panel>
      </div>
    </div>
  );
}
