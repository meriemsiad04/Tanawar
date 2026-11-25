import {
  BookOpen,
  Calendar,
  CircleCheck,
  CirclePlus,
  CircleAlert,
  Bell,
  Compass,
  Flame,
  House,
  Plus,
  User,
  Clock,
  Eye,
  EyeOff,
  GraduationCap,
  IdCard,
  Languages,
  LoaderCircle,
  Lock,
  LogOut,
  MapPin,
  Moon,
  Paperclip,
  Search,
  Settings,
  Sparkles,
  Star,
  Sun,
  UserCheck,
  Users,
  Video,
  X,
  Zap,
  Wifi,
  Upload,
  Link,
  FileText,
  Image,
  Globe,
  ExternalLink,
  ChartNoAxesColumn,
  AlignLeft,
  CalendarPlus,
  Trash2,
  ChevronDown,
  Pencil,
  Camera,
  BadgeCheck,
  RefreshCw,
} from "lucide-react";

/**
 * TANAWAR icon set — the single place icons are registered.
 * Add new Lucide icons here (named imports keep the bundle tree-shaken)
 * and use them everywhere as <Icon name="calendar" />.
 * Brand logos are NOT icons: keep them as image assets (see uiC/Logo.jsx).
 */
const ICONS = {
  alert: CircleAlert,
  bell: Bell,
  compass: Compass,
  flame: Flame,
  gear: Settings,
  home: House,
  plus: Plus,
  user: User,
  books: BookOpen,
  calendar: Calendar,
  cap: GraduationCap,
  check: CircleCheck,
  clock: Clock,
  close: X,
  eye: Eye,
  eyeOff: EyeOff,
  idCard: IdCard,
  lang: Languages,
  loader: LoaderCircle,
  lock: Lock,
  logout: LogOut,
  moon: Moon,
  paperclip: Paperclip,
  pin: MapPin,
  plusCircle: CirclePlus,
  search: Search,
  spark: Sparkles,
  star: Star,
  sun: Sun,
  userCheck: UserCheck,
  users: Users,
  video: Video,
  bolt: Zap,
  wifi: Wifi,
  upload: Upload,
  link: Link,
  file: FileText,
  image: Image,
  globe: Globe,
  external: ExternalLink,
  levels: ChartNoAxesColumn,
  text: AlignLeft,
  calendarPlus: CalendarPlus,
  trash: Trash2,
  chevronDown: ChevronDown,
  pencil: Pencil,
  camera: Camera,
  verified: BadgeCheck,
  flip: RefreshCw,
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
