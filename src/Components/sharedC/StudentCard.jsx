import Avatar from "../uiC/Avatar.jsx";
import Icon from "../uiC/Icon.jsx";
import RatingStars from "./RatingStars.jsx";
import { studentPath } from "../../services/studentsService.js";

const initialsOf = (name = "") =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

/**
 * Friend card (Connections page), same layout as SuggestedStudentCard.
 * `student`: { id, fullName, major, level, rating, verified, avatarUrl }. The name and the footer link to the profile.
 */
export default function StudentCard({ student }) {
  const { id, fullName, major, level, rating, verified, avatarUrl } = student;
  return (
    <article className="flex flex-col items-center gap-2 rounded-[20px] border border-line bg-surface p-5 text-center transition duration-200 ease-out hover:-translate-y-1 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <Avatar initials={initialsOf(fullName)} src={avatarUrl} size={64} />
      <a href={studentPath(id)} className="mt-1 inline-flex max-w-full items-center gap-1 text-[15px] font-bold leading-5 text-fg hover:underline">
        <span className="truncate">{fullName}</span>
        {verified && <Icon name="verified" size="sm" label="Verified" className="!size-4 text-primary" />}
      </a>
      <p className="text-xs leading-4 text-fg-2">{[major, level].filter(Boolean).join(" · ")}</p>
      <div className="flex items-center gap-1.5">
        <RatingStars value={rating} size="sm" />
        <span className="text-[13px] font-bold text-fg">{Number(rating).toFixed(1)}</span>
      </div>
      <a
        href={studentPath(id)}
        className="mt-1.5 inline-flex h-[38px] w-full items-center justify-center gap-2 rounded-[10px] border border-line-strong text-sm font-bold text-fg transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
      >
        <Icon name="userCheck" size="sm" /> Friends
      </a>
    </article>
  );
}
