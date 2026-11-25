import "./StudyIllustration.css";

/**
 * A student at their desk (Study With Me). Pure SVG, so it scales crisply and follows the theme.
 * The look (pose, skin tone, hairstyle or hijab, top colour, glasses) is derived from `seed` (the student id), so each
 * student keeps the same character everywhere and on every visit. `pose="empty"` draws a free desk.
 *
 * Props: seed, pose? (0–5 | "empty"), away? (left the room: faded, still), label? (accessible name; decorative otherwise), className.
 */

const SKINS = ["#f6d2b6", "#e8b48f", "#c98f66", "#a06a45", "#714a32"];
const HAIRS = ["#2b1d14", "#4a2f1e", "#1c1a2e", "#7a4b2a", "#3b2a20"];
const STYLES = ["short", "long", "bun", "curly", "hijab"];
const TOPS = ["#6a5cf5", "#4739e7", "#f0a500", "#2fa37a", "#e0674f", "#3d8bd9"];
const SCARVES = ["#8c7cf7", "#2fa37a", "#c45a7a", "#3d8bd9", "#d08a2c", "#6b5b95"];
const POSES = 6;

const hash = (s) => [...String(s ?? "")].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 2166136261);

function personaOf(seed) {
  const h = hash(seed);
  const pick = (list, shift) => list[(h >>> shift) % list.length];
  return {
    pose: h % POSES,
    skin: pick(SKINS, 3),
    hair: pick(HAIRS, 6),
    style: pick(STYLES, 9),
    top: pick(TOPS, 12),
    scarf: pick(SCARVES, 15),
    glasses: (h >>> 18) % 3 === 0,
  };
}

/* ───────────── pieces ───────────── */

const Lamp = () => (
  <g>
    <path className="lamp-light" d="M37 75 L43 72 L74 104 L44 104 Z" fill="var(--glow)" />
    <ellipse cx="27" cy="103" rx="9" ry="2.5" fill="var(--ink-line)" />
    <path d="M27 102 L22 84 L33 71" stroke="var(--ink-line)" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M29 67 L43 70 L38 80 Z" fill="#ffb800" />
    <circle cx="33" cy="71" r="2" fill="var(--ink-line)" />
  </g>
);

const Plant = ({ x = 0 }) => (
  <g transform={`translate(${x} 0)`}>
    <ellipse cx="25" cy="86" rx="4" ry="9" transform="rotate(-25 25 86)" fill="var(--plant)" />
    <ellipse cx="33" cy="85" rx="4" ry="10" transform="rotate(20 33 85)" fill="var(--plant)" />
    <ellipse cx="29" cy="82" rx="3.5" ry="10" fill="var(--plant)" opacity="0.85" />
    <path d="M21 104 L37 104 L35 93 L23 93 Z" fill="#c96f4a" />
  </g>
);

const BookStack = ({ x = 0 }) => (
  <g transform={`translate(${x} 0)`}>
    <rect x="15" y="96" width="28" height="8" rx="1.5" fill="#4739e7" />
    <rect x="18" y="89" width="23" height="7" rx="1.5" fill="#f0a500" />
    <rect x="16" y="83" width="25" height="6" rx="1.5" fill="#2fa37a" />
  </g>
);

const Mug = () => (
  <g>
    <path className="steam" d="M122 86 q-3 -4 0 -8 q3 -4 0 -8" stroke="var(--device-2)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    <path className="steam steam-2" d="M128 86 q-3 -4 0 -8 q3 -4 0 -8" stroke="var(--device-2)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    <path d="M132 94 q6 0 6 4.5 q0 4.5 -6 4.5" stroke="#e0674f" strokeWidth="2.4" fill="none" />
    <rect x="117" y="89" width="16" height="15" rx="3.5" fill="#e0674f" />
  </g>
);

const Laptop = () => (
  <g>
    <rect x="55" y="75" width="50" height="29" rx="3" fill="var(--device)" />
    <circle cx="80" cy="89" r="3.2" fill="var(--device-2)" />
    <path d="M48 104.5 L112 104.5 L108 101 L52 101 Z" fill="var(--device-2)" />
  </g>
);

function OpenBook({ flip = true }) {
  return (
    <g>
      <path d="M56 105 L80 101.5 L104 105 L102 92 L80 89 L58 92 Z" fill="var(--ink-line)" opacity="0.85" />
      <path d="M60 103 L80 100 L80 90 L62 92.5 Z" fill="var(--paper)" />
      <path d="M80 100 L100 103 L98 92.5 L80 90 Z" fill="var(--paper)" />
      <path d="M65 95 L77 93.5 M65 98 L77 96.5 M83 93.5 L95 95 M83 96.5 L95 98" stroke="var(--paper-2)" strokeWidth="1.1" strokeLinecap="round" />
      {flip && <path className="page" d="M80 100 L99 102.6 L97.2 92.8 L80 90 Z" fill="var(--paper-2)" />}
    </g>
  );
}

function Hair({ style, color, scarf, layer }) {
  if (style === "hijab") {
    return layer === "back" ? (
      <path d="M60 50 C58 29 69 23 80 23 C91 23 102 29 100 50 C100 64 93 76 80 78 C67 76 60 64 60 50 Z" fill={scarf} />
    ) : (
      <path d="M64.5 47 C64.5 33.5 72 29.5 80 29.5 C88 29.5 95.5 33.5 95.5 47 C92.5 39 87 35 80 35 C73 35 67.5 39 64.5 47 Z" fill={scarf} />
    );
  }
  if (layer === "back") {
    return style === "long" ? (
      <path d="M63.5 44 C62 29 71 25.5 80 25.5 C90 25.5 98.5 30 96.5 44 L98.5 73 C92 75 87.5 73 86 69 L74 69 C72.5 73 68 75 61.5 73 Z" fill={color} />
    ) : null;
  }
  if (style === "curly") {
    return (
      <g fill={color}>
        {[[66.5, 41, 6], [70.5, 33, 6.5], [79, 28.5, 7], [88, 30.5, 6.5], [93.5, 39, 6]].map(([cx, cy, r]) => (
          <circle key={cx} cx={cx} cy={cy} r={r} />
        ))}
      </g>
    );
  }
  return (
    <g fill={color}>
      <path d="M64.5 46 C63 31 72 26.5 81 26.5 C90 26.5 97.5 32.5 95.5 46 C93 38.5 88 35 81 35.5 C74 35.5 68 39 64.5 46 Z" />
      {style === "bun" && <circle cx="80" cy="25" r="6.5" />}
    </g>
  );
}

function Face({ eyes, glasses }) {
  const line = { stroke: "var(--ink-line)", strokeWidth: 1.5, fill: "none", strokeLinecap: "round" };
  return (
    <g>
      {eyes === "open" ? (
        <g fill="var(--ink-line)">
          <circle cx="74.5" cy="47.5" r="1.7" />
          <circle cx="85.5" cy="47.5" r="1.7" />
        </g>
      ) : (
        <g {...line}>
          <path d="M72 48 q2.5 2.3 5 0" />
          <path d="M83 48 q2.5 2.3 5 0" />
        </g>
      )}
      <circle cx="70.5" cy="53" r="2.3" fill="#ff8a8a" opacity="0.3" />
      <circle cx="89.5" cy="53" r="2.3" fill="#ff8a8a" opacity="0.3" />
      <path d="M77.5 55 q2.5 1.4 5 0" {...line} strokeWidth="1.3" />
      {glasses && (
        <g {...line} strokeWidth="1.2">
          <circle cx="74.5" cy="48" r="4.6" />
          <circle cx="85.5" cy="48" r="4.6" />
          <path d="M79.1 47.6 L80.9 47.6" />
        </g>
      )}
    </g>
  );
}

const Arm = ({ d, color }) => <path d={d} stroke={color} strokeWidth="8" fill="none" strokeLinecap="round" />;
const Hand = ({ x, y, skin }) => <circle cx={x} cy={y} r="4.6" fill={skin} />;

/* ───────────── poses ───────────── */
// Each pose: what's left on the desk, the eyes, and what's in front of the student.
const POSE = [
  { name: "reading", decor: "lamp", eyes: "down" },
  { name: "laptop", decor: "plant-right", eyes: "open" },
  { name: "writing", decor: "lamp", eyes: "down" },
  { name: "headphones", decor: "books", eyes: "down" },
  { name: "thinking", decor: "books", eyes: "open" },
  { name: "tea", decor: "plant", eyes: "down" },
];

function Front({ pose, p }) {
  switch (pose) {
    case 0:
    case 5:
      return (
        <g>
          <Arm d="M58 88 Q53 99 63 101.5" color={p.top} />
          <Arm d="M102 88 Q107 99 97 101.5" color={p.top} />
          <OpenBook flip={pose === 0} />
          <Hand x={62} y={101.5} skin={p.skin} />
          <Hand x={98} y={101.5} skin={p.skin} />
          {pose === 5 && <Mug />}
        </g>
      );
    case 1:
    case 3:
      return (
        <g>
          <Laptop />
          {pose === 3 && (
            <g fill="var(--device-2)">
              <g className="note">
                <circle cx="112" cy="44" r="2.4" />
                <path d="M114 44 L114 34 L118 33" stroke="var(--device-2)" strokeWidth="1.4" fill="none" />
              </g>
              <g className="note note-2">
                <circle cx="46" cy="40" r="2.2" />
                <path d="M48 40 L48 31" stroke="var(--device-2)" strokeWidth="1.4" fill="none" />
              </g>
            </g>
          )}
        </g>
      );
    case 2:
      return (
        <g>
          <path d="M76 104 L108 104 L103.5 93.5 L79 93.5 Z" fill="var(--paper)" />
          <path d="M82 97 L101 97 M81 100 L104 100" stroke="var(--paper-2)" strokeWidth="1.1" strokeLinecap="round" />
          <Arm d="M58 88 Q55 100 69 101.5" color={p.top} />
          <Hand x={70} y={101.5} skin={p.skin} />
          <Arm d="M102 86 Q111 95 95 99" color={p.top} />
          <g className="scribble">
            <path d="M93 100 L99 89" stroke="#f0a500" strokeWidth="2.4" strokeLinecap="round" />
            <Hand x={94} y={99} skin={p.skin} />
          </g>
        </g>
      );
    case 4:
      return (
        <g>
          <rect x="88" y="97" width="26" height="7" rx="1.5" fill="#3d8bd9" />
          <path d="M60 103 L76 103" stroke="#f0a500" strokeWidth="2.2" strokeLinecap="round" />
          <Arm d="M58 88 Q55 100 67 101.5" color={p.top} />
          <Hand x={68} y={101.5} skin={p.skin} />
          <g fill="var(--device-2)">
            <circle className="dot" cx="104" cy="31" r="1.8" />
            <circle className="dot dot-2" cx="110" cy="25" r="2.3" />
            <circle className="dot dot-3" cx="117.5" cy="18" r="2.8" />
          </g>
        </g>
      );
    default:
      return null;
  }
}

function Decor({ kind }) {
  if (kind === "lamp") return <Lamp />;
  if (kind === "books") return <BookStack />;
  if (kind === "plant") return <Plant />;
  if (kind === "plant-right") return <Plant x={100} />;
  return null;
}

function EmptyDesk() {
  return (
    <g>
      <rect x="58" y="66" width="44" height="44" rx="10" fill="var(--desk-2)" opacity="0.75" />
      <rect x="64" y="72" width="32" height="6" rx="3" fill="var(--desk)" opacity="0.8" />
      <Lamp />
      <rect x="84" y="97" width="28" height="7" rx="1.5" fill="var(--device-2)" />
      <rect x="87" y="91" width="22" height="6" rx="1.5" fill="var(--device)" />
    </g>
  );
}

export default function StudyIllustration({ seed, pose: poseProp, away = false, label, className = "" }) {
  const p = personaOf(seed);
  const empty = poseProp === "empty";
  const pose = empty ? null : Number.isInteger(poseProp) ? poseProp % POSES : p.pose;
  const look = pose === null ? null : POSE[pose];

  return (
    <svg
      viewBox="0 0 160 130"
      className={`study-art ${className}`}
      data-away={away || undefined}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {empty ? (
        <EmptyDesk />
      ) : (
        <>
          <Decor kind={look.decor} />
          <g className="breathe">
            <Hair style={p.style} color={p.hair} scarf={p.scarf} layer="back" />
            {p.style !== "hijab" && (
              <>
                <rect x="75" y="57" width="10" height="17" rx="3" fill={p.skin} />
                <circle cx="65" cy="48.5" r="3.2" fill={p.skin} />
                <circle cx="95" cy="48.5" r="3.2" fill={p.skin} />
              </>
            )}
            <path d="M50 112 C50 86 61 72 80 72 C99 72 110 86 110 112 Z" fill={p.top} />
            {p.style === "hijab" ? (
              <path d="M62 56 C64 70 70 78 80 80 C90 78 96 70 98 56 L104 84 C96 90 64 90 56 84 Z" fill={p.scarf} />
            ) : (
              <path d="M72.5 73.5 L80 81 L87.5 73.5" stroke="#fff" strokeOpacity="0.45" strokeWidth="1.6" fill="none" strokeLinejoin="round" />
            )}
            <circle cx="80" cy="46" r={p.style === "hijab" ? 14.5 : 15} fill={p.skin} />
            {pose === 1 && <ellipse className="screen-glow" cx="80" cy="52" rx="13" ry="9" fill="#cfe9ff" opacity="0.35" />}
            <Face eyes={look.eyes} glasses={p.glasses} />
            <Hair style={p.style} color={p.hair} scarf={p.scarf} layer="front" />
            {pose === 3 && (
              <g>
                <path d="M63 46 C62 23 98 23 97 46" stroke="var(--ink-line)" strokeWidth="3.4" fill="none" strokeLinecap="round" />
                <rect x="59" y="40" width="7.5" height="13" rx="3.5" fill="#6a5cf5" />
                <rect x="93.5" y="40" width="7.5" height="13" rx="3.5" fill="#6a5cf5" />
              </g>
            )}
            {pose === 4 && (
              <g>
                <Arm d="M103 92 Q110 74 91 63" color={p.top} />
                <Hand x={89} y={61} skin={p.skin} />
              </g>
            )}
          </g>
        </>
      )}

      {/* Desk */}
      <rect x="6" y="104" width="148" height="8" rx="4" fill="var(--desk)" />
      <rect x="13" y="112" width="134" height="18" fill="var(--desk-2)" />

      {!empty && <Front pose={pose} p={p} />}
    </svg>
  );
}
