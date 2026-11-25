import Avatar from "../uiC/Avatar.jsx";
import Button from "../uiC/Button.jsx";
import Icon from "../uiC/Icon.jsx";
import RatingStars from "./RatingStars.jsx";

const initialsOf = (name = "") =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

/**
 * Suggested-student card. `student`: { fullName, major, level, rating, verified, avatarUrl, sharedModules }.
 * `status`: "idle" | "sending" | "sent". The name links to the student's profile.
 */
export default function SuggestedStudentCard({ student, status = "idle", onAdd }) {
  const { id, fullName, major, level, rating, verified, avatarUrl, sharedModules = 0 } = student;
  const sent = status === "sent";
  return (
    <article className="flex h-full flex-col items-center gap-2 rounded-[20px] border border-line bg-surface p-5 text-center transition duration-200 ease-out hover:-translate-y-1 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <Avatar initials={initialsOf(fullName)} src={avatarUrl} size={64} className="bg-accent" />
      <a
        href={`/app/students/${encodeURIComponent(id)}`}
        className="mt-1 inline-flex max-w-full items-center gap-1 text-[15px] font-bold leading-5 text-fg hover:underline"
      >
        <span className="truncate">{fullName}</span>
        {verified && <Icon name="verified" size="sm" label="Verified" className="!size-4 text-primary" />}
      </a>
      <p className="text-xs leading-4 text-fg-2">{[major, level].filter(Boolean).join(" · ")}</p>
      {sharedModules > 0 && (
        <p className="text-xs font-bold leading-4 text-primary-text">
          {sharedModules} shared module{sharedModules === 1 ? "" : "s"}
        </p>
      )}
      <div className="flex items-center gap-1.5">
        <RatingStars value={rating} size="sm" />
        <span className="text-[13px] font-bold text-fg">{Number(rating).toFixed(1)}</span>
      </div>
      {/* mt-auto pins the button to the card bottom so buttons line up across a grid row
          (grid items stretch to the tallest card); pt-1.5 keeps the original spacing above it. */}
      <div className="mt-auto w-full pt-1.5">
      <Button
        variant={sent ? "outline" : "primary"}
        size="s"
        className="w-full"
        disabled={sent || status === "sending"}
        onClick={() => onAdd(student)}
        aria-label={sent ? `Friend request sent to ${fullName}` : `Add ${fullName} as a friend`}
      >
        {sent ? (
          <>
            <Icon name="check" size="sm" /> Request sent
          </>
        ) : status === "sending" ? (
          "Sending…"
        ) : (
          "Add friend"
        )}
      </Button>
      </div>
    </article>
  );
}
