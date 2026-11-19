import {
  BookOpen,
  Calendar,
  CircleCheck,
  CirclePlus,
  Clock,
  GraduationCap,
  Languages,
  Lock,
  MapPin,
  Paperclip,
  Search,
  Sparkles,
  Star,
  UserCheck,
  Users,
  Video,
} from "lucide-react";

/**
 * TANAWAR icon set — the single place icons are registered.
 * Add new Lucide icons here (named imports keep the bundle tree-shaken)
 * and use them everywhere as <Icon name="calendar" />.
 * Brand logos are NOT icons: keep them as image assets (see uiC/Logo.jsx).
 */
const ICONS = {
  books: BookOpen,
  calendar: Calendar,
  cap: GraduationCap,
  check: CircleCheck,
  clock: Clock,
  lang: Languages,
  lock: Lock,
  paperclip: Paperclip,
  pin: MapPin,
  plusCircle: CirclePlus,
  search: Search,
  spark: Sparkles,
  star: Star,
  userCheck: UserCheck,
  users: Users,
  video: Video,
};

// The only sizes allowed in the UI.
const SIZES = { sm: 18, md: 20, lg: 24 };
const STROKE_WIDTH = 1.8;

/**
 * @param name   key of ICONS
 * @param size   "sm" (18) | "md" (20) | "lg" (24)
 * Colour comes from the text colour: pass e.g. className="text-primary".
 * Decorative by default; pass `label` to expose it to screen readers.
 */
export default function Icon({ name, size = "md", className = "", label }) {
  const Glyph = ICONS[name];
  if (!Glyph) return null;
  const px = SIZES[size] ?? SIZES.md;

  return (
    <Glyph
      width={px}
      height={px}
      strokeWidth={STROKE_WIDTH}
      className={`shrink-0 ${className}`}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
    />
  );
}
