// Small display helpers shared by the Study With Me components.

const AVATAR_FILLS = ["bg-primary", "bg-accent", "bg-ink-2", "bg-accent-ink", "bg-fg-2"];

export const initialsOf = (name = "") =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

/** Same student → same avatar colour everywhere. */
export const avatarFill = (id = "") => AVATAR_FILLS[[...String(id)].reduce((n, c) => n + c.charCodeAt(0), 0) % AVATAR_FILLS.length];

export const firstName = (name = "") => name.split(" ")[0] || name;
